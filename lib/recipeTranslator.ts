/**
 * @file recipeTranslator.ts
 * @description Motor de detección lingüística y traducción culinaria heurística offline.
 *
 * Propósitos principales:
 * 1. Detección genuina de idioma: Verifica si un campo de texto realmente corresponde
 *    al idioma esperado (ej. detectando conjugaciones, caracteres especiales y léxico gastronómico)
 *    o si contiene una copia idéntica del idioma original.
 * 2. Fallback offline de alta fidelidad: Traduce instrucciones y términos culinarios
 *    cuando la API de Gemini no está disponible o se agota la cuota temporal.
 */

// Diccionario de frases y pasos culinarios frecuentes
const PHRASE_DICTIONARY_ES_TO_EN: [RegExp, string][] = [
  // Verbos y conjugaciones culinarias comunes (incluyendo imperativo argentino/latino y estándar)
  [/cort[aá]\s+los\s+pimientos/gi, 'Dice the bell peppers'],
  [/cort[aá]\s+la\s+cebolla/gi, 'Chop the onion'],
  [/cort[aá]|cortar/gi, 'Chop'],
  [/pic[aá]|picar/gi, 'Mince'],
  [/cocin[aá]\s+el\s+tomate/gi, 'Cook the tomato'],
  [/cocin[aá]|cocinar/gi, 'Cook'],
  [/agreg[aá]\s+los\s+demás\s+vegetales/gi, 'Add the remaining vegetables'],
  [/agreg[aá]|agregar|añad[eé]|añadir/gi, 'Add'],
  [/incorpor[aá]|incorporar/gi, 'Incorporate'],
  [/mezcl[aá]\s+bien/gi, 'Mix well'],
  [/mezcl[aá]|mezclar/gi, 'Mix'],
  [/serv[íi]\s+los\s+fideos/gi, 'Serve the noodles'],
  [/serv[íi]\s+caliente/gi, 'Serve hot'],
  [/serv[íi]|servir/gi, 'Serve'],
  [/acompañ[aá]|acompañar/gi, 'Accompany with'],
  [/calent[aá]|calentar/gi, 'Heat'],
  [/dor[aá]|dorar/gi, 'Brown'],
  [/horne[aá]|hornear/gi, 'Bake'],
  [/salte[aá]|saltear/gi, 'Sauté'],
  [/revolv[eé]|revolver/gi, 'Stir'],

  // Términos y conectores culinarios
  [/en cubitos|en cubos/gi, 'into cubes'],
  [/en una sartén/gi, 'in a skillet'],
  [/a fuego medio/gi, 'over medium heat'],
  [/a fuego lento/gi, 'over low heat'],
  [/con un chorrito de agua/gi, 'with a splash of water'],
  [/hasta que estén tiernos/gi, 'until tender'],
  [/hasta que esté tierno/gi, 'until tender'],
  [/hasta formar una salsa cremosa/gi, 'until a creamy sauce forms'],
  [/como base/gi, 'as a base'],
  [/pollo desmenuzado/gi, 'shredded chicken'],
  [/cubr[íi]\s+con\s+la\s+salsa/gi, 'cover with the sauce'],
  [/con ensalada verde/gi, 'with a green salad'],
  [/con semillas/gi, 'with seeds'],
  [/o verduras cocidas/gi, 'or cooked vegetables'],
  [/al gusto/gi, 'to taste'],
  [/hierbas finas/gi, 'fine herbs'],
  [/colocamos en un procesador/gi, 'Place in a food processor'],
  [/procesar hasta/gi, 'process until'],
  [/triturar hasta|trituramos hasta/gi, 'blend until'],
  [/mezclar en un bol|mezclamos en un bol/gi, 'Mix in a bowl'],
  [/conseguir una masa homogénea|obtener una masa homogénea/gi, 'achieving a smooth dough'],
  [/fuente apta para horno/gi, 'baking dish'],
  [/hasta que estén doradas|hasta que esté dorado/gi, 'until golden brown'],
  [/sazonar con sal y pimienta/gi, 'season with salt and pepper'],
  [/dejar enfriar/gi, 'let cool'],
  [/precalentar el horno a/gi, 'preheat the oven to'],
  [/hervir durante/gi, 'boil for'],
];

const PHRASE_DICTIONARY_EN_TO_ES: [RegExp, string][] = [
  [/place in a food processor/gi, 'Colocar en un procesador de alimentos'],
  [/mix in a bowl/gi, 'Mezclar en un tazón'],
  [/blend until/gi, 'triturar hasta'],
  [/bake for/gi, 'hornear durante'],
  [/preheat oven to/gi, 'precalentar el horno a'],
  [/season with salt and pepper/gi, 'sazonar con sal y pimienta'],
  [/until golden brown/gi, 'hasta que esté dorado'],
  [/serve warm/gi, 'servir caliente'],
  [/serve hot/gi, 'servir caliente'],
  [/to taste/gi, 'al gusto'],
  [/finely chop/gi, 'picar finamente'],
  [/dice into cubes/gi, 'cortar en cubos'],
  [/chop the/gi, 'cortar el/la'],
  [/cook until tender/gi, 'cocinar hasta que esté tierno'],
  [/mix well/gi, 'mezclar bien'],
];

/**
 * Detecta si un texto culinario está en español
 */
export function isSpanishCulinaryText(text?: string | null): boolean {
  if (!text || !text.trim()) return false;
  const lower = text.toLowerCase();
  if (/[áéíóúñ¿¡]/.test(lower)) return true;

  const spanishMarkers = [
    /\b(cortar|cort[aá]|picar|pic[aá]|cocinar|cocin[aá]|agregar|agreg[aá]|añadir|añad[eé]|mezclar|mezcl[aá]|incorporar|incorpor[aá]|revolver|revolv[eé]|servir|serv[íi]|acompañar|acompañ[aá]|calentar|calient[aá]|hornear|horne[aá]|freír|saltear|salte[aá]|batir|bat[eé]|dejar|esperar|dorar|dor[aá])\b/,
    /\b(pimientos?|cebollas?|tomates?|fideos|pollo|queso|sart[eé]n|cacerola|fuego|minutos|hasta que|al gusto|trozos|cubitos|hervir|aceite|agua)\b/,
    /\b(los|las|una|unos|unas|con|del|para|por)\b/
  ];

  let matches = 0;
  for (const re of spanishMarkers) {
    if (re.test(lower)) matches++;
  }
  return matches >= 1;
}

/**
 * Detecta si un texto culinario está en inglés
 */
export function isEnglishCulinaryText(text?: string | null): boolean {
  if (!text || !text.trim()) return false;
  const lower = text.toLowerCase();
  
  if (/[áéíóúñ¿¡]/.test(lower)) return false;

  const englishMarkers = [
    /\b(chop|dice|cut|cook|heat|add|mix|combine|stir|serve|bake|sauté|boil|simmer|whisk|blend|garnish)\b/,
    /\b(skillet|pan|pot|oven|minutes|seconds|until|tender|to taste|medium heat|low heat|high heat)\b/,
    /\b(the|and|with|for|into|from|about)\b/
  ];

  let matches = 0;
  for (const re of englishMarkers) {
    if (re.test(lower)) matches++;
  }
  return matches >= 2;
}

/**
 * Determina si las instrucciones en inglés son genuinas o si son copia del español
 */
export function hasGenuineEnglishInstructions(instructionsEn?: string | null, instructionsEs?: string | null): boolean {
  if (!instructionsEn || !instructionsEn.trim()) return false;
  if (instructionsEs && instructionsEn.trim().toLowerCase() === instructionsEs.trim().toLowerCase()) {
    return false;
  }
  if (isSpanishCulinaryText(instructionsEn)) {
    return false;
  }
  return true;
}

/**
 * Determina si las instrucciones en español son genuinas o copia del inglés
 */
export function hasGenuineSpanishInstructions(instructionsEs?: string | null, instructionsEn?: string | null): boolean {
  if (!instructionsEs || !instructionsEs.trim()) return false;
  if (instructionsEn && instructionsEs.trim().toLowerCase() === instructionsEn.trim().toLowerCase()) {
    return false;
  }
  if (isEnglishCulinaryText(instructionsEs)) {
    return false;
  }
  return true;
}

/**
 * Traduce un texto entre español e inglés utilizando el diccionario culinario de expresiones regulares.
 *
 * @param {string | null | undefined} text - Texto fuente a traducir.
 * @param {'ES' | 'EN'} fromLang - Idioma origen.
 * @param {'ES' | 'EN'} toLang - Idioma destino.
 * @returns {string} Texto traducido o el original si los idiomas coinciden.
 */
export function translateTextSmart(
  text: string | null | undefined,
  fromLang: 'ES' | 'EN',
  toLang: 'ES' | 'EN'
): string {
  if (!text || !text.trim()) return '';
  if (fromLang === toLang) return text;

  let translated = text;
  const dictionary = toLang === 'EN' ? PHRASE_DICTIONARY_ES_TO_EN : PHRASE_DICTIONARY_EN_TO_ES;

  for (const [regex, replacement] of dictionary) {
    translated = translated.replace(regex, replacement);
  }

  return translated;
}

/**
 * Resuelve el texto correspondiente para un campo bilingüe según el idioma de visualización objetivo.
 * Si no existe una versión genuina en el idioma solicitado, aplica la traducción inteligente.
 *
 * @param {string | null | undefined} fieldEs - Versión en español del campo.
 * @param {string | null | undefined} fieldEn - Versión en inglés del campo.
 * @param {'ES' | 'EN'} targetLang - Idioma en el que se desea renderizar.
 * @returns {string} Texto final listo para mostrar en la interfaz.
 */
export function translateRecipeField(
  fieldEs: string | null | undefined,
  fieldEn: string | null | undefined,
  targetLang: 'ES' | 'EN'
): string {
  if (targetLang === 'ES') {
    return fieldEs || fieldEn || '';
  }

  if (fieldEn && fieldEn.trim().length > 0 && fieldEn !== fieldEs) {
    return fieldEn;
  }

  return translateTextSmart(fieldEs, 'ES', 'EN');
}

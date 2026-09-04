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
// Diccionario de frases y pasos culinarios frecuentes con límites de palabra (\b)
const PHRASE_DICTIONARY_ES_TO_EN: [RegExp, string][] = [
  // Pasos e imperativos completos
  [/\b(cort[aá]|cortar)\s+los\s+pimientos\b/gi, 'dice the bell peppers'],
  [/\b(cort[aá]|cortar)\s+la\s+cebolla\b/gi, 'chop the onion'],
  [/\b(cocin[aá]|cocinar)\s+el\s+tomate\b/gi, 'cook the tomato'],
  [/\b(agreg[aá]|agregar|añad[eé]|añadir)\s+los\s+demás\s+vegetales\b/gi, 'add the remaining vegetables'],
  [/\b(mezcl[aá]|mezclar)\s+bien\b/gi, 'mix well'],
  [/\b(serv[íi]|servir)\s+caliente\b/gi, 'serve hot'],
  [/\b(serv[íi]|servir)\s+tibio\b/gi, 'serve warm'],
  [/\b(serv[íi]|servir)\s+los\s+fideos\b/gi, 'serve the noodles'],
  [/\b(dejar|dejá)\s+enfriar\b/gi, 'let cool'],
  [/\b(dejar|dejá)\s+reposar\b/gi, 'let rest'],
  [/\b(sazonar|sazoná)\s+con\s+sal\s+y\s+pimienta\b/gi, 'season with salt and pepper'],
  [/\b(precalentar|precalentá)\s+el\s+horno\s+a\b/gi, 'preheat the oven to'],
  [/\bhervir\s+durante\b/gi, 'boil for'],
  [/\bherv[íi]\b/gi, 'boil'],
  [/\bhasta\s+que\s+est[eé]\s+(dorada|dorado|doradas|dorados)\b/gi, 'until golden brown'],
  [/\bhasta\s+que\s+est[eé]n?\s+tiernos?\b/gi, 'until tender'],
  [/\bhasta\s+formar\s+una\s+salsa\s+cremosa\b/gi, 'until a creamy sauce forms'],
  [/\bcolocamos\s+en\s+un\s+procesador\b/gi, 'place in a food processor'],
  [/\bprocesar\s+hasta\b/gi, 'process until'],
  [/\btriturar\s+hasta\b/gi, 'blend until'],
  [/\bmezclar\s+en\s+un\s+bol\b/gi, 'mix in a bowl'],
  [/\bfuente\s+apta\s+para\s+horno\b/gi, 'baking dish'],
  [/\ben\s+cubitos|\ben\s+cubos\b/gi, 'into cubes'],
  [/\ben\s+una\s+sartén\b/gi, 'in a skillet'],
  [/\ba\s+fuego\s+medio\b/gi, 'over medium heat'],
  [/\ba\s+fuego\s+lento\b/gi, 'over low heat'],
  [/\bcon\s+un\s+chorrito\s+de\s+agua\b/gi, 'with a splash of water'],
  [/\bal\s+gusto\b/gi, 'to taste'],
  [/\bhierbas\s+finas\b/gi, 'fine herbs'],

  // Verbos y adjetivos culinarios individuales con límites de palabra estrictos (\b)
  [/\b(dorada|dorado|doradas|dorados)\b/gi, 'golden brown'],
  [/\b(cortar|cortá|corta)\b/gi, 'chop'],
  [/\b(picar|picá|pica)\b/gi, 'mince'],
  [/\b(cocinar|cociná|cocina)\b/gi, 'cook'],
  [/\b(agregar|agregá|agrega|añadir|añadí|añade)\b/gi, 'add'],
  [/\b(incorporar|incorporá|incorpora)\b/gi, 'incorporate'],
  [/\b(mezclar|mezclá|mezcla)\b/gi, 'mix'],
  [/\b(servir|serví|sirve)\b/gi, 'serve'],
  [/\b(calentar|calentá|calienta)\b/gi, 'heat'],
  [/\b(hornear|horneá|hornea)\b/gi, 'bake'],
  [/\b(saltear|salteá|saltea)\b/gi, 'sauté'],
  [/\b(revolver|revolvé|revuelve)\b/gi, 'stir'],
  [/\b(batir|batí|bate)\b/gi, 'whisk'],
  [/\b(verter|verté|vierte)\b/gi, 'pour'],
  [/\b(espolvorear|espolvoreá|espolvorea)\b/gi, 'sprinkle'],
  [/\b(derretir|derretí|derrite)\b/gi, 'melt'],
];

const PHRASE_DICTIONARY_EN_TO_ES: [RegExp, string][] = [
  [/\bplace in a food processor\b/gi, 'colocar en un procesador de alimentos'],
  [/\bmix in a bowl\b/gi, 'mezclar en un tazón'],
  [/\bblend until\b/gi, 'triturar hasta'],
  [/\bbake for\b/gi, 'hornear durante'],
  [/\bpreheat (the )?oven to\b/gi, 'precalentar el horno a'],
  [/\bseason with salt and pepper\b/gi, 'sazonar con sal y pimienta'],
  [/\buntil golden brown\b/gi, 'hasta que esté dorado'],
  [/\bserve warm\b/gi, 'servir tibio'],
  [/\bserve hot\b/gi, 'servir caliente'],
  [/\bto taste\b/gi, 'al gusto'],
  [/\bfinely chop\b/gi, 'picar finamente'],
  [/\bdice into cubes\b/gi, 'cortar en cubos'],
  [/\bcook until tender\b/gi, 'cocinar hasta que esté tierno'],
  [/\bmix well\b/gi, 'mezclar bien'],
  [/\bover medium heat\b/gi, 'a fuego medio'],
  [/\bover low heat\b/gi, 'a fuego lento'],
  [/\bin a skillet\b/gi, 'en una sartén'],
  [/\bpreheat a pan\b/gi, 'precalentar una sartén'],

  // Verbos individuales
  [/\bchop\b/gi, 'picar'],
  [/\bdice\b/gi, 'cortar en cubos'],
  [/\bmince\b/gi, 'picar fino'],
  [/\bcook\b/gi, 'cocinar'],
  [/\badd\b/gi, 'agregar'],
  [/\bmix\b/gi, 'mezclar'],
  [/\bserve\b/gi, 'servir'],
  [/\bheat\b/gi, 'calentar'],
  [/\bbake\b/gi, 'hornear'],
  [/\bsauté\b/gi, 'saltear'],
  [/\bstir\b/gi, 'revolver'],
  [/\bwhisk\b/gi, 'batir'],
  [/\bpour\b/gi, 'verter'],
  [/\bsprinkle\b/gi, 'espolvorear'],
  [/\bboil\b/gi, 'hervir'],
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
 * Determina si las instrucciones en inglés son genuinas o si son copia o mezcla del español
 */
export function hasGenuineEnglishInstructions(instructionsEn?: string | null, instructionsEs?: string | null): boolean {
  if (!instructionsEn || !instructionsEn.trim()) return false;
  const trimmed = instructionsEn.trim();
  if (instructionsEs && trimmed.toLowerCase() === instructionsEs.trim().toLowerCase()) {
    return false;
  }
  // Si contiene acentos o signos españoles, no es inglés genuino
  if (/[áéíóúñ¿¡]/.test(trimmed)) {
    return false;
  }
  // Detecta palabras o construcciones corruptas de spanglish o fragmentos en español no traducidos
  if (/brownda|mix sobre|add los|chop en|chop la|chop los|bake a \d+/i.test(trimmed)) {
    return false;
  }
  const spanishMarkers = /\b(la|el|los|las|una|uno|unos|unas|con|del|y|en|por|para|cocin[aá]|mezcl[aá]|incorpor[aá]|serv[íi]|agreg[aá]|cubr[íi]|acompañ[aá]|cebolla|tomate|pimientos?|fideos|pollo|queso|sal|harina|huevo|yema|clara|avena|rebozador|formitas|demás|sartén)\b/i;
  if (spanishMarkers.test(trimmed)) {
    return false;
  }
  if (isSpanishCulinaryText(trimmed)) {
    return false;
  }
  return isEnglishCulinaryText(trimmed);
}

/**
 * Determina si las instrucciones en español son genuinas o copia del inglés
 */
export function hasGenuineSpanishInstructions(instructionsEs?: string | null, instructionsEn?: string | null): boolean {
  if (!instructionsEs || !instructionsEs.trim()) return false;
  const trimmed = instructionsEs.trim();
  if (instructionsEn && trimmed.toLowerCase() === instructionsEn.trim().toLowerCase()) {
    return false;
  }
  if (isEnglishCulinaryText(trimmed)) {
    return false;
  }
  return isSpanishCulinaryText(trimmed);
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

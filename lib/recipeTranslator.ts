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
  // Reparaciones de Spanglish frecuente y frases compuestas
  [/\ben\s+una\s+baking\s+dish\b/gi, 'in a baking dish'],
  [/\b(lo\s+)?llevamos\s+a\s+cook\s+por\s+unos\s+minutos\b/gi, 'bake for a few minutes'],
  [/\b(lo\s+)?llevamos\s+a\s+cocinar\s+por\s+unos\s+minutos\b/gi, 'bake for a few minutes'],
  [/\b(lo\s+)?llevamos\s+a\s+cook\b/gi, 'bake it'],
  [/\b(lo\s+)?llevamos\s+a\s+cocinar\b/gi, 'bake it'],
  [/\bhasta\s+que\s+est[eé]n\s+golden\s+brown\b/gi, 'until golden brown'],
  [/\bhasta\s+que\s+est[eé]n\s+(doradas|dorados)\b/gi, 'until golden brown'],
  [/\bhasta\s+que\s+est[eé]\s+(dorada|dorado)\b/gi, 'until golden brown'],
  [/\bcolocar\s+en\s+un\s+procesador\s+de\s+alimentos\s+(la|el|los|las)?\b/gi, 'place in a food processor the'],
  [/\bcolocar\s+en\s+un\s+procesador\s+de\s+alimentos\b/gi, 'place in a food processor'],
  [/\bcolocamos\s+en\s+un\s+procesador\s+de\s+alimentos\b/gi, 'place in a food processor'],
  [/\b(lo\s+)?trituramos\s+hasta\s+conseguir\s+una\s+masa\s+homog[eé]nea\b/gi, 'blend until a smooth, uniform dough is formed'],
  [/\btriturar\s+hasta\s+conseguir\s+una\s+masa\s+homog[eé]nea\b/gi, 'blend until a smooth, uniform dough is formed'],
  [/\bhasta\s+conseguir\s+una\s+masa\s+homog[eé]nea\b/gi, 'until a smooth dough is formed'],
  [/\b(y\s+)?triturar\s+hasta\b/gi, 'and blend until'],
  [/\btriturar\s+hasta\b/gi, 'blend until'],
  [/\bluego\s+vamos\s+a\s+colocar\b/gi, 'next, apply'],
  [/\bvamos\s+a\s+colocar\b/gi, 'apply'],
  [/\bpor\s+nuestras\s+manos\b/gi, 'to your hands'],
  [/\ben\s+las\s+manos\b/gi, 'on your hands'],
  [/\bpara\s+poder\s+dar\s+forma\s+de\s+nuggets\b/gi, 'to shape the mixture into nuggets'],
  [/\bdar\s+forma\s+de\s+nuggets\b/gi, 'shape into nuggets'],
  [/\bdar\s+forma\s+de\b/gi, 'shape into'],
  [/\bmientras\s+vamos\s+poni[eé]ndolas\s+en\b/gi, 'placing them onto'],
  [/\bpor\s+unos\s+minutos\b/gi, 'for a few minutes'],
  [/\bdurante\s+unos\s+minutos\b/gi, 'for a few minutes'],
  [/\bdurante\s+a\s+few\s+minutes\b/gi, 'for a few minutes'],
  [/\bdurante\b/gi, 'for'],
  [/\bun\s+poco\s+de\b/gi, 'a little'],

  // Ingredientes culinarios específicos (evita Spanglish en pechuga, zapallo, cebolla, etc.)
  [/\bpechuga\s+de\s+pollo\b/gi, 'chicken breast'],
  [/\bpechugas?\b/gi, 'chicken breast'],
  [/\b(zapallo|calabaza)\s+(anam[aá]|anco|butternut)\b/gi, 'butternut squash'],
  [/\b(zapallo|calabaza)\b/gi, 'butternut squash'],
  [/\bharina\s+de\s+avena\b/gi, 'oat flour'],
  [/\baceite\s+de\s+oliva\b/gi, 'olive oil'],
  // Corrección crítica: cebolla con o sin espacio, coma o adjetivo
  [/\bcebollas?\s*(moradas?|blancas?|picadas?)?\b/gi, 'onion'],
  [/\bpimienta\s+negra\b/gi, 'black pepper'],
  [/\bpimienta\b/gi, 'pepper'],
  [/\bor[eé]gano\b/gi, 'oregano'],
  [/\bpaprika\b/gi, 'paprika'],
  [/\bpiment[oó]n\b/gi, 'paprika'],
  [/\bsal\b/gi, 'salt'],
  [/\bfuente\s+(para\s+horno|apta\s+para\s+horno)\b/gi, 'baking dish'],

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
  // Frases compuestas y Spanglish de preparación
  [/\bplace into a food processor the\b/gi, 'colocar en un procesador de alimentos la'],
  [/\bplace in a food processor the\b/gi, 'colocar en un procesador de alimentos la'],
  [/\bplace (into|in) a food processor\b/gi, 'colocar en un procesador de alimentos'],
  [/\binto a food processor\b/gi, 'en un procesador de alimentos'],
  [/\bfood processor\b/gi, 'procesador de alimentos'],
  [/\ba smooth,?\s+uniform\s+dough\s+is\s+formed\b/gi, 'conseguir una masa homogénea'],
  [/\ba smooth dough is formed\b/gi, 'conseguir una masa homogénea'],
  [/\bnext,\s*apply\s+a\s+little\s+olive\s+oil\s+to\s+your\s+hands\s+to\s+shape\s+the\s+mixture\s+into\s+nuggets,\s*placing\s+them\s+onto\b/gi, 'luego colocar un poco de aceite de oliva en las manos para dar forma de nuggets, colocándolos en'],
  [/\bnext,\s*apply\s+a\s+little\s+olive\s+oil\s+to\s+your\s+hands\b/gi, 'luego colocar un poco de aceite de oliva en las manos'],
  [/\bshape the mixture into nuggets\b/gi, 'dar forma de nuggets a la masa'],
  [/\bshape into nuggets\b/gi, 'dar forma de nuggets'],
  [/\bto shape the mixture\b/gi, 'para dar forma a la mezcla'],
  [/\bplacing them onto\b/gi, 'colocándolos en'],
  [/\bonto a baking dish\b/gi, 'en una fuente para horno'],
  [/\bin a baking dish\b/gi, 'en una fuente para horno'],
  [/\buna baking dish\b/gi, 'una fuente para horno'],
  [/\bbaking dish\b/gi, 'fuente para horno'],
  [/\ba few minutes\b/gi, 'unos minutos'],
  [/\buntil golden brown\b/gi, 'hasta que esté dorado'],
  [/\bgolden brown\b/gi, 'dorado'],
  [/\bfor a few minutes\b/gi, 'durante unos minutos'],
  [/\bbake for a few minutes\b/gi, 'hornear durante unos minutos'],
  [/\bbake for\b/gi, 'hornear durante'],
  [/\bbake it\b/gi, 'hornearlo'],

  // Ingredientes culinarios en inglés traducidos al español
  [/\bchicken\s+breast\b/gi, 'pechuga de pollo'],
  [/\bbutternut\s+squash\b/gi, 'zapallo'],
  [/\bsquash\b/gi, 'zapallo'],
  [/\boat\s+flour\b/gi, 'harina de avena'],
  [/\bolive\s+oil\b/gi, 'aceite de oliva'],
  [/\bblack\s+pepper\b/gi, 'pimienta negra'],
  [/\bpepper\b/gi, 'pimienta'],
  [/\boregano\b/gi, 'orégano'],
  [/\bpaprika\b/gi, 'paprika'],
  [/\bonion\b/gi, 'cebolla'],
  [/\bsalt\b/gi, 'sal'],
  [/\bchicken\b/gi, 'pollo'],

  // Pasos y verbos
  [/\bmix in a bowl\b/gi, 'mezclar en un tazón'],
  [/\bblend until\b/gi, 'triturar hasta'],
  [/\bpreheat (the )?oven to\b/gi, 'precalentar el horno a'],
  [/\bseason with salt and pepper\b/gi, 'sazonar con sal y pimienta'],
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
 * Convierte cualquier texto culinario mezclado o en Spanglish en español 100% puro.
 */
export function cleanToPureSpanish(text: string | null | undefined): string {
  if (!text || !text.trim()) return '';
  let cleaned = text;
  for (const [regex, replacement] of PHRASE_DICTIONARY_EN_TO_ES) {
    cleaned = cleaned.replace(regex, replacement);
  }
  return cleaned;
}

/**
 * Convierte cualquier texto culinario mezclado o en Spanglish en inglés 100% puro.
 */
export function cleanToPureEnglish(text: string | null | undefined): string {
  if (!text || !text.trim()) return '';
  let cleaned = text;
  for (const [regex, replacement] of PHRASE_DICTIONARY_ES_TO_EN) {
    cleaned = cleaned.replace(regex, replacement);
  }
  // Limpieza final de conectores o artículos españoles residuales
  cleaned = cleaned
    .replace(/\b(en\s+un\s+procesador\s+de\s+alimentos)\b/gi, 'in a food processor')
    .replace(/\b(la|el|los|las)\s+(chicken breast|butternut squash|oat flour|onion|olive oil)/gi, 'the $2')
    .replace(/\buna\s+(baking dish)/gi, 'a $1')
    .replace(/\by\s+(blend|mix|bake|stir|add)/gi, 'and $1')
    .replace(/\b(hornear\s+durante)\b/gi, 'bake for')
    .replace(/\b(hasta\s+que\s+est[eé]\s+dorado)\b/gi, 'until golden brown')
    .replace(/\b(cebollas?)\b/gi, 'onion')
    .replace(/\b(sal)\b/gi, 'salt')
    .replace(/\b(pimienta)\b/gi, 'pepper');

  return cleaned;
}

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
  // Si contiene residuos o frases obvias en inglés o Spanglish, NO es español genuino
  const englishResidueMarkers = /\b(chicken breast|butternut squash|oat flour|olive oil|food processor|baking dish|smooth dough|uniform dough|golden brown|few minutes|shape into|to shape|next, apply|apply a little|placing them|black pepper|bell pepper|green onion)\b/i;
  if (englishResidueMarkers.test(trimmed)) {
    return false;
  }
  if (isEnglishCulinaryText(trimmed)) {
    return false;
  }
  return isSpanishCulinaryText(trimmed);
}

/**
 * Detecta si un texto culinario contiene residuos o mezcla de Spanglish
 */
export function hasSpanglishResidue(text?: string | null): boolean {
  if (!text || !text.trim()) return false;
  const t = text.trim();
  const englishInSpanish = /\b(chicken breast|butternut squash|oat flour|olive oil|food processor|baking dish|smooth dough|uniform dough|golden brown|few minutes|shape into|to shape|next, apply|apply a little|placing them)\b/i;
  const spanishInEnglish = /\b(cebolla|pechuga|zapallo|calabaza|colocar|procesador de alimentos|triturar|harina de avena|aceite de oliva|una baking dish|hornear durante|hasta que est[eé]|dorado)\b/i;
  return englishInSpanish.test(t) || spanishInEnglish.test(t);
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
  if (fromLang === toLang) {
    return toLang === 'EN' ? cleanToPureEnglish(text) : cleanToPureSpanish(text);
  }

  let translated = text;
  const dictionary = toLang === 'EN' ? PHRASE_DICTIONARY_ES_TO_EN : PHRASE_DICTIONARY_EN_TO_ES;

  for (const [regex, replacement] of dictionary) {
    translated = translated.replace(regex, replacement);
  }

  return toLang === 'EN' ? cleanToPureEnglish(translated) : cleanToPureSpanish(translated);
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

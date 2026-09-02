// Diccionario de frases y pasos culinarios frecuentes
const PHRASE_DICTIONARY_ES_TO_EN: [RegExp, string][] = [
  [/colocamos en un procesador/gi, 'Place in a food processor'],
  [/procesar hasta/gi, 'process until'],
  [/triturar hasta/gi, 'blend until'],
  [/trituramos hasta/gi, 'blend until'],
  [/mezclar en un bol/gi, 'Mix in a bowl'],
  [/mezclamos en un bol/gi, 'Mix in a bowl'],
  [/conseguir una masa homogénea/gi, 'achieving a smooth mixture'],
  [/obtener una masa homogénea/gi, 'obtaining a smooth dough'],
  [/vamos a colocar un poco de/gi, 'apply a little'],
  [/en nuestras manos para poder dar forma/gi, 'on your hands to shape'],
  [/para poder dar forma de/gi, 'to shape into'],
  [/en una fuente apta para horno/gi, 'on a baking sheet'],
  [/fuente apta para horno/gi, 'baking dish'],
  [/llevamos a cocinar/gi, 'bake/cook'],
  [/por unos minutos hasta que estén doradas/gi, 'for a few minutes until golden brown'],
  [/hasta que estén doradas/gi, 'until golden brown'],
  [/hasta que esté dorado/gi, 'until golden brown'],
  [/calentar a fuego medio/gi, 'heat over medium heat'],
  [/cocinar a fuego lento/gi, 'simmer over low heat'],
  [/sazonar con sal y pimienta/gi, 'season with salt and pepper'],
  [/al gusto/gi, 'to taste'],
  [/servir caliente/gi, 'serve warm'],
  [/dejar enfriar/gi, 'let cool'],
  [/precalentar el horno a/gi, 'preheat the oven to'],
  [/hervir durante/gi, 'boil for'],
  [/cortar en cubos/gi, 'dice into cubes'],
  [/picar finamente/gi, 'finely chop'],
  [/freír en abundante aceite/gi, 'fry in plenty of oil'],
  [/saltear las verduras/gi, 'sauté the vegetables'],
  [/añadir el/gi, 'add the'],
  [/agregar el/gi, 'add the'],
  [/incorporar los ingredientes/gi, 'combine the ingredients'],
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
  [/to taste/gi, 'al gusto'],
  [/finely chop/gi, 'picar finamente'],
  [/dice into cubes/gi, 'cortar en cubos'],
];

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

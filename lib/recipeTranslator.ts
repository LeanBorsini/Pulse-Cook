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

// Diccionario de frases y pasos culinarios frecuentes con límites de palabra (\b)
const PHRASE_DICTIONARY_ES_TO_EN: [RegExp, string][] = [
  // Conversaciones y comentarios de la comunidad
  [/\bya\s+aprend[íi]\s+c[oó]mo\s+hervir\s+agua!?/gi, 'I already learned how to boil water!'],
  [/\bya\s+aprend[íi]\s+a\s+hervir\s+agua!?/gi, 'I already learned how to boil water!'],
  [/\bya\s+aprend[íi]\b/gi, 'I already learned'],
  [/\bc[oó]mo\s+hervir\s+agua\b/gi, 'how to boil water'],
  [/\bhervir\s+agua\b/gi, 'boil water'],
  [/\bdelicioso\s+plato\b/gi, 'delicious dish'],
  [/\b(muy\s+rico|muy\s+rica)\b/gi, 'very tasty'],
  [/\b(delicioso|deliciosa)\b/gi, 'delicious'],
  [/\bme\s+encant[oó]\b/gi, 'I loved it'],
  [/\bme\s+gust[oó]\s+mucho\b/gi, 'I really liked it'],
  [/\bexcelente\s+receta\b/gi, 'great recipe'],
  [/\bf[aá]cil\s+y\s+r[aá]pido\b/gi, 'easy and quick'],
  [/\bqued[oó]\s+genial\b/gi, 'it turned out great'],
  [/\bqued[oó]\s+perfecto\b/gi, 'it turned out perfect'],
  [/\bgracias\s+por\s+compartir\b/gi, 'thanks for sharing'],
  [/\bgracias\s+por\s+la\s+receta\b/gi, 'thanks for the recipe'],
  [/\bmuchas\s+gracias\b/gi, 'thank you very much'],
  [/\blo\s+hice\s+hoy\b/gi, 'I made it today'],
  [/\blo\s+prepar[eé]\s+hoy\b/gi, 'I cooked it today'],
  [/\ba\s+mi\s+familia\s+le\s+encant[oó]\b/gi, 'my family loved it'],

  // Títulos y conexiones
  [/\bcon\s+pistachos?\s+y\s+panceta\b/gi, 'with pistachio and bacon'],
  [/\bcon\s+pistachos?\b/gi, 'with pistachios'],
  [/\bcon\s+panceta\b/gi, 'with bacon'],
  [/\bpistachos?\b/gi, 'pistachios'],
  [/\bpanceta\b/gi, 'bacon'],

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
  // Conversaciones y comentarios de la comunidad
  [/\bi\s+already\s+learned\s+how\s+to\s+boil\s+water!?/gi, '¡Ya aprendí cómo hervir agua!'],
  [/\bi\s+already\s+learned\b/gi, 'ya aprendí'],
  [/\bhow\s+to\s+boil\s+water\b/gi, 'cómo hervir agua'],
  [/\bboil\s+water\b/gi, 'hervir agua'],
  [/\bdelicious\s+dish\b/gi, 'plato delicioso'],
  [/\b(very\s+tasty|so\s+tasty)\b/gi, 'muy rico'],
  [/\bdelicious\b/gi, 'delicioso'],
  [/\bi\s+loved\s+it\b/gi, '¡Me encantó!'],
  [/\bi\s+really\s+liked\s+it\b/gi, 'Me gustó mucho'],
  [/\bgreat\s+recipe\b/gi, 'excelente receta'],
  [/\b(easy\s+and\s+quick|easy\s+and\s+fast)\b/gi, 'fácil y rápido'],
  [/\bit\s+turned\s+out\s+great\b/gi, 'quedó genial'],
  [/\bit\s+turned\s+out\s+perfect\b/gi, 'quedó perfecto'],
  [/\bthanks\s+for\s+sharing\b/gi, 'gracias por compartir'],
  [/\bthanks\s+for\s+the\s+recipe\b/gi, 'gracias por la receta'],
  [/\bthank\s+you\s+very\s+much\b/gi, 'muchas gracias'],
  [/\bi\s+made\s+it\s+today\b/gi, 'lo hice hoy'],
  [/\bmy\s+family\s+loved\s+it\b/gi, 'a mi familia le encantó'],

  // Título e instrucciones completas de Tagliatelle y platos italianos frecuentes
  [/\bboil\s+1\s+lit(?:re|er)\s+of\s+water\s+with\s+10g\s+of\s+salt\s+per\s+100g\s+of\s+tagliatelle\b/gi, 'hervir 1 litro de agua con 10g de sal por cada 100g de tagliatelle'],
  [/\bpreheat\s+a\s+low\s+temperature\s+pan\s+with\s+olive\s+oil\s+and\s+add\s+pistachios\s+until\s+it's\s+toasted\b/gi, 'precalentar una sartén a fuego bajo con aceite de oliva y agregar los pistachos hasta que se doren'],
  [/\b1\s+lit(?:re|er)\s+of\s+water\b/gi, '1 litro de agua'],
  [/\blit(?:re|er)\s+of\s+water\b/gi, 'litro de agua'],
  [/\bwith\s+(\d+)g\s+of\s+salt\b/gi, 'con $1g de sal'],
  [/\bper\s+(\d+)g\s+of\b/gi, 'por cada $1g de'],
  [/\bper\s+100g\s+of\b/gi, 'por cada 100g de'],
  [/\blow\s+temperature\s+pan\b/gi, 'sartén a fuego bajo'],
  [/\blow\s+temperature\b/gi, 'fuego bajo'],
  [/\buntil\s+it's\s+toasted\b/gi, 'hasta que esté tostado'],
  [/\buntil\s+toasted\b/gi, 'hasta que esté tostado'],
  [/\buntil\s+golden\b/gi, 'hasta que esté dorado'],
  [/\btoasted\b/gi, 'tostado'],
  [/\bpistachios\b/gi, 'pistachos'],
  [/\bpistachio\b/gi, 'pistacho'],
  [/\bbacon\b/gi, 'panceta'],
  [/\btagliatelle\b/gi, 'tagliatelle'],
  [/\bdrain\s+the\s+pasta\b/gi, 'escurrir la pasta'],
  [/\bdrain\b/gi, 'escurrir'],
  [/\bal\s+dente\b/gi, 'al dente'],
  [/\bparmesan\s+cheese\b/gi, 'queso parmesano'],
  [/\bparmesan\b/gi, 'parmesano'],
  [/\bheavy\s+cream\b/gi, 'crema de leche'],
  [/\bcream\b/gi, 'crema'],
  [/\bgarlic\s+cloves?\b/gi, 'dientes de ajo'],
  [/\bgarlic\b/gi, 'ajo'],
  [/\bbutter\b/gi, 'manteca'],
  [/\bsauce\b/gi, 'salsa'],
  [/\bpasta\b/gi, 'pasta'],
  [/\bnoodles\b/gi, 'fideos'],
  [/\bwith\b/gi, 'con'],
  [/\band\b/gi, 'y'],
  [/\bper\b/gi, 'por'],
  [/\bwater\b/gi, 'agua'],
  [/\bskillet\b/gi, 'sartén'],
  [/\bpan\b/gi, 'sartén'],
  [/\bpot\b/gi, 'olla'],

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
 * Detecta si cualquier texto genérico (incluyendo comentarios coloquiales) está redactado en español.
 */
export function isSpanishText(text?: string | null): boolean {
  if (!text || !text.trim()) return false;
  const lower = text.toLowerCase().trim();
  // Presencia de tildes o caracteres exclusivos del español
  if (/[áéíóúñ¿¡]/.test(lower)) return true;

  // Marcadores léxicos comunes en español
  const spanishMarkers = /\b(el|la|los|las|un|una|unos|unas|de|del|en|por|para|con|sin|que|cómo|como|ya|aprendí|aprendi|hervir|agua|receta|muy|rico|rica|delicioso|deliciosa|hice|hacer|cocinar|quedó|quedo|gracias|bueno|buena|me|te|se|lo|los|les|plato|familia)\b/;
  return spanishMarkers.test(lower);
}

/**
 * Detecta si cualquier texto genérico está redactado en inglés.
 */
export function isEnglishText(text?: string | null): boolean {
  if (!text || !text.trim()) return false;
  const lower = text.toLowerCase().trim();
  if (/[áéíóúñ¿¡]/.test(lower)) return false;

  const englishMarkers = /\b(the|and|with|without|for|from|about|to|in|on|at|of|learned|learn|how|boil|water|already|recipe|very|tasty|delicious|loved|liked|made|cook|turned|out|great|thanks|good|my|your|it|is|was|dish|family)\b/;
  return englishMarkers.test(lower);
}

/**
 * Resuelve el texto correspondiente para un campo bilingüe (título, descripción o instrucciones)
 * según el idioma seleccionado de forma 100% automática y limpia.
 * Si no existe una versión genuina en el idioma solicitado, aplica la traducción pura sin dejar Spanglish.
 */
export function translateRecipeField(
  fieldEs: string | null | undefined,
  fieldEn: string | null | undefined,
  targetLang: 'ES' | 'EN'
): string {
  const es = (fieldEs || '').trim();
  const en = (fieldEn || '').trim();

  if (targetLang === 'ES') {
    // 1. Si existe versión en español y es español genuino
    if (es && !hasSpanglishResidue(es) && !isEnglishCulinaryText(es)) {
      return cleanToPureSpanish(es);
    }
    // 2. Si solo tenemos inglés o un texto con residuos, traducimos a español puro
    const candidate = en || es;
    if (!candidate) return '';
    return cleanToPureSpanish(translateTextSmart(candidate, 'EN', 'ES'));
  }

  // targetLang === 'EN'
  // 1. Si existe versión en inglés genuina
  if (en && !hasSpanglishResidue(en) && !isSpanishCulinaryText(en)) {
    return cleanToPureEnglish(en);
  }
  // 2. Si solo tenemos español o un texto con residuos, traducimos a inglés puro
  const candidate = es || en;
  if (!candidate) return '';
  return cleanToPureEnglish(translateTextSmart(candidate, 'ES', 'EN'));
}

/**
 * Traduce automáticamente un comentario de la comunidad al idioma activo.
 * Si el comentario ya está en el idioma destino, se muestra de forma nativa.
 * Si está en otro idioma, se traduce de inmediato sin necesidad de botones manuales.
 */
export function translateCommentSmart(message: string, targetLang: 'ES' | 'EN'): string {
  if (!message || !message.trim()) return '';
  const trimmed = message.trim();
  const msgIsSpanish = isSpanishText(trimmed);

  if (targetLang === 'ES') {
    if (msgIsSpanish) {
      return cleanToPureSpanish(trimmed);
    }
    return cleanToPureSpanish(translateTextSmart(trimmed, 'EN', 'ES'));
  } else {
    if (!msgIsSpanish) {
      return cleanToPureEnglish(trimmed);
    }
    return cleanToPureEnglish(translateTextSmart(trimmed, 'ES', 'EN'));
  }
}

// Caché en memoria para traducciones automáticas asíncronas
const translationMemoryCache = new Map<string, string>();

export function getCachedTranslation(key: string): string | undefined {
  return translationMemoryCache.get(key);
}

export function setCachedTranslation(key: string, value: string): void {
  translationMemoryCache.set(key, value);
}

/**
 * Solicita en segundo plano traducciones de alta calidad a /api/translate
 * y alimenta la caché en memoria para refrescar sutilmente la pantalla sin botones ni bloqueos.
 */
export async function fetchBackgroundTranslations(params: {
  title?: string;
  description?: string;
  instructions?: string;
  comments?: Array<{ id: string; message: string }>;
  sourceLang: 'ES' | 'EN';
  targetLang: 'ES' | 'EN';
}): Promise<{
  translatedTitle?: string;
  translatedDescription?: string;
  translatedInstructions?: string;
  translatedComments?: Array<{ id: string; message: string }>;
} | null> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}


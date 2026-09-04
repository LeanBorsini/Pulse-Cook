/**
 * @file chefRemyOffline.ts
 * @description Motor heurístico y de reglas offline para el Asistente Culinario "Chef Remy".
 *
 * Actúa como mecanismo de contingencia (*zero-failure fallback*) cuando:
 * 1. No se ha proporcionado la variable de entorno `GEMINI_API_KEY`.
 * 2. La API de Google Gemini experimenta cortes temporales o límites de cuota (HTTP 429/503).
 * 3. El usuario se encuentra sin conexión a internet en la cocina.
 */

/**
 * Estructura de receta producida por el asistente Chef Remy.
 */
export interface RemyRecipeResult {
  /** Título de la receta sugerida */
  title: string;
  /** Descripción y justificación culinaria */
  description: string;
  /** Tiempo de preparación estimado en minutos */
  prepTime: number;
  /** Número de comensales */
  servings: number;
  /** Categoría del plato */
  category: string;
  /** Etiquetas dietéticas sugeridas */
  dietaryTags: string[];
  /** Ingredientes cuantificados */
  ingredients: { amount: number; unit: string; name_es: string; name_en: string }[];
  /** Pasos numerados de cocción */
  instructions: string[];
  /** Consejo o secreto de cocina de Remy */
  chefTip: string;
  /** Regla de seguridad alimentaria y punto de cocción para principiantes */
  safetyTip: string;
}

/**
 * Genera una receta equilibrada basada en los ingredientes disponibles del usuario sin llamar a IA externa.
 *
 * @param {string[]} ingredients - Lista de ingredientes que el usuario tiene a mano.
 * @param {number} [servings=2] - Cantidad de porciones deseadas.
 * @param {number} [prepTime=20] - Tiempo límite disponible en minutos.
 * @param {string} [dietaryGoal='No restrictions'] - Preferencia o restricción alimentaria.
 * @param {'ES' | 'EN'} [lang='ES'] - Idioma en el cual generar el contenido.
 * @returns {RemyRecipeResult} Receta completa lista para cocinar o guardar.
 */
export function generateRemyFallbackRecipe(
  ingredients: string[],
  servings: number = 2,
  prepTime: number = 20,
  dietaryGoal: string = 'No restrictions',
  lang: 'ES' | 'EN' = 'ES'
): RemyRecipeResult {
  const isEs = lang === 'ES';
  const mainIng = ingredients[0] || (isEs ? 'ingredientes frescos' : 'fresh ingredients');
  const secIng = ingredients[1] || (isEs ? 'especias' : 'spices');

  return {
    title: isEs
      ? `Salteado Gourmet de ${mainIng.charAt(0).toUpperCase() + mainIng.slice(1)} y ${secIng}`
      : `Gourmet Sautéed ${mainIng.charAt(0).toUpperCase() + mainIng.slice(1)} & ${secIng}`,
    description: isEs
      ? `Una creación rápida y deliciosa diseñada por Remy para aprovechar al máximo tus ingredientes frescos con una textura perfecta.`
      : `A quick and delicious creation crafted by Remy to make the most of your available ingredients with sublime texture.`,
    prepTime: Math.min(prepTime || 20, 25),
    servings: servings || 2,
    category: isEs ? 'Almuerzo / Cena' : 'Lunch / Dinner',
    dietaryTags: [
      isEs ? 'Rápido (<20m)' : 'Quick (<20m)',
      dietaryGoal !== 'No restrictions' ? dietaryGoal : isEs ? 'Saludable' : 'Healthy',
    ],
    ingredients: ingredients.map((ing, idx) => ({
      amount: idx === 0 ? 200 : idx === 1 ? 100 : 1,
      unit: idx < 2 ? 'g' : isEs ? 'unidad' : 'unit',
      name_es: ing,
      name_en: ing,
    })),
    instructions: isEs
      ? [
          `1. Lavar, secar y cortar ${ingredients.join(', ')} en bocados de tamaño parejo (unos 2 cm) para que se cocinen al mismo tiempo.`,
          `2. Calentar la sartén a fuego medio con un hilo de aceite hasta que empiece a brillar pero sin humear.`,
          `3. Añadir los ingredientes principales: saltear por 6-8 minutos moviendo de vez en cuando, hasta que los bordes adquieran un tono dorado apetitoso y al pincharlos con un tenedor ofrezcan tierna resistencia.`,
          `4. Bajar a fuego suave, sazonar con hierbas, sal y pimienta. Dejar asentar 1 minuto para concentrar jugos y aromas antes de servir.`,
        ]
      : [
          `1. Wash, dry, and chop ${ingredients.join(', ')} into uniform 1-inch bite pieces so they cook evenly together.`,
          `2. Heat a skillet over medium heat with a light drizzle of oil until the oil has a glossy shimmer without smoking.`,
          `3. Add the main ingredients: sauté for 6-8 minutes, stirring occasionally, until edges take on a golden-brown sear and a fork pierces them with tender give.`,
          `4. Lower heat to gentle, season with herbs, salt, and pepper. Let rest 1 minute in the pan so juices settle before serving warm.`,
        ],
    chefTip: isEs
      ? `«Cualquiera puede cocinar»: no sobrecargues la sartén para lograr un dorado crocante en lugar de hervir los ingredientes.`
      : `«Anyone can cook»: do not overcrowd the pan so your ingredients get a nice crispy sear rather than steaming.`,
    safetyTip: isEs
      ? `Seguridad para principiantes: Si utilizas pollo o carnes, asegúrate de que el centro alcance 74°C (o al pincharlo los jugos broten 100% transparentes sin tonos rosados). Lava siempre la tabla y cuchillo con agua caliente y jabón tras cortar carnes crudas.`
      : `Beginner Safety Guide: If incorporating poultry or meats, ensure internal temperature reaches 165°F/74°C (juices must run clear with zero pink meat). Always wash cutting boards and knives with hot soapy water after raw prep.`,
  };
}

/**
 * Sugiere sustitutos culinarios fiables y sus proporciones cuando falta un ingrediente.
 *
 * @param {string} targetIngredient - Nombre del ingrediente que el usuario necesita sustituir.
 * @param {'ES' | 'EN'} [lang='ES'] - Idioma de la respuesta.
 * @returns {{ substitute: string, ratio: string, explanation: string }} Sustituto, proporción y justificación técnica.
 */
export function generateRemyFallbackSubstitute(
  targetIngredient: string,
  lang: 'ES' | 'EN' = 'ES'
): { substitute: string; ratio: string; explanation: string } {
  const isEs = lang === 'ES';
  const norm = (targetIngredient || '').toLowerCase();

  if (norm.includes('huevo') || norm.includes('egg')) {
    return {
      substitute: isEs ? 'Semillas de chía o lino hidratadas (1 cda + 3 cdas de agua) o Puré de manzana' : 'Flax/Chia egg (1 tbsp + 3 tbsp water) or Applesauce',
      ratio: '1:1',
      explanation: isEs
        ? 'Aporta humedad y estructura aglutinante similar al huevo en recetas horneadas y masas.'
        : 'Provides similar moisture and binding properties for baked goods and doughs.',
    };
  }

  if (norm.includes('leche') || norm.includes('milk')) {
    return {
      substitute: isEs ? 'Bebida de almendras, avena o soja sin azúcar' : 'Unsweetened almond, oat, or soy milk',
      ratio: '1:1',
      explanation: isEs
        ? 'Mantiene la liquidez y consistencia sin alterar el perfil de sabor de salsas o postres.'
        : 'Maintains identical liquid ratios without changing the sweetness profile.',
    };
  }

  if (norm.includes('manteca') || norm.includes('mantequilla') || norm.includes('butter')) {
    return {
      substitute: isEs ? 'Aceite de oliva virgen extra o Aceite de coco neutro' : 'Extra virgin olive oil or neutral coconut oil',
      ratio: '3/4 : 1 (75%)',
      explanation: isEs
        ? 'Aporta grasas saludables conservando la humedad y untuosidad.'
        : 'Adds healthy fats while preserving tenderness and moisture.',
    };
  }

  return {
    substitute: isEs ? 'Yogur natural, aceite de oliva suave o puré vegetal' : 'Plain yogurt, light olive oil, or vegetable purée',
    ratio: '1:1',
    explanation: isEs
      ? 'Excelente alternativa para balancear texturas y humedad en preparaciones culinarias.'
      : 'Great alternative to balance moisture and culinary texture.',
  };
}

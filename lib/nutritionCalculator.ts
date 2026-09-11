/**
 * @file nutritionCalculator.ts
 * @description Motor heurístico y de estimación nutricional orientativa para Pulse&Cook.
 *
 * Características:
 * 1. Estimación local e instantánea (Offline-First) basada en base de datos gastronómica estándar.
 * 2. Reconocimiento semántico de ingredientes en español e inglés (cortes de carne, legumbres, lácteos, cereales, etc.).
 * 3. Normalización de cantidades gastronómicas (cucharadas, gramos, tazas, unidades, pizcas, chorritos).
 * 4. Consulta opcional en segundo plano a la API asistida por IA (/api/nutrition) para ingredientes exóticos o combinaciones complejas.
 * 5. Caché persistente en localStorage por ID de receta para no recalcular innecesariamente.
 * 6. Transparencia total: comunica siempre valores redondeados y con indicador de aproximación (~).
 */

import { Ingredient, NutritionInfo } from '../app/types';
import { getCachedNutrition, saveCachedNutrition } from './recipeStore';

interface FoodProfile {
  nameMatch: string[];
  calPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  unitWeightGrams?: number; // Peso típico si la unidad es "unidad", "diente", etc.
}

/**
 * Base de datos culinaria estándar de alimentos (valores promedio por 100g)
 */
const FOOD_DATABASE: FoodProfile[] = [
  // Carnes y aves
  {
    nameMatch: ['pechuga de pollo', 'pechuga', 'chicken breast', 'pechugas'],
    calPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    unitWeightGrams: 200,
  },
  {
    nameMatch: ['pollo', 'chicken', 'muslo de pollo', 'pata de pollo', 'alitas de pollo', 'chicken thigh'],
    calPer100g: 215,
    proteinPer100g: 24,
    carbsPer100g: 0,
    fatPer100g: 13,
    unitWeightGrams: 150,
  },
  {
    nameMatch: ['carne picada', 'carne molida', 'ground beef', 'minced meat', 'ternera', 'beef', 'lomo'],
    calPer100g: 240,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 15,
    unitWeightGrams: 180,
  },
  {
    nameMatch: ['cerdo', 'pork', 'lomo de cerdo', 'costillas'],
    calPer100g: 220,
    proteinPer100g: 25,
    carbsPer100g: 0,
    fatPer100g: 13,
    unitWeightGrams: 160,
  },
  {
    nameMatch: ['jamon', 'ham', 'prosciutto', 'bacon', 'panceta', 'tocino'],
    calPer100g: 350,
    proteinPer100g: 20,
    carbsPer100g: 1.5,
    fatPer100g: 30,
    unitWeightGrams: 25,
  },

  // Pescados y Mariscos
  {
    nameMatch: ['salmon', 'salmón'],
    calPer100g: 208,
    proteinPer100g: 22,
    carbsPer100g: 0,
    fatPer100g: 13,
    unitWeightGrams: 180,
  },
  {
    nameMatch: ['atun', 'atún', 'tuna'],
    calPer100g: 130,
    proteinPer100g: 28,
    carbsPer100g: 0,
    fatPer100g: 1,
    unitWeightGrams: 80,
  },
  {
    nameMatch: ['merluza', 'bacalao', 'pescado blanco', 'cod', 'white fish', 'tilapia'],
    calPer100g: 90,
    proteinPer100g: 19,
    carbsPer100g: 0,
    fatPer100g: 1.2,
    unitWeightGrams: 150,
  },
  {
    nameMatch: ['camaron', 'camarones', 'gamba', 'gambas', 'shrimp', 'langostino'],
    calPer100g: 99,
    proteinPer100g: 24,
    carbsPer100g: 0.2,
    fatPer100g: 0.3,
    unitWeightGrams: 15,
  },

  // Huevos y Lácteos
  {
    nameMatch: ['huevo', 'huevos', 'egg', 'eggs'],
    calPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
    unitWeightGrams: 50,
  },
  {
    nameMatch: ['clara de huevo', 'egg white'],
    calPer100g: 52,
    proteinPer100g: 11,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    unitWeightGrams: 33,
  },
  {
    nameMatch: ['leche', 'milk'],
    calPer100g: 50,
    proteinPer100g: 3.3,
    carbsPer100g: 4.8,
    fatPer100g: 2,
    unitWeightGrams: 240, // 1 vaso/taza
  },
  {
    nameMatch: ['crema', 'nata', 'heavy cream', 'whipping cream', 'crema de leche'],
    calPer100g: 345,
    proteinPer100g: 2.5,
    carbsPer100g: 3,
    fatPer100g: 36,
    unitWeightGrams: 15, // 1 cda
  },
  {
    nameMatch: ['parmesano', 'parmesan', 'grana padano', 'queso curado'],
    calPer100g: 431,
    proteinPer100g: 38,
    carbsPer100g: 4.1,
    fatPer100g: 29,
    unitWeightGrams: 20,
  },
  {
    nameMatch: ['mozzarella', 'queso fresco', 'ricotta', 'queso cremoso'],
    calPer100g: 280,
    proteinPer100g: 22,
    carbsPer100g: 2.2,
    fatPer100g: 21,
    unitWeightGrams: 30,
  },
  {
    nameMatch: ['queso cheddar', 'cheddar', 'queso gouda', 'queso', 'cheese'],
    calPer100g: 400,
    proteinPer100g: 25,
    carbsPer100g: 1.3,
    fatPer100g: 33,
    unitWeightGrams: 30,
  },
  {
    nameMatch: ['yogur', 'yogurt', 'yogur griego', 'greek yogurt'],
    calPer100g: 90,
    proteinPer100g: 8,
    carbsPer100g: 4.5,
    fatPer100g: 4.5,
    unitWeightGrams: 125,
  },
  {
    nameMatch: ['mantequilla', 'manteca', 'butter'],
    calPer100g: 717,
    proteinPer100g: 0.9,
    carbsPer100g: 0.1,
    fatPer100g: 81,
    unitWeightGrams: 14, // 1 cda
  },

  // Aceites y Grasas
  {
    nameMatch: ['aceite de oliva', 'aceite', 'olive oil', 'oil', 'aceite de girasol'],
    calPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
    unitWeightGrams: 14, // 1 cucharada
  },

  // Granos, Arroces y Pastas
  {
    nameMatch: ['arroz', 'rice', 'arroz basmati', 'arroz arborio', 'arroz integral'],
    calPer100g: 360,
    proteinPer100g: 7,
    carbsPer100g: 78,
    fatPer100g: 1,
    fiberPer100g: 1.5,
    unitWeightGrams: 75, // ración cruda
  },
  {
    nameMatch: ['pasta', 'espaguetis', 'spaghetti', 'macarrones', 'fideos', 'noodles', 'penne'],
    calPer100g: 370,
    proteinPer100g: 13,
    carbsPer100g: 74,
    fatPer100g: 1.5,
    fiberPer100g: 3,
    unitWeightGrams: 80,
  },
  {
    nameMatch: ['pan', 'bread', 'tostada', 'baguette', 'pan integral'],
    calPer100g: 265,
    proteinPer100g: 9,
    carbsPer100g: 49,
    fatPer100g: 3.2,
    fiberPer100g: 2.7,
    unitWeightGrams: 40, // 1 rebanada
  },
  {
    nameMatch: ['harina', 'harina de trigo', 'flour', 'wheat flour'],
    calPer100g: 364,
    proteinPer100g: 10,
    carbsPer100g: 76,
    fatPer100g: 1,
    fiberPer100g: 2.7,
    unitWeightGrams: 30, // 1 cda colmada
  },
  {
    nameMatch: ['avena', 'oats', 'copos de avena'],
    calPer100g: 389,
    proteinPer100g: 16.9,
    carbsPer100g: 66,
    fatPer100g: 6.9,
    fiberPer100g: 10.6,
    unitWeightGrams: 40,
  },
  {
    nameMatch: ['quinoa', 'quinua'],
    calPer100g: 368,
    proteinPer100g: 14,
    carbsPer100g: 64,
    fatPer100g: 6,
    fiberPer100g: 7,
    unitWeightGrams: 60,
  },

  // Legumbres
  {
    nameMatch: ['lentejas', 'lentils'],
    calPer100g: 350,
    proteinPer100g: 25,
    carbsPer100g: 60,
    fatPer100g: 1,
    fiberPer100g: 11,
    unitWeightGrams: 70,
  },
  {
    nameMatch: ['garbanzos', 'chickpeas'],
    calPer100g: 364,
    proteinPer100g: 19,
    carbsPer100g: 61,
    fatPer100g: 6,
    fiberPer100g: 17,
    unitWeightGrams: 70,
  },
  {
    nameMatch: ['frijoles', 'alubias', 'judias', 'beans', 'porotos'],
    calPer100g: 340,
    proteinPer100g: 21,
    carbsPer100g: 62,
    fatPer100g: 1.2,
    fiberPer100g: 15,
    unitWeightGrams: 70,
  },

  // Vegetales y Hortalizas
  {
    nameMatch: ['cebolla', 'onion', 'cebollas'],
    calPer100g: 40,
    proteinPer100g: 1.1,
    carbsPer100g: 9.3,
    fatPer100g: 0.1,
    fiberPer100g: 1.7,
    unitWeightGrams: 150, // 1 cebolla mediana
  },
  {
    nameMatch: ['ajo', 'garlic', 'diente de ajo', 'dientes de ajo'],
    calPer100g: 149,
    proteinPer100g: 6.4,
    carbsPer100g: 33,
    fatPer100g: 0.5,
    fiberPer100g: 2.1,
    unitWeightGrams: 4, // 1 diente
  },
  {
    nameMatch: ['tomate', 'tomato', 'tomates', 'tomate triturado', 'salsa de tomate'],
    calPer100g: 20,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
    fiberPer100g: 1.2,
    unitWeightGrams: 130, // 1 tomate mediano
  },
  {
    nameMatch: ['papa', 'patata', 'potato', 'papas', 'patatas'],
    calPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20,
    fatPer100g: 0.1,
    fiberPer100g: 1.8,
    unitWeightGrams: 180, // 1 papa mediana
  },
  {
    nameMatch: ['zanahoria', 'carrot', 'zanahorias'],
    calPer100g: 41,
    proteinPer100g: 0.9,
    carbsPer100g: 9.6,
    fatPer100g: 0.2,
    fiberPer100g: 2.8,
    unitWeightGrams: 80, // 1 zanahoria mediana
  },
  {
    nameMatch: ['espinaca', 'spinach', 'espinacas'],
    calPer100g: 23,
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    fiberPer100g: 2.2,
    unitWeightGrams: 50,
  },
  {
    nameMatch: ['champiñones', 'setas', 'mushrooms', 'hongos', 'boletus'],
    calPer100g: 28,
    proteinPer100g: 3.1,
    carbsPer100g: 3.3,
    fatPer100g: 0.3,
    fiberPer100g: 1,
    unitWeightGrams: 20,
  },
  {
    nameMatch: ['pimiento', 'bell pepper', 'pimientos', 'morron', 'morrón'],
    calPer100g: 31,
    proteinPer100g: 1,
    carbsPer100g: 6,
    fatPer100g: 0.3,
    fiberPer100g: 2.1,
    unitWeightGrams: 150,
  },
  {
    nameMatch: ['calabacin', 'calabacín', 'zucchini'],
    calPer100g: 17,
    proteinPer100g: 1.2,
    carbsPer100g: 3.1,
    fatPer100g: 0.3,
    fiberPer100g: 1,
    unitWeightGrams: 200,
  },
  {
    nameMatch: ['aguacate', 'palta', 'avocado'],
    calPer100g: 160,
    proteinPer100g: 2,
    carbsPer100g: 8.5,
    fatPer100g: 15,
    fiberPer100g: 6.7,
    unitWeightGrams: 150,
  },

  // Frutas y Azúcares
  {
    nameMatch: ['platano', 'plátano', 'banana', 'banano'],
    calPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 23,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
    unitWeightGrams: 120,
  },
  {
    nameMatch: ['manzana', 'apple'],
    calPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 14,
    fatPer100g: 0.2,
    fiberPer100g: 2.4,
    unitWeightGrams: 180,
  },
  {
    nameMatch: ['limon', 'limón', 'lemon', 'lima', 'jugo de limon'],
    calPer100g: 29,
    proteinPer100g: 1.1,
    carbsPer100g: 9,
    fatPer100g: 0.3,
    fiberPer100g: 2.8,
    unitWeightGrams: 60,
  },
  {
    nameMatch: ['azucar', 'azúcar', 'sugar', 'miel', 'honey'],
    calPer100g: 387,
    proteinPer100g: 0,
    carbsPer100g: 100,
    fatPer100g: 0,
    unitWeightGrams: 12, // 1 cda
  },
  {
    nameMatch: ['chocolate', 'cacao', 'cocoa'],
    calPer100g: 546,
    proteinPer100g: 5,
    carbsPer100g: 60,
    fatPer100g: 31,
    unitWeightGrams: 25,
  },

  // Frutos secos y semillas
  {
    nameMatch: ['nueces', 'walnuts', 'almendras', 'almonds', 'cacahuetes', 'mani', 'frutos secos'],
    calPer100g: 600,
    proteinPer100g: 18,
    carbsPer100g: 15,
    fatPer100g: 54,
    fiberPer100g: 7,
    unitWeightGrams: 30, // 1 puñado
  },
];

/**
 * Normaliza una cadena de texto para coincidencia culinaria flexible
 */
function cleanText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Encuentra el perfil nutricional más cercano a partir del nombre del ingrediente
 */
function matchFoodProfile(ingredientName: string): FoodProfile | null {
  const cleaned = cleanText(ingredientName);

  // 1. Coincidencia exacta o contiene frase
  for (const item of FOOD_DATABASE) {
    for (const match of item.nameMatch) {
      const cleanedMatch = cleanText(match);
      if (cleaned.includes(cleanedMatch) || cleanedMatch.includes(cleaned)) {
        return item;
      }
    }
  }

  // 2. Coincidencia por palabra clave
  const words = cleaned.split(/\s+/);
  for (const item of FOOD_DATABASE) {
    for (const match of item.nameMatch) {
      const matchWords = cleanText(match).split(/\s+/);
      if (matchWords.some((mw) => mw.length > 3 && words.includes(mw))) {
        return item;
      }
    }
  }

  return null;
}

/**
 * Estima el peso total en gramos de una línea de ingrediente
 */
function estimateWeightInGrams(amount: number, unit: string, profile: FoodProfile | null): number {
  const normUnit = cleanText(unit);
  const safeAmount = Math.max(0.1, Number(amount) || 1);

  if (normUnit.startsWith('kg') || normUnit.includes('kilo')) {
    return safeAmount * 1000;
  }
  if (normUnit === 'g' || normUnit.startsWith('gr') || normUnit.includes('gramo')) {
    return safeAmount;
  }
  if (normUnit === 'ml' || normUnit === 'cc' || normUnit.includes('mililitro')) {
    return safeAmount; // Densidad aprox 1g/ml
  }
  if (normUnit === 'l' || normUnit.startsWith('litro')) {
    return safeAmount * 1000;
  }
  if (normUnit.includes('cda') || normUnit.includes('cucharada') || normUnit.includes('tbsp')) {
    return safeAmount * (profile?.unitWeightGrams || 14);
  }
  if (normUnit.includes('cdta') || normUnit.includes('cucharadita') || normUnit.includes('tsp')) {
    return safeAmount * 5;
  }
  if (normUnit.includes('taza') || normUnit.includes('cup') || normUnit.includes('vaso')) {
    return safeAmount * 200;
  }
  if (normUnit.includes('pizca') || normUnit.includes('pinch')) {
    return safeAmount * 1;
  }
  if (normUnit.includes('chorro') || normUnit.includes('chorrito') || normUnit.includes('splash')) {
    return safeAmount * 10;
  }

  // Si la unidad es "unidad", "diente", "rebanada", "pieza", etc., usar unitWeightGrams
  if (profile?.unitWeightGrams) {
    return safeAmount * profile.unitWeightGrams;
  }

  // Valor por defecto para unidades sin especificar
  return safeAmount * 50;
}

/**
 * Calcula los valores nutricionales totales y por ración de forma local e instantánea
 */
export function calculateLocalNutrition(
  ingredients: Ingredient[],
  servings: number = 2
): NutritionInfo {
  const validServings = Math.max(1, Number(servings) || 1);

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  if (!ingredients || ingredients.length === 0) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      is_estimated: true,
    };
  }

  for (const ing of ingredients) {
    const rawName = ing.name_es || ing.name_en || '';
    if (!rawName.trim()) continue;

    const profile = matchFoodProfile(rawName);
    const weightGrams = estimateWeightInGrams(ing.amount, ing.unit, profile);

    if (profile) {
      const factor = weightGrams / 100;
      totalCalories += profile.calPer100g * factor;
      totalProtein += profile.proteinPer100g * factor;
      totalCarbs += profile.carbsPer100g * factor;
      totalFat += profile.fatPer100g * factor;
      if (profile.fiberPer100g) {
        totalFiber += profile.fiberPer100g * factor;
      }
    } else {
      // Ingrediente genérico vegetal / condimento estimado (~50 kcal / 100g)
      const factor = weightGrams / 100;
      totalCalories += 50 * factor;
      totalProtein += 1.5 * factor;
      totalCarbs += 8 * factor;
      totalFat += 0.5 * factor;
    }
  }

  const perServingCalories = Math.round(totalCalories / validServings);
  const perServingProtein = Math.round((totalProtein / validServings) * 10) / 10;
  const perServingCarbs = Math.round((totalCarbs / validServings) * 10) / 10;
  const perServingFat = Math.round((totalFat / validServings) * 10) / 10;
  const perServingFiber = Math.round((totalFiber / validServings) * 10) / 10;

  return {
    calories: perServingCalories,
    protein: Math.round(perServingProtein),
    carbs: Math.round(perServingCarbs),
    fat: Math.round(perServingFat),
    fiber: perServingFiber > 0 ? Math.round(perServingFiber) : undefined,
    is_estimated: true,
    calculated_at: new Date().toISOString(),
  };
}

/**
 * Obtiene o calcula la estimación nutricional para una receta:
 * 1. Revisa si ya viene en la receta (`recipe.nutrition_info`).
 * 2. Revisa si existe en la caché local de `localStorage`.
 * 3. Si no existe, lanza el cálculo local instantáneo y opcionalmente llama a `/api/nutrition`
 *    para refinar la precisión con IA en segundo plano.
 */
export async function getOrCalculateNutrition(
  recipeId: string,
  ingredients: Ingredient[],
  servings: number,
  existingNutrition?: NutritionInfo
): Promise<NutritionInfo> {
  // 1. Si ya viene persistido en la receta
  if (existingNutrition && existingNutrition.calories > 0) {
    return existingNutrition;
  }

  // 2. Si está en caché local
  if (recipeId) {
    const cached = getCachedNutrition(recipeId);
    if (cached && cached.calories > 0) {
      return cached;
    }
  }

  // 3. Cálculo local instantáneo garantizado (0 latencia)
  const localEstimate = calculateLocalNutrition(ingredients, servings);

  // Guardar en caché local para próximas visualizaciones
  if (recipeId && localEstimate.calories > 0) {
    saveCachedNutrition(recipeId, localEstimate);
  }

  // 4. Refinamiento en segundo plano mediante /api/nutrition (no bloqueante)
  if (typeof window !== 'undefined' && ingredients.length > 0) {
    // Lanzar fetch en background sin bloquear
    fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients,
        servings,
      }),
    })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.calories > 0 && recipeId) {
          const refinedEstimate: NutritionInfo = {
            calories: Math.round(data.calories),
            protein: Math.round(data.protein || localEstimate.protein),
            carbs: Math.round(data.carbs || localEstimate.carbs),
            fat: Math.round(data.fat || localEstimate.fat),
            fiber: data.fiber ? Math.round(data.fiber) : localEstimate.fiber,
            summary: data.summary,
            is_estimated: true,
            calculated_at: new Date().toISOString(),
          };
          saveCachedNutrition(recipeId, refinedEstimate);
        }
      })
      .catch((err) => {
        // En caso de fallo de red o cuota, el valor local ya está activo y seguro
        console.debug('Background nutrition refinement notice:', err);
      });
  }

  return localEstimate;
}

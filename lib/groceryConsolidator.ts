/**
 * @file groceryConsolidator.ts
 * @description Motor algorítmico de consolidación para la Lista de Compras inteligente.
 *
 * Responsabilidades:
 * 1. Normalizar unidades de medida heterogéneas (ej. "grs", "gramos", "g" -> "g").
 * 2. Unificar ingredientes duplicados mediante claves canónicas ("pechuga", "pollo", etc.).
 * 3. Sumar matemáticamente cantidades de recetas distintas asociadas a la misma unidad.
 * 4. Clasificar automáticamente los ingredientes en pasillos del supermercado:
 *    (produce, meat, dairy, pantry, other).
 */

import { Recipe, Ingredient } from '../app/types';
import { translateIngredientName } from './culinaryDictionary';

/**
 * Representa un artículo consolidado listo para la lista de compras del usuario.
 */
export interface ConsolidatedItem {
  /** Clave canónica única para deduplicación (ej. 'pollo_pechuga') */
  key: string;
  /** Nombre en español formateado para compras */
  name_es: string;
  /** Nombre en inglés formateado para compras */
  name_en: string;
  /** Cantidad matemática sumada de todas las recetas */
  amount: number;
  /** Unidad de medida normalizada */
  unit: string;
  /** Pasillo o categoría del supermercado */
  category: 'produce' | 'meat' | 'dairy' | 'pantry' | 'other';
  /** Nombres de las recetas de origen que requieren este ingrediente */
  recipes: string[];
}

/**
 * Nombres legibles bilingües de las categorías de pasillo del supermercado.
 */
export const CATEGORY_NAMES = {
  produce: { es: 'Frutas y Verduras', en: 'Produce & Vegetables' },
  meat: { es: 'Carnes y Proteínas', en: 'Meats & Proteins' },
  dairy: { es: 'Lácteos y Refrigerados', en: 'Dairy & Refrigerated' },
  pantry: { es: 'Despensa y Granos', en: 'Pantry & Grains' },
  other: { es: 'Otros Artículos', en: 'Other Items' },
};

/**
 * Normaliza cadenas de unidades culinarias a una nomenclatura estándar común.
 * 
 * @param {string | undefined} unit - Unidad original (ej. 'cucharadas', 'tbsp', 'gramos').
 * @returns {string} Unidad normalizada (ej. 'cda', 'g', 'kg', 'ml', 'und').
 */
export function normalizeUnit(unit: string | undefined): string {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
  if (['u', 'und', 'unidad', 'unidades', 'unit', 'units', 'piezas', 'pz', 'pza'].includes(u)) return 'und';
  if (['g', 'gr', 'grs', 'gramo', 'gramos', 'gram', 'grams'].includes(u)) return 'g';
  if (['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(u)) return 'kg';
  if (['ml', 'mls', 'mililitro', 'mililitros'].includes(u)) return 'ml';
  if (['l', 'lt', 'lts', 'litro', 'litros', 'liter', 'liters'].includes(u)) return 'L';
  if (['cda', 'cdas', 'cucharada', 'cucharadas', 'tbsp', 'tablespoon', 'tablespoons'].includes(u)) return 'cda';
  if (['cdta', 'cdtas', 'cucharadita', 'cucharaditas', 'tsp', 'teaspoon', 'teaspoons'].includes(u)) return 'cdta';
  if (['pizca', 'pizcas', 'pinch', 'pinches'].includes(u)) return 'pizca';
  if (['taza', 'tazas', 'cup', 'cups'].includes(u)) return 'taza';
  if (['lata', 'latas', 'can', 'cans'].includes(u)) return 'lata';
  if (['diente', 'dientes', 'clove', 'cloves'].includes(u)) return 'diente';
  if (['feta', 'fetas', 'rebanada', 'rebanadas', 'slice', 'slices'].includes(u)) return 'fetas';
  return unit.trim();
}

/**
 * Normaliza nombres de ingredientes para unificar variaciones morfológicas o sinónimos.
 * Remueve tildes, minúsculas y clasifica en el pasillo correspondiente.
 *
 * @param {string} name - Nombre bruto del ingrediente (ej. 'Pechuguitas de pollo').
 * @returns {{ key: string, canonical_es: string, canonical_en: string, category: 'produce' | 'meat' | 'dairy' | 'pantry' | 'other' }}
 */
export function normalizeIngredientKey(name: string): {
  key: string;
  canonical_es: string;
  canonical_en: string;
  category: 'produce' | 'meat' | 'dairy' | 'pantry' | 'other';
} {
  let normalized = (name || '').toLowerCase().trim();
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Pollo / Pechuga
  if (normalized.includes('pechuga') || normalized.includes('pollo')) {
    return { key: 'pollo_pechuga', canonical_es: 'Pechuga de pollo', canonical_en: 'Chicken breast', category: 'meat' };
  }
  // Huevos
  if (normalized.includes('huevo') || normalized.includes('egg')) {
    return { key: 'huevo', canonical_es: 'Huevos', canonical_en: 'Eggs', category: 'dairy' };
  }
  // Carne vacuna / picada
  if (normalized.includes('carne picada') || normalized.includes('ground beef')) {
    return { key: 'carne_picada', canonical_es: 'Carne picada', canonical_en: 'Ground beef', category: 'meat' };
  }
  if (normalized.includes('carne') || normalized.includes('beef') || normalized.includes('steak')) {
    return { key: 'carne', canonical_es: 'Carne vacuna', canonical_en: 'Beef', category: 'meat' };
  }
  // Atún
  if (normalized.includes('atun') || normalized.includes('tuna')) {
    return { key: 'atun', canonical_es: 'Atún', canonical_en: 'Tuna', category: 'meat' };
  }
  // Salmón / Pescado
  if (normalized.includes('salmon')) {
    return { key: 'salmon', canonical_es: 'Salmón', canonical_en: 'Salmon', category: 'meat' };
  }
  if (normalized.includes('pescado') || normalized.includes('fish')) {
    return { key: 'pescado', canonical_es: 'Pescado', canonical_en: 'Fish', category: 'meat' };
  }
  // Tofu
  if (normalized.includes('tofu')) {
    return { key: 'tofu', canonical_es: 'Tofu', canonical_en: 'Tofu', category: 'meat' };
  }

  // Lácteos y Quesos
  if (normalized.includes('queso crema') || normalized.includes('cream cheese')) {
    return { key: 'queso_crema', canonical_es: 'Queso crema', canonical_en: 'Cream cheese', category: 'dairy' };
  }
  if (normalized.includes('mussarela') || normalized.includes('mozzarella') || normalized.includes('muzzarella')) {
    return { key: 'queso_mozzarella', canonical_es: 'Queso mozzarella', canonical_en: 'Mozzarella cheese', category: 'dairy' };
  }
  if (normalized.includes('parmesano') || normalized.includes('parmesan') || normalized.includes('reggiano')) {
    return { key: 'queso_parmesano', canonical_es: 'Queso parmesano', canonical_en: 'Parmesan cheese', category: 'dairy' };
  }
  if (normalized.includes('queso') || normalized.includes('cheese')) {
    return { key: 'queso', canonical_es: 'Queso', canonical_en: 'Cheese', category: 'dairy' };
  }
  if (normalized.includes('yogur') || normalized.includes('yogurt')) {
    return { key: 'yogur', canonical_es: 'Yogur natural', canonical_en: 'Plain yogurt', category: 'dairy' };
  }
  if (normalized.includes('leche') || normalized.includes('milk')) {
    return { key: 'leche', canonical_es: 'Leche', canonical_en: 'Milk', category: 'dairy' };
  }
  if (normalized.includes('manteca') || normalized.includes('mantequilla') || normalized.includes('butter')) {
    return { key: 'manteca', canonical_es: 'Mantequilla / Manteca', canonical_en: 'Butter', category: 'dairy' };
  }
  if (normalized.includes('crema') || normalized.includes('heavy cream')) {
    return { key: 'crema', canonical_es: 'Crema de leche', canonical_en: 'Heavy cream', category: 'dairy' };
  }

  // Frutas & Verduras
  if (normalized.includes('cebolla morada') || normalized.includes('red onion')) {
    return { key: 'cebolla_morada', canonical_es: 'Cebolla morada', canonical_en: 'Red onion', category: 'produce' };
  }
  if (normalized.includes('cebolla') || normalized.includes('onion')) {
    return { key: 'cebolla', canonical_es: 'Cebolla', canonical_en: 'Onion', category: 'produce' };
  }
  if (normalized.includes('tomate cherry') || normalized.includes('cherry tomato')) {
    return { key: 'tomate_cherry', canonical_es: 'Tomates cherry', canonical_en: 'Cherry tomatoes', category: 'produce' };
  }
  if (normalized.includes('tomate') || normalized.includes('tomato')) {
    return { key: 'tomate', canonical_es: 'Tomates', canonical_en: 'Tomatoes', category: 'produce' };
  }
  if (normalized.includes('ajo') || normalized.includes('garlic')) {
    return { key: 'ajo', canonical_es: 'Ajo', canonical_en: 'Garlic', category: 'produce' };
  }
  if (normalized.includes('papa') || normalized.includes('patata') || normalized.includes('potato')) {
    return { key: 'papa', canonical_es: 'Papas / Patatas', canonical_en: 'Potatoes', category: 'produce' };
  }
  if (normalized.includes('zapallo') || normalized.includes('calabaza') || normalized.includes('squash') || normalized.includes('pumpkin')) {
    return { key: 'zapallo', canonical_es: 'Zapallo / Calabaza', canonical_en: 'Pumpkin / Squash', category: 'produce' };
  }
  if (normalized.includes('zanahoria') || normalized.includes('carrot')) {
    return { key: 'zanahoria', canonical_es: 'Zanahorias', canonical_en: 'Carrots', category: 'produce' };
  }
  if (normalized.includes('espinaca') || normalized.includes('spinach')) {
    return { key: 'espinaca', canonical_es: 'Espinacas', canonical_en: 'Spinach', category: 'produce' };
  }
  if (normalized.includes('lechuga') || normalized.includes('lettuce')) {
    return { key: 'lechuga', canonical_es: 'Lechuga', canonical_en: 'Lettuce', category: 'produce' };
  }
  if (normalized.includes('palta') || normalized.includes('aguacate') || normalized.includes('avocado')) {
    return { key: 'palta', canonical_es: 'Palta / Aguacate', canonical_en: 'Avocado', category: 'produce' };
  }
  if (normalized.includes('limon') || normalized.includes('lima') || normalized.includes('lemon') || normalized.includes('lime')) {
    return { key: 'limon', canonical_es: 'Limón / Lima', canonical_en: 'Lemon / Lime', category: 'produce' };
  }
  if (normalized.includes('pimiento') || normalized.includes('morron') || normalized.includes('bell pepper')) {
    return { key: 'pimiento', canonical_es: 'Pimientos / Morrones', canonical_en: 'Bell peppers', category: 'produce' };
  }
  if (normalized.includes('champignon') || normalized.includes('champiñon') || normalized.includes('hongo') || normalized.includes('mushroom')) {
    return { key: 'champignon', canonical_es: 'Champiñones / Hongos', canonical_en: 'Mushrooms', category: 'produce' };
  }
  if (normalized.includes('perejil') || normalized.includes('parsley')) {
    return { key: 'perejil', canonical_es: 'Perejil fresco', canonical_en: 'Fresh parsley', category: 'produce' };
  }
  if (normalized.includes('cilantro') || normalized.includes('coriander')) {
    return { key: 'cilantro', canonical_es: 'Cilantro fresco', canonical_en: 'Fresh cilantro', category: 'produce' };
  }
  if (normalized.includes('albahaca') || normalized.includes('basil')) {
    return { key: 'albahaca', canonical_es: 'Albahaca fresca', canonical_en: 'Fresh basil', category: 'produce' };
  }

  // Despensa, Granos & Condimentos
  if (normalized.includes('avena') || normalized.includes('oat')) {
    return { key: 'avena', canonical_es: 'Avena', canonical_en: 'Oats', category: 'pantry' };
  }
  if (normalized.includes('harina') || normalized.includes('flour')) {
    return { key: 'harina', canonical_es: 'Harina', canonical_en: 'Flour', category: 'pantry' };
  }
  if (normalized.includes('fideo') || normalized.includes('pasta') || normalized.includes('espagueti') || normalized.includes('spaghetti')) {
    return { key: 'pasta', canonical_es: 'Pasta / Fideos', canonical_en: 'Pasta / Noodles', category: 'pantry' };
  }
  if (normalized.includes('arroz') || normalized.includes('rice')) {
    return { key: 'arroz', canonical_es: 'Arroz', canonical_en: 'Rice', category: 'pantry' };
  }
  if (normalized.includes('quinoa')) {
    return { key: 'quinoa', canonical_es: 'Quinoa', canonical_en: 'Quinoa', category: 'pantry' };
  }
  if (normalized.includes('garbanzo') || normalized.includes('chickpea')) {
    return { key: 'garbanzo', canonical_es: 'Garbanzos', canonical_en: 'Chickpeas', category: 'pantry' };
  }
  if (normalized.includes('lenteja') || normalized.includes('lentil')) {
    return { key: 'lenteja', canonical_es: 'Lentejas', canonical_en: 'Lentils', category: 'pantry' };
  }
  if (normalized.includes('sal') || normalized.includes('salt')) {
    return { key: 'sal', canonical_es: 'Sal', canonical_en: 'Salt', category: 'pantry' };
  }
  if (normalized.includes('pimienta') || normalized.includes('pepper')) {
    return { key: 'pimienta', canonical_es: 'Pimienta', canonical_en: 'Black pepper', category: 'pantry' };
  }
  if (normalized.includes('aceite') || normalized.includes('oil')) {
    return { key: 'aceite', canonical_es: 'Aceite de oliva', canonical_en: 'Olive oil', category: 'pantry' };
  }
  if (normalized.includes('oregano')) {
    return { key: 'oregano', canonical_es: 'Orégano', canonical_en: 'Oregano', category: 'pantry' };
  }
  if (normalized.includes('paprika') || normalized.includes('pimenton')) {
    return { key: 'paprika', canonical_es: 'Paprika / Pimentón', canonical_en: 'Paprika', category: 'pantry' };
  }
  if (normalized.includes('comino') || normalized.includes('cumin')) {
    return { key: 'comino', canonical_es: 'Comino', canonical_en: 'Cumin', category: 'pantry' };
  }
  if (normalized.includes('canela') || normalized.includes('cinnamon')) {
    return { key: 'canela', canonical_es: 'Canela', canonical_en: 'Cinnamon', category: 'pantry' };
  }
  if (normalized.includes('miel') || normalized.includes('honey')) {
    return { key: 'miel', canonical_es: 'Miel', canonical_en: 'Honey', category: 'pantry' };
  }
  if (normalized.includes('azucar') || normalized.includes('sugar')) {
    return { key: 'azucar', canonical_es: 'Azúcar', canonical_en: 'Sugar', category: 'pantry' };
  }
  if (normalized.includes('polvo de hornear') || normalized.includes('baking powder')) {
    return { key: 'polvo_hornear', canonical_es: 'Polvo de hornear', canonical_en: 'Baking powder', category: 'pantry' };
  }
  if (normalized.includes('vainilla') || normalized.includes('vanilla')) {
    return { key: 'vainilla', canonical_es: 'Esencia de vainilla', canonical_en: 'Vanilla extract', category: 'pantry' };
  }

  // Fallback genérico
  const fallbackEs = name.trim();
  const fallbackEn = translateIngredientName(fallbackEs, undefined, 'EN') || fallbackEs;
  return {
    key: normalized.replace(/[^a-z0-9]/g, '_'),
    canonical_es: fallbackEs,
    canonical_en: fallbackEn,
    category: 'other',
  };
}

/**
 * Realiza la consolidación matemática y semántica de una lista de ingredientes.
 * Agrupa duplicados sumando sus cantidades cuando coinciden en clave y unidad,
 * redondea a 2 decimales y organiza el resultado por categorías de pasillo.
 *
 * @param {Ingredient[]} items - Lista de ingredientes brutos extraídos de las recetas del menú.
 * @param {Recipe[]} recipes - Lista de recetas para recuperar sus títulos y asociarlas a los ítems.
 * @param {'ES' | 'EN'} [lang='ES'] - Idioma para mostrar los títulos de las recetas de origen.
 * @returns {Record<'produce' | 'meat' | 'dairy' | 'pantry' | 'other', ConsolidatedItem[]>} Mapa agrupado por pasillo.
 */
export function consolidateIngredients(
  items: Ingredient[],
  recipes: Recipe[],
  lang: 'ES' | 'EN' = 'ES'
): Record<'produce' | 'meat' | 'dairy' | 'pantry' | 'other', ConsolidatedItem[]> {
  const map: Record<string, ConsolidatedItem> = {};
  const recipeMap = new Map(recipes.map(r => [r.id, r]));

  items.forEach((ing: Ingredient) => {
    const recipe = ing.recipe_id ? recipeMap.get(ing.recipe_id) : undefined;
    const recipeTitle = recipe 
      ? (lang === 'ES' ? recipe.title_es : recipe.title_en || recipe.title_es)
      : 'General';

    const nameEs = ing.name_es || '';
    const nameEn = ing.name_en || '';
    const rawName = nameEs || nameEn || '';
    if (!rawName.trim()) return;

    const norm = normalizeIngredientKey(rawName);
    const normUnit = normalizeUnit(ing.unit);
    const parsedAmount = Number(ing.amount) || 0;

    // Agrupar por clave canónica + unidad normalizada (para sumar de forma segura)
    const compositeKey = `${norm.key}_${normUnit}`;

    if (!map[compositeKey]) {
      map[compositeKey] = {
        key: norm.key,
        name_es: norm.canonical_es,
        name_en: norm.canonical_en,
        amount: parsedAmount,
        unit: normUnit,
        category: norm.category,
        recipes: [recipeTitle],
      };
    } else {
      // Sumar matemáticamente las cantidades
      map[compositeKey].amount += parsedAmount;
      if (!map[compositeKey].recipes.includes(recipeTitle)) {
        map[compositeKey].recipes.push(recipeTitle);
      }
    }
  });

  // Agrupar por categoría
  const grouped: Record<'produce' | 'meat' | 'dairy' | 'pantry' | 'other', ConsolidatedItem[]> = {
    produce: [],
    meat: [],
    dairy: [],
    pantry: [],
    other: [],
  };

  Object.values(map).forEach((item) => {
    // Redondear a 2 decimales para evitar problemas de precisión flotante (ej 1.9999999)
    item.amount = Math.round((item.amount + Number.EPSILON) * 100) / 100;
    grouped[item.category].push(item);
  });

  return grouped;
}


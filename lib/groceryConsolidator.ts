import { Recipe } from '../types';
import { translateIngredientName } from './culinaryDictionary';

export interface ConsolidatedItem {
  key: string;
  name_es: string;
  name_en: string;
  amount: number;
  unit: string;
  category: 'produce' | 'meat' | 'dairy' | 'pantry' | 'other';
  recipes: string[];
}

export const CATEGORY_NAMES = {
  produce: { es: 'Frutas y Verduras', en: 'Produce & Vegetables' },
  meat: { es: 'Carnes y Proteínas', en: 'Meats & Proteins' },
  dairy: { es: 'Lácteos y Refrigerados', en: 'Dairy & Refrigerated' },
  pantry: { es: 'Despensa y Granos', en: 'Pantry & Grains' },
  other: { es: 'Otros Artículos', en: 'Other Items' },
};

// Normalizar nombres para unificar variaciones como "Huevo", "huevos", "huevo fresco"
export function normalizeIngredientKey(name: string): string {
  let normalized = (name || '').toLowerCase().trim();
  
  // Quitar tildes y caracteres especiales
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Reglas de unificación de plurales y sinónimos
  if (normalized.includes('huevo')) return 'huevo';
  if (normalized.includes('pechuga') || normalized.includes('pollo')) return 'pollo_pechuga';
  if (normalized.includes('tomate')) return 'tomate';
  if (normalized.includes('cebolla morada')) return 'cebolla_morada';
  if (normalized.includes('cebolla')) return 'cebolla';
  if (normalized.includes('ajo')) return 'ajo';
  if (normalized.includes('papa')) return 'papa';
  if (normalized.includes('zapallo') || normalized.includes('calabaza')) return 'zapallo';
  if (normalized.includes('avena') || normalized.includes('harina de avena')) return 'harina_avena';
  if (normalized.includes('atun')) return 'atun';
  if (normalized.includes('queso crema')) return 'queso_crema';
  if (normalized.includes('mussarela') || normalized.includes('mozzarella') || normalized.includes('muzzarella')) return 'queso_mozzarella';
  if (normalized.includes('queso')) return 'queso';
  if (normalized.includes('yogurt') || normalized.includes('yogur')) return 'yogur';
  if (normalized.includes('sal')) return 'sal';
  if (normalized.includes('pimienta')) return 'pimienta';
  if (normalized.includes('oregano')) return 'oregano';
  if (normalized.includes('paprika') || normalized.includes('pimenton')) return 'paprika';
  if (normalized.includes('aceite')) return 'aceite_oliva';

  return normalized;
}

// Clasificación automática de pasillo de supermercado
export function detectAisle(name: string): 'produce' | 'meat' | 'dairy' | 'pantry' | 'other' {
  const norm = (name || '').toLowerCase();
  
  if (
    norm.includes('tomate') || norm.includes('cebolla') || norm.includes('ajo') ||
    norm.includes('papa') || norm.includes('zapallo') || norm.includes('zanahoria') ||
    norm.includes('espinaca') || norm.includes('lechuga') || norm.includes('limon') ||
    norm.includes('palta') || norm.includes('aguacate') || norm.includes('champignon') ||
    norm.includes('setas') || norm.includes('cilantro') || norm.includes('perejil')
  ) {
    return 'produce';
  }

  if (
    norm.includes('pollo') || norm.includes('pechuga') || norm.includes('carne') ||
    norm.includes('atun') || norm.includes('salmon') || norm.includes('pescado') ||
    norm.includes('tofu')
  ) {
    return 'meat';
  }

  if (
    norm.includes('huevo') || norm.includes('leche') || norm.includes('queso') ||
    norm.includes('yogur') || norm.includes('yogurt') || norm.includes('manteca') ||
    norm.includes('mantequilla') || norm.includes('crema')
  ) {
    return 'dairy';
  }

  return 'pantry';
}

// Consolidación y suma matemática de ingredientes
export function consolidateIngredients(
  recipes: Recipe[],
  lang: 'ES' | 'EN' = 'ES'
): Record<'produce' | 'meat' | 'dairy' | 'pantry' | 'other', ConsolidatedItem[]> {
  const map: Record<string, ConsolidatedItem> = {};

  recipes.forEach((recipe) => {
    const recipeTitle = lang === 'ES' ? recipe.title_es : recipe.title_en || recipe.title_es;
    const ingredients = recipe.ingredients || [];

    ingredients.forEach((ing) => {
      const key = normalizeIngredientKey(ing.name_es || ing.name_en || '');
      const parsedAmount = Number(ing.amount) || 0;
      const unit = ing.unit ? ing.unit.trim() : '';

      if (!map[key]) {
        map[key] = {
          key,
          name_es: ing.name_es || ing.name_en,
          name_en: ing.name_en || ing.name_es,
          amount: parsedAmount,
          unit: unit,
          category: detectAisle(ing.name_es || ing.name_en),
          recipes: [recipeTitle],
        };
      } else {
        // Sumar si la unidad coincide o si no hay unidad
        map[key].amount += parsedAmount;
        if (!map[key].recipes.includes(recipeTitle)) {
          map[key].recipes.push(recipeTitle);
        }
      }
    });
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
    grouped[item.category].push(item);
  });

  return grouped;
}

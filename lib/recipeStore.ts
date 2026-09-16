/**
 * @file recipeStore.ts
 * @description Capa de caché de lectura rápida (Mirror de Supabase) en el navegador.
 * Supabase es la ÚNICA fuente de la verdad para recetas e ingredientes de todos los usuarios.
 * localStorage se utiliza exclusivamente como caché de lectura temporal para garantizar
 * tiempos de renderizado de 0 ms en el inicio de la app sin parpadeos, pero NUNCA crea
 * recetas fantasmas locales ni sobrescribe datos de Supabase.
 */

import { Recipe, Ingredient, NutritionInfo } from '../app/types';

/** Clave de localStorage para el espejo de recetas canónicas de Supabase */
const SUPABASE_CACHE_KEY = 'pulse_cook_supabase_cache_v4';

/** Clave de localStorage para el mapa de ingredientes en caché { [recipeId]: Ingredient[] } */
const INGREDIENTS_STORAGE_KEY = 'pulse_cook_ingredients_cache_v4';

/** Claves obsoletas de versiones previas que causaban desincronización entre usuarios */
const LEGACY_STORAGE_KEYS = [
  'pulse_cook_local_recipes_v3',
  'pulse_cook_local_recipes_v2',
  'pulse_cook_local_ingredients_v3',
  'pulse_cook_local_ingredients_v2',
];

/** Conjunto de identificadores de recetas de prueba que deben ser excluidas permanentemente */
const DEMO_IDS = new Set(['rec_1', 'rec_2', 'rec_3', 'rec_4', '1', '2', '3', '4']);

/**
 * Purga de manera estricta todas las claves obsoletas que guardaban recetas offline
 * o que provocaban que un teléfono sobrescribiera los datos de la nube con versiones locales.
 */
export function clearAllLocalRecipeOverrides(): void {
  if (typeof window === 'undefined') return;
  try {
    LEGACY_STORAGE_KEYS.forEach((k) => {
      localStorage.removeItem(k);
    });
  } catch (err) {
    console.warn('[recipeStore] Error limpiando claves heredadas:', err);
  }
}

/**
 * Guarda el espejo de recetas de Supabase en caché local de solo lectura
 */
export function saveCachedSupabaseRecipes(recipes: Recipe[]): void {
  if (typeof window === 'undefined') return;
  try {
    const validRecipes = (recipes || []).filter((r) => !DEMO_IDS.has(r.id));
    localStorage.setItem(SUPABASE_CACHE_KEY, JSON.stringify(validRecipes));
  } catch (err) {
    console.warn('[recipeStore] Quota de localStorage al guardar caché:', err);
  }
}

/**
 * Obtiene las recetas en caché local (espejo de Supabase) para render instantáneo.
 *
 * @returns {Recipe[]} Lista de recetas válidas de Supabase en caché.
 */
export function getLocalRecipes(): Recipe[] {
  if (typeof window === 'undefined') return [];

  try {
    // 1. Purgar claves heredadas conflictivas
    clearAllLocalRecipeOverrides();

    // 2. Leer espejo canónico de Supabase
    const raw = localStorage.getItem(SUPABASE_CACHE_KEY);
    if (!raw) return [];

    const parsed: Recipe[] = JSON.parse(raw);
    return parsed.filter((r) => !DEMO_IDS.has(r.id));
  } catch (err) {
    console.warn('Error reading cached recipes:', err);
    return [];
  }
}

/**
 * Normaliza un título para comparaciones seguras de deduplicación
 */
export function normalizeRecipeTitle(title?: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Reconciliación: Asegura que el cliente use estrictamente las recetas de Supabase.
 * Purgará cualquier residuo local que no provenga de la base de datos remota.
 */
export function reconcileLocalRecipesWithRemote(remoteRecipes: Recipe[]): Recipe[] {
  if (typeof window === 'undefined') return remoteRecipes || [];
  clearAllLocalRecipeOverrides();
  saveCachedSupabaseRecipes(remoteRecipes);
  return remoteRecipes;
}

/**
 * Actualiza una receta en la caché local tras una mutación exitosa en Supabase
 */
export function saveLocalRecipe(recipe: Recipe, ingredients?: Ingredient[]): Recipe[] {
  if (typeof window === 'undefined') return [];

  try {
    const cached: Recipe[] = getLocalRecipes();
    const existingIndex = cached.findIndex((r) => r.id === recipe.id);

    let updated: Recipe[];
    if (existingIndex >= 0) {
      updated = [...cached];
      updated[existingIndex] = recipe;
    } else {
      updated = [recipe, ...cached];
    }

    saveCachedSupabaseRecipes(updated);

    if (ingredients && ingredients.length > 0) {
      saveLocalIngredients(recipe.id, ingredients);
    }

    return updated;
  } catch (err) {
    console.warn('Error saving to cached recipes:', err);
    return getLocalRecipes();
  }
}

/**
 * Elimina una receta de la caché local
 */
export function deleteLocalRecipe(recipeId: string): Recipe[] {
  if (typeof window === 'undefined') return [];

  try {
    const customRecipes: Recipe[] = getLocalRecipes();
    const filtered = customRecipes.filter((r) => r.id !== recipeId);
    saveCachedSupabaseRecipes(filtered);
    deleteLocalIngredients(recipeId);
    deleteCachedNutrition(recipeId);
    return filtered;
  } catch (err) {
    console.warn('Error deleting local recipe:', err);
    return [];
  }
}

/**
 * Elimina los ingredientes guardados para una receta
 */
export function deleteLocalIngredients(recipeId: string) {
  if (typeof window === 'undefined') return;

  try {
    const allIngredientsMap: Record<string, Ingredient[]> = JSON.parse(
      localStorage.getItem(INGREDIENTS_STORAGE_KEY) || '{}'
    );
    delete allIngredientsMap[recipeId];
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(allIngredientsMap));
  } catch (err) {
    console.warn('Error deleting local ingredients:', err);
  }
}

/**
 * Obtiene los ingredientes guardados para una receta
 */
export function getLocalIngredients(recipeId: string): Ingredient[] {
  if (typeof window === 'undefined') return [];

  try {
    const allIngredientsMap: Record<string, Ingredient[]> = JSON.parse(
      localStorage.getItem(INGREDIENTS_STORAGE_KEY) || '{}'
    );

    if (allIngredientsMap[recipeId] && allIngredientsMap[recipeId].length > 0) {
      return allIngredientsMap[recipeId];
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Guarda los ingredientes de una receta
 */
export function saveLocalIngredients(recipeId: string, ingredients: Ingredient[]) {
  if (typeof window === 'undefined') return;

  try {
    const allIngredientsMap: Record<string, Ingredient[]> = JSON.parse(
      localStorage.getItem(INGREDIENTS_STORAGE_KEY) || '{}'
    );
    allIngredientsMap[recipeId] = ingredients;
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(allIngredientsMap));
  } catch (err) {
    console.warn('Error saving local ingredients:', err);
  }
}

/**
 * Guarda múltiples recetas e ingredientes en un solo acceso a localStorage (alto rendimiento)
 */
export function batchSaveLocalIngredients(map: Record<string, Ingredient[]>) {
  if (typeof window === 'undefined' || !map || Object.keys(map).length === 0) return;

  try {
    const allIngredientsMap: Record<string, Ingredient[]> = JSON.parse(
      localStorage.getItem(INGREDIENTS_STORAGE_KEY) || '{}'
    );
    Object.assign(allIngredientsMap, map);
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(allIngredientsMap));
  } catch (err) {
    console.warn('Error batch saving local ingredients:', err);
  }
}

/** Clave de localStorage para la caché de información nutricional { [recipeId]: NutritionInfo } */
const NUTRITION_STORAGE_KEY = 'pulse_cook_nutrition_cache_v2';

/**
 * Obtiene la información nutricional en caché de una receta
 */
export function getCachedNutrition(recipeId: string): NutritionInfo | null {
  if (typeof window === 'undefined' || !recipeId) return null;

  try {
    const raw = localStorage.getItem(NUTRITION_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[recipeId] || null;
  } catch {
    return null;
  }
}

/**
 * Guarda la información nutricional en la caché local de una receta
 */
export function saveCachedNutrition(recipeId: string, nutrition: NutritionInfo): void {
  if (typeof window === 'undefined' || !recipeId || !nutrition) return;

  try {
    const raw = localStorage.getItem(NUTRITION_STORAGE_KEY);
    const map: Record<string, NutritionInfo> = raw ? JSON.parse(raw) : {};
    map[recipeId] = nutrition;
    localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Error saving cached nutrition:', err);
  }
}

/**
 * Elimina la información nutricional en caché de una receta
 */
export function deleteCachedNutrition(recipeId: string): void {
  if (typeof window === 'undefined' || !recipeId) return;

  try {
    const raw = localStorage.getItem(NUTRITION_STORAGE_KEY);
    if (!raw) return;
    const map: Record<string, NutritionInfo> = JSON.parse(raw);
    if (map[recipeId]) {
      delete map[recipeId];
      localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(map));
    }
  } catch (err) {
    console.warn('Error deleting cached nutrition:', err);
  }
}


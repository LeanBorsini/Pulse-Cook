/**
 * @file recipeStore.ts
 * @description Capa de persistencia local (Offline-First) en el navegador usando localStorage.
 * Permite guardar, recuperar, actualizar y eliminar recetas e ingredientes asociados
 * sin depender de conexión a internet o de la disponibilidad de Supabase.
 *
 * Incluye lógica de migración para esquemas v2 -> v3 y purga estricta de recetas demo.
 */

import { Recipe, Ingredient } from '../app/types';

/** Clave de localStorage para el arreglo principal de recetas del usuario */
const RECIPES_STORAGE_KEY = 'pulse_cook_local_recipes_v3';

/** Clave de localStorage para el mapa de ingredientes { [recipeId]: Ingredient[] } */
const INGREDIENTS_STORAGE_KEY = 'pulse_cook_local_ingredients_v3';

/** Clave heredada de versiones previas para facilitar la migración automática */
const LEGACY_STORAGE_KEY = 'pulse_cook_local_recipes_v2';

/** Conjunto de identificadores de recetas de prueba que deben ser excluidas permanentemente */
const DEMO_IDS = new Set(['rec_1', 'rec_2', 'rec_3', 'rec_4', '1', '2', '3', '4']);

/**
 * Obtiene todas las recetas guardadas localmente por el usuario.
 * Realiza migración transparente desde esquemas anteriores y filtra demos.
 *
 * @returns {Recipe[]} Lista de recetas locales válidas del usuario.
 */
export function getLocalRecipes(): Recipe[] {
  if (typeof window === 'undefined') return [];

  try {
    // 1. Obtener datos locales
    let raw = localStorage.getItem(RECIPES_STORAGE_KEY);
    if (!raw) {
      // Migrar desde versión anterior si existe, filtrando demos
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const parsedLegacy: Recipe[] = JSON.parse(legacyRaw);
        const cleanedLegacy = parsedLegacy.filter((r) => !DEMO_IDS.has(r.id));
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(cleanedLegacy));
        raw = JSON.stringify(cleanedLegacy);
      }
    }

    if (!raw) return [];

    const customRecipes: Recipe[] = JSON.parse(raw);
    // Filtrar estrictamente cualquier receta de prueba
    const validRecipes = customRecipes.filter((r) => !DEMO_IDS.has(r.id));
    
    if (validRecipes.length !== customRecipes.length) {
      localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(validRecipes));
    }

    return validRecipes;
  } catch (err) {
    console.warn('Error reading local recipes:', err);
    return [];
  }
}

/**
 * Guarda o actualiza una receta en el almacenamiento local
 */
export function saveLocalRecipe(recipe: Recipe, ingredients?: Ingredient[]): Recipe[] {
  if (typeof window === 'undefined') return [];

  try {
    const customRecipes: Recipe[] = getLocalRecipes();
    const existingIndex = customRecipes.findIndex((r) => r.id === recipe.id);

    let updated: Recipe[];
    if (existingIndex >= 0) {
      updated = [...customRecipes];
      updated[existingIndex] = recipe;
    } else {
      updated = [recipe, ...customRecipes];
    }

    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updated));

    // Guardar ingredientes asociados si se proveen
    if (ingredients && ingredients.length > 0) {
      saveLocalIngredients(recipe.id, ingredients);
    }

    return updated;
  } catch (err) {
    console.warn('Error saving local recipe:', err);
    return getLocalRecipes();
  }
}

/**
 * Elimina una receta localmente
 */
export function deleteLocalRecipe(recipeId: string): Recipe[] {
  if (typeof window === 'undefined') return [];

  try {
    const customRecipes: Recipe[] = getLocalRecipes();
    const filtered = customRecipes.filter((r) => r.id !== recipeId);
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.warn('Error deleting local recipe:', err);
    return [];
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

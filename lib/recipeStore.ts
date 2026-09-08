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
    
    // Deduplicar automáticamente recetas con el mismo título normalizado, prefiriendo siempre UUID de Supabase
    const seenTitles = new Map<string, Recipe>();
    const deduplicated: Recipe[] = [];

    validRecipes.forEach((r) => {
      const normTitle = normalizeRecipeTitle(r.title_es) || r.id;
      const existing = seenTitles.get(normTitle);
      if (!existing) {
        seenTitles.set(normTitle, r);
        deduplicated.push(r);
      } else {
        const isCurrentUuid = r.id.length === 36 && r.id.includes('-');
        const isExistingUuid = existing.id.length === 36 && existing.id.includes('-');
        if (isCurrentUuid && !isExistingUuid) {
          const idx = deduplicated.findIndex((item) => item.id === existing.id);
          if (idx >= 0) {
            deleteLocalIngredients(existing.id);
            deduplicated[idx] = r;
            seenTitles.set(normTitle, r);
          }
        }
      }
    });

    if (deduplicated.length !== customRecipes.length) {
      localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(deduplicated));
    }

    return deduplicated;
  } catch (err) {
    console.warn('Error reading local recipes:', err);
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
 * Reconcilia recetas locales con recetas remotas de Supabase.
 * Detecta si una receta local temporal (con ID que comienza por 'user_', 'rec_', 'local_', o no-UUID)
 * ya existe en Supabase (mismo título normalizado).
 * Si existe: purga la versión local huérfana de localStorage y migra ingredientes si aplica.
 */
export function reconcileLocalRecipesWithRemote(remoteRecipes: Recipe[]): Recipe[] {
  if (typeof window === 'undefined') return [];
  const localRecipes = getLocalRecipes();
  if (localRecipes.length === 0 || remoteRecipes.length === 0) return localRecipes;

  const remoteTitlesMap = new Map<string, Recipe>();
  remoteRecipes.forEach((r) => {
    const normEs = normalizeRecipeTitle(r.title_es);
    const normEn = normalizeRecipeTitle(r.title_en);
    if (normEs) remoteTitlesMap.set(normEs, r);
    if (normEn) remoteTitlesMap.set(normEn, r);
  });

  const remainingLocal: Recipe[] = [];
  let purgedAny = false;

  localRecipes.forEach((local) => {
    // Si la receta local ya tiene exactamente el mismo ID que una remota, se preserva
    if (remoteRecipes.some((r) => r.id === local.id)) {
      remainingLocal.push(local);
      return;
    }

    // Identificar si tiene un ID temporal generado en el cliente
    const isTempId =
      local.id.startsWith('user_') ||
      local.id.startsWith('local_') ||
      local.id.startsWith('rec_') ||
      !local.id.includes('-');

    const normEs = normalizeRecipeTitle(local.title_es);
    const normEn = normalizeRecipeTitle(local.title_en);
    const matchingRemote =
      (normEs ? remoteTitlesMap.get(normEs) : null) ||
      (normEn ? remoteTitlesMap.get(normEn) : null);

    if (isTempId && matchingRemote) {
      // Es un duplicado temporal que ya se subió a Supabase con éxito.
      // Migrar ingredientes locales al ID remoto si el remoto aún no los tiene en caché local
      const localIngs = getLocalIngredients(local.id);
      if (localIngs.length > 0) {
        const remoteIngs = getLocalIngredients(matchingRemote.id);
        if (remoteIngs.length === 0) {
          saveLocalIngredients(matchingRemote.id, localIngs);
        }
      }
      deleteLocalRecipe(local.id);
      purgedAny = true;
    } else {
      remainingLocal.push(local);
    }
  });

  if (purgedAny) {
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(remainingLocal));
  }

  return remainingLocal;
}

/**
 * Guarda o actualiza una receta en el almacenamiento local
 */
export function saveLocalRecipe(recipe: Recipe, ingredients?: Ingredient[]): Recipe[] {
  if (typeof window === 'undefined') return [];

  try {
    const customRecipes: Recipe[] = getLocalRecipes();
    // 1. Buscar coincidencia exacta por ID
    let existingIndex = customRecipes.findIndex((r) => r.id === recipe.id);

    // 2. Si no coincide por ID pero es el mismo título normalizado del mismo autor/receta, actualizarla
    if (existingIndex === -1 && recipe.title_es) {
      const normTitle = normalizeRecipeTitle(recipe.title_es);
      existingIndex = customRecipes.findIndex(
        (r) => normalizeRecipeTitle(r.title_es) === normTitle
      );
    }

    let updated: Recipe[];
    if (existingIndex >= 0) {
      const oldId = customRecipes[existingIndex].id;
      // Si el ID cambió (ej. de temp user_ a UUID de Supabase), limpiar el viejo
      if (oldId !== recipe.id) {
        deleteLocalIngredients(oldId);
      }
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
    deleteLocalIngredients(recipeId);
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

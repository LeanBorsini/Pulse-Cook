import { supabase } from './supabase';

const RATINGS_STORAGE_KEY = 'pulse_cook_ratings_v2';
const CLIENT_ID_KEY = 'pulse_cook_client_id';

export interface RatingRecord {
  recipeId: string;
  userId: string;
  stars: number;
  updatedAt: string;
}

export interface RecipeRatingSummary {
  userRating: number;
  avgRating?: number;
  ratingsCount: number;
}

/**
 * Genera o recupera un identificador único persistente para este cliente o dispositivo.
 */
export function getPersistentClientId(authUserId?: string | null): string {
  if (authUserId) return authUserId;
  if (typeof window === 'undefined') return 'server_client';

  try {
    let clientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
      clientId = 'dev_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(CLIENT_ID_KEY, clientId);
    }
    return clientId;
  } catch {
    return 'fallback_client';
  }
}

/**
 * Obtiene todas las valoraciones guardadas localmente en este navegador.
 */
export function getAllLocalRatings(): RatingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RATINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Obtiene la calificación que este usuario o dispositivo otorgó a una receta.
 */
export function getLocalUserRating(recipeId: string, authUserId?: string | null): number {
  const all = getAllLocalRatings();
  const effectiveUserId = getPersistentClientId(authUserId);

  if (authUserId) {
    const matchAuth = all.find((r) => r.recipeId === recipeId && r.userId === authUserId);
    if (matchAuth) return matchAuth.stars;
  }

  const matchClient = all.find((r) => r.recipeId === recipeId && r.userId === effectiveUserId);
  if (matchClient) return matchClient.stars;

  const matchRecipe = all.find((r) => r.recipeId === recipeId);
  return matchRecipe ? matchRecipe.stars : 0;
}

/**
 * Guarda o actualiza la calificación del usuario para una receta en localStorage.
 * Permite volver a tocar para cambiar el voto, actualizando el promedio y manteniendo el recuento.
 */
export function saveLocalRating(
  recipeId: string,
  stars: number,
  authUserId?: string | null
): RecipeRatingSummary {
  if (typeof window === 'undefined') {
    return { userRating: stars, avgRating: stars, ratingsCount: 1 };
  }

  const effectiveUserId = getPersistentClientId(authUserId);
  const all = getAllLocalRatings();

  const existingIndex = all.findIndex(
    (r) =>
      r.recipeId === recipeId &&
      (r.userId === effectiveUserId || (authUserId && r.userId === authUserId))
  );

  if (existingIndex >= 0) {
    all[existingIndex].stars = stars;
    all[existingIndex].userId = effectiveUserId;
    all[existingIndex].updatedAt = new Date().toISOString();
  } else {
    all.push({
      recipeId,
      userId: effectiveUserId,
      stars,
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('Error saving ratings to localStorage:', err);
  }

  const recipeRatings = all.filter((r) => r.recipeId === recipeId);
  const count = recipeRatings.length;
  const sum = recipeRatings.reduce((acc, r) => acc + r.stars, 0);
  const avg = count > 0 ? Number((sum / count).toFixed(1)) : stars;

  return {
    userRating: stars,
    avgRating: avg,
    ratingsCount: count,
  };
}

/**
 * Obtiene el resumen de calificación consolidado para una receta.
 */
export function getConsolidatedRating(
  recipeId: string,
  baseAvg?: number,
  baseCount?: number,
  authUserId?: string | null
): RecipeRatingSummary {
  const all = getAllLocalRatings();
  const effectiveUserId = getPersistentClientId(authUserId);

  let userRating = 0;
  if (authUserId) {
    const matchAuth = all.find((r) => r.recipeId === recipeId && r.userId === authUserId);
    if (matchAuth) userRating = matchAuth.stars;
  }
  if (!userRating) {
    const matchClient = all.find((r) => r.recipeId === recipeId && r.userId === effectiveUserId);
    if (matchClient) userRating = matchClient.stars;
  }
  if (!userRating) {
    const matchRecipe = all.find((r) => r.recipeId === recipeId);
    if (matchRecipe) userRating = matchRecipe.stars;
  }

  const recipeRatings = all.filter((r) => r.recipeId === recipeId);
  const localCount = recipeRatings.length;

  if (localCount === 0) {
    return {
      userRating: 0,
      avgRating: baseAvg,
      ratingsCount: baseCount || 0,
    };
  }

  const localSum = recipeRatings.reduce((acc, r) => acc + r.stars, 0);
  const count = Math.max(baseCount || 0, localCount);
  const avg = count > 0 ? Number((localSum / localCount).toFixed(1)) : baseAvg;

  return {
    userRating,
    avgRating: avg || baseAvg,
    ratingsCount: count,
  };
}

/**
 * Sincroniza la calificación del usuario en Supabase.
 */
export async function syncRatingToSupabase(
  recipeId: string,
  stars: number,
  authUserId?: string | null
): Promise<void> {
  const effectiveUserId = getPersistentClientId(authUserId);
  const ratingTag = `__rating__:${effectiveUserId}`;
  const ratingMsg = `[RATING:${stars}]`;

  try {
    const { data: existing } = await supabase
      .from('comments')
      .select('id')
      .eq('recipe_id', recipeId)
      .eq('user_name', ratingTag)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('comments')
        .update({
          message: ratingMsg,
          created_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);
    } else {
      await supabase.from('comments').insert([
        {
          recipe_id: recipeId,
          user_name: ratingTag,
          message: ratingMsg,
        },
      ]);
    }
  } catch (err) {
    console.warn('Supabase rating sync note:', err);
  }
}

/**
 * Obtiene todas las valoraciones registradas en Supabase por la comunidad.
 */
export async function fetchCommunityRatings(): Promise<
  Map<string, { userId: string; stars: number }[]>
> {
  const ratingsMap = new Map<string, { userId: string; stars: number }[]>();

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('recipe_id, user_name, message')
      .like('user_name', '__rating__:%');

    if (error || !data) return ratingsMap;

    data.forEach((row) => {
      if (!row.recipe_id || !row.user_name || !row.message) return;
      const match = row.message.match(/\[RATING:(\d+)\]/);
      if (match) {
        const stars = parseInt(match[1], 10);
        if (stars >= 1 && stars <= 5) {
          const userId = row.user_name.replace('__rating__:', '');
          const list = ratingsMap.get(row.recipe_id) || [];
          const existingIdx = list.findIndex((x) => x.userId === userId);
          if (existingIdx >= 0) {
            list[existingIdx].stars = stars;
          } else {
            list.push({ userId, stars });
          }
          ratingsMap.set(row.recipe_id, list);
        }
      }
    });
  } catch (err) {
    console.warn('Error fetching community ratings:', err);
  }

  return ratingsMap;
}

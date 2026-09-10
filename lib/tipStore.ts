import { ChefTip, TipExperience } from '@/app/types';
import { supabase } from './supabase';
import { INITIAL_CHEF_TIPS, AUTHOR_LEAN_BORSINI } from './chefTipsData';
import { getPersistentClientId } from './ratingStore';

const TIPS_STORAGE_KEY = 'pulse_cook_chef_tips_v1';
const TIP_LIKES_KEY = 'pulse_cook_tip_likes_v1';
const TIP_RATINGS_KEY = 'pulse_cook_tip_ratings_v1';
const TIP_EXPERIENCES_KEY = 'pulse_cook_tip_experiences_v1';

export const LEAN_BORSINI_ID = AUTHOR_LEAN_BORSINI.id;

/**
 * Determina si el usuario actual tiene permisos para editar o eliminar un tip.
 * El autor original o el creador principal `leanBorsini` tienen permisos de gestión.
 */
export function canManageTip(
  tip: ChefTip,
  user: { id?: string; email?: string } | null
): boolean {
  if (!user) return false;
  if (user.id === LEAN_BORSINI_ID || user.email === 'leoborsini12@gmail.com') return true;
  if (tip.author_id && tip.author_id === user.id) return true;
  return false;
}

/**
 * Obtiene los tips almacenados localmente en localStorage (combinando con iniciales).
 */
export function getLocalTips(): ChefTip[] {
  if (typeof window === 'undefined') return INITIAL_CHEF_TIPS;

  try {
    const raw = localStorage.getItem(TIPS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(INITIAL_CHEF_TIPS));
      return INITIAL_CHEF_TIPS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_CHEF_TIPS;
  } catch (err) {
    console.warn('Error reading local tips:', err);
    return INITIAL_CHEF_TIPS;
  }
}

/**
 * Guarda la lista de tips en localStorage.
 */
export function saveLocalTips(tips: ChefTip[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(tips));
  } catch (err) {
    console.warn('Error saving local tips:', err);
  }
}

/**
 * Obtiene el mapa de likes otorgados por el usuario localmente.
 */
export function getLocalTipLikes(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TIP_LIKES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Obtiene las valoraciones individuales de estrellas dadas a tips localmente.
 */
export function getLocalTipRatings(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TIP_RATINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Carga los tips combinando Supabase (si la tabla existe) y el almacenamiento local.
 */
export async function fetchTipsWithSync(authUserId?: string | null): Promise<ChefTip[]> {
  const localTips = getLocalTips();
  const localLikes = getLocalTipLikes();
  const localRatings = getLocalTipRatings();

  let remoteTips: ChefTip[] = [];

  try {
    // Intentar leer de Supabase
    const { data, error } = await supabase
      .from('chef_tips')
      .select('*, profiles(id, username, avatar_url)')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      remoteTips = data.map((row) => ({
        id: row.id,
        author_id: row.author_id || row.user_id,
        profiles: row.profiles || null,
        author_username: row.profiles?.username || row.author_username || 'Chef',
        title_es: row.title_es,
        title_en: row.title_en || row.title_es,
        summary_es: row.summary_es,
        summary_en: row.summary_en || row.summary_es,
        content_es: row.content_es || row.summary_es,
        content_en: row.content_en || row.summary_en || row.content_es,
        category: row.category,
        image_url: row.image_url,
        read_time_seconds: row.read_time_seconds || 45,
        likes_count: row.likes_count ?? 0,
        avg_rating: row.avg_rating ?? 5.0,
        ratings_count: row.ratings_count ?? 1,
        created_at: row.created_at,
      }));

      // Si el usuario está autenticado, sincronizar sus likes remotos
      if (authUserId) {
        try {
          const { data: userLikesData } = await supabase
            .from('tip_likes')
            .select('tip_id')
            .eq('user_id', authUserId);
          if (userLikesData) {
            userLikesData.forEach((row) => {
              localLikes[row.tip_id] = true;
            });
          }
        } catch {
          // Si la tabla no existe aún, ignorar
        }
      }
    }
  } catch {
    // Si la tabla no existe aún en Supabase, se utilizan los tips locales sin errores
  }

  // Base canónica: si hay remotos los combinamos con los locales (sin duplicados)
  const masterList = remoteTips.length > 0 ? [...remoteTips] : [...localTips];

  if (remoteTips.length > 0) {
    // Añadir tips locales que aún no hayan sincronizado remotamente
    localTips.forEach((loc) => {
      const exists = masterList.some((m) => m.id === loc.id || m.title_es === loc.title_es);
      if (!exists) {
        masterList.push(loc);
      }
    });
  }

  // Enriquecer con el estado de like y rating del usuario actual
  const enriched = masterList.map((tip) => {
    const userLiked = Boolean(localLikes[tip.id]);
    const userRating = localRatings[tip.id] || 0;
    return {
      ...tip,
      user_liked: userLiked,
      user_rating: userRating,
    };
  });

  saveLocalTips(enriched);
  return enriched;
}

/**
 * Guarda o actualiza un tip (en Supabase si está disponible y en localStorage).
 */
export async function saveChefTip(
  tipData: Partial<ChefTip>,
  user: { id?: string; email?: string } | null,
  profileUsername?: string | null
): Promise<ChefTip> {
  const localTips = getLocalTips();
  const isEditing = Boolean(tipData.id && localTips.some((t) => t.id === tipData.id));

  let finalId = tipData.id || `tip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const authorId = tipData.author_id || user?.id || LEAN_BORSINI_ID;
  const authorName =
    profileUsername ||
    (user?.id === LEAN_BORSINI_ID ? 'leanBorsini' : user?.email?.split('@')[0] || 'Chef');

  const payload: ChefTip = {
    id: finalId,
    author_id: authorId,
    author_username: authorName,
    profiles: {
      id: authorId,
      username: authorName,
      avatar_url: AUTHOR_LEAN_BORSINI.avatar_url,
    },
    title_es: tipData.title_es || 'Nuevo Tip',
    title_en: tipData.title_en || tipData.title_es || 'New Tip',
    summary_es: tipData.summary_es || '',
    summary_en: tipData.summary_en || tipData.summary_es || '',
    content_es: tipData.content_es || tipData.summary_es || '',
    content_en: tipData.content_en || tipData.summary_en || tipData.content_es || '',
    category: tipData.category || 'organization',
    image_url: tipData.image_url || '',
    read_time_seconds: tipData.read_time_seconds || 45,
    likes_count: tipData.likes_count ?? 0,
    avg_rating: tipData.avg_rating ?? 5.0,
    ratings_count: tipData.ratings_count ?? 1,
    created_at: tipData.created_at || new Date().toISOString(),
  };

  // 1. Intentar sincronizar con Supabase si el usuario está autenticado
  if (user) {
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('chef_tips')
          .update({
            title_es: payload.title_es,
            title_en: payload.title_en,
            summary_es: payload.summary_es,
            summary_en: payload.summary_en,
            content_es: payload.content_es,
            content_en: payload.content_en,
            category: payload.category,
            image_url: payload.image_url,
            read_time_seconds: payload.read_time_seconds,
          })
          .eq('id', payload.id);
        if (error) console.warn('Supabase tip update note:', error.message);
      } else {
        // Enviar author_id y user_id para compatibilidad total con cualquier esquema
        const insertData: Record<string, unknown> = {
          author_id: user.id,
          user_id: user.id,
          title_es: payload.title_es,
          title_en: payload.title_en,
          summary_es: payload.summary_es,
          summary_en: payload.summary_en,
          content_es: payload.content_es,
          content_en: payload.content_en,
          category: payload.category,
          image_url: payload.image_url,
          read_time_seconds: payload.read_time_seconds,
          likes_count: 0,
        };

        let { data: supaTip, error } = await supabase
          .from('chef_tips')
          .insert([insertData])
          .select()
          .single();

        // Fallback si la tabla solo tiene author_id o solo user_id
        if (error && error.code === '42703') {
          if (error.message.includes('user_id')) {
            delete insertData.user_id;
          } else if (error.message.includes('author_id')) {
            delete insertData.author_id;
          }
          const retry = await supabase
            .from('chef_tips')
            .insert([insertData])
            .select()
            .single();
          supaTip = retry.data;
          error = retry.error;
        }

        if (!error && supaTip) {
          finalId = supaTip.id;
          payload.id = supaTip.id;
        }
      }
    } catch (err) {
      console.warn('Chef tip remote sync note:', err);
    }
  }

  // 2. Guardar en almacenamiento local
  const updatedList = isEditing
    ? localTips.map((t) => (t.id === finalId ? { ...t, ...payload } : t))
    : [payload, ...localTips];

  saveLocalTips(updatedList);
  return payload;
}

/**
 * Elimina un tip de chef (en Supabase y localmente).
 */
export async function deleteChefTip(
  tipId: string,
  user: { id?: string; email?: string } | null
): Promise<void> {
  // 1. Eliminar localmente
  const localTips = getLocalTips();
  const filtered = localTips.filter((t) => t.id !== tipId);
  saveLocalTips(filtered);

  // 2. Intentar eliminar en Supabase
  if (user) {
    try {
      await supabase.from('chef_tips').delete().eq('id', tipId);
    } catch (err) {
      console.warn('Supabase delete tip note:', err);
    }
  }
}

/**
 * Alterna el 'like' (utilidad) de un tip.
 */
export async function toggleTipLike(
  tipId: string,
  authUserId?: string | null
): Promise<{ likesCount: number; userLiked: boolean }> {
  const localTips = getLocalTips();
  const localLikes = getLocalTipLikes();
  const isCurrentlyLiked = Boolean(localLikes[tipId]);
  const newLikedState = !isCurrentlyLiked;

  // Actualizar estado de like en mapa local
  localLikes[tipId] = newLikedState;
  try {
    localStorage.setItem(TIP_LIKES_KEY, JSON.stringify(localLikes));
  } catch {}

  let newCount = 0;
  const updatedTips = localTips.map((tip) => {
    if (tip.id === tipId) {
      newCount = Math.max(0, (tip.likes_count || 0) + (newLikedState ? 1 : -1));
      return {
        ...tip,
        likes_count: newCount,
        user_liked: newLikedState,
      };
    }
    return tip;
  });

  saveLocalTips(updatedTips);

  // Sincronizar en Supabase si es posible
  const effectiveUser = getPersistentClientId(authUserId);
  try {
    if (newLikedState) {
      await supabase.from('tip_likes').upsert(
        { tip_id: tipId, user_id: authUserId || effectiveUser },
        { onConflict: 'tip_id,user_id' }
      );
    } else {
      await supabase
        .from('tip_likes')
        .delete()
        .eq('tip_id', tipId)
        .eq('user_id', authUserId || effectiveUser);
    }
    // Actualizar conteo en chef_tips si la columna existe
    await supabase.from('chef_tips').update({ likes_count: newCount }).eq('id', tipId);
  } catch {}

  return { likesCount: newCount, userLiked: newLikedState };
}

/**
 * Registra una valoración de estrellas (1-5) para un tip.
 */
export async function rateChefTip(
  tipId: string,
  stars: number,
  authUserId?: string | null
): Promise<{ avgRating: number; ratingsCount: number; userRating: number }> {
  const localTips = getLocalTips();
  const localRatings = getLocalTipRatings();
  localRatings[tipId] = stars;

  try {
    localStorage.setItem(TIP_RATINGS_KEY, JSON.stringify(localRatings));
  } catch {}

  let finalAvg = stars;
  let finalCount = 1;

  const updatedTips = localTips.map((tip) => {
    if (tip.id === tipId) {
      const currentCount = tip.ratings_count || 1;
      const currentAvg = tip.avg_rating || 5.0;
      const hadPreviousRating = Boolean(tip.user_rating);

      let newCount = currentCount;
      let newAvg = currentAvg;

      if (hadPreviousRating) {
        // Actualizar promedio ajustando el valor previo
        const prevRating = tip.user_rating || currentAvg;
        newAvg = Number(
          Math.max(1, (currentAvg * currentCount - prevRating + stars) / currentCount).toFixed(1)
        );
      } else {
        newCount = currentCount + 1;
        newAvg = Number(((currentAvg * currentCount + stars) / newCount).toFixed(1));
      }

      finalAvg = newAvg;
      finalCount = newCount;

      return {
        ...tip,
        avg_rating: newAvg,
        ratings_count: newCount,
        user_rating: stars,
      };
    }
    return tip;
  });

  saveLocalTips(updatedTips);

  // Intentar sincronizar en Supabase
  const effectiveUser = getPersistentClientId(authUserId);
  try {
    await supabase.from('tip_ratings').upsert(
      {
        tip_id: tipId,
        user_id: authUserId || effectiveUser,
        stars,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'tip_id,user_id' }
    );
  } catch {}

  return { avgRating: finalAvg, ratingsCount: finalCount, userRating: stars };
}

/**
 * Obtiene la lista de comentarios / experiencias sobre un tip.
 */
export async function getTipExperiences(tipId: string): Promise<TipExperience[]> {
  let localList: TipExperience[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${TIP_EXPERIENCES_KEY}_${tipId}`);
      if (raw) localList = JSON.parse(raw);
    } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('tip_experiences')
      .select('*')
      .eq('tip_id', tipId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const remoteList: TipExperience[] = data.map((row) => ({
        id: row.id,
        tip_id: row.tip_id,
        user_id: row.user_id,
        author_name: row.author_name || 'Cocinero casero',
        avatar_url: row.avatar_url,
        comment: row.comment,
        photo_url: row.photo_url,
        created_at: row.created_at,
      }));

      // Combinar sin duplicados
      const merged = [...remoteList];
      localList.forEach((loc) => {
        if (!merged.some((m) => m.id === loc.id)) {
          merged.push(loc);
        }
      });
      return merged;
    }
  } catch {}

  return localList;
}

/**
 * Añade un nuevo comentario o experiencia comunitaria a un tip.
 */
export async function addTipExperience(
  tipId: string,
  comment: string,
  photoUrl: string | undefined,
  user: { id?: string; email?: string } | null,
  authorName: string
): Promise<TipExperience> {
  const newExp: TipExperience = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tip_id: tipId,
    user_id: user?.id,
    author_name: authorName || 'Cocinero de casa',
    avatar_url: user?.id === LEAN_BORSINI_ID ? AUTHOR_LEAN_BORSINI.avatar_url : undefined,
    comment,
    photo_url: photoUrl,
    created_at: new Date().toISOString(),
  };

  // 1. Guardar localmente
  if (typeof window !== 'undefined') {
    try {
      const key = `${TIP_EXPERIENCES_KEY}_${tipId}`;
      const raw = localStorage.getItem(key);
      const list: TipExperience[] = raw ? JSON.parse(raw) : [];
      list.unshift(newExp);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  }

  // 2. Intentar guardar en Supabase
  try {
    const { data: supaExp, error } = await supabase
      .from('tip_experiences')
      .insert([
        {
          tip_id: tipId,
          user_id: user?.id || null,
          author_name: newExp.author_name,
          avatar_url: newExp.avatar_url,
          comment: newExp.comment,
          photo_url: newExp.photo_url,
        },
      ])
      .select()
      .single();

    if (!error && supaExp) {
      newExp.id = supaExp.id;
    }
  } catch (err) {
    console.warn('Tip experience sync note:', err);
  }

  return newExp;
}

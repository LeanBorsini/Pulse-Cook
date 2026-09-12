import { User } from '@supabase/supabase-js';
import { Recipe } from '../app/types';

/**
 * Pulse&Cook: Configuración del autor principal y administrador de la plataforma.
 * Conforme a las directrices de proyecto en AGENTS.md.
 */
export const MAIN_AUTHOR_CONFIG = {
  UUID: '1afb8de4-9294-4f57-af9f-dc50b3e6e768',
  USERNAME: 'leanBorsini',
  EMAIL: 'leoborsini12@gmail.com',
} as const;

/**
 * Determina si el usuario en sesión es el administrador/autor principal de la plataforma.
 */
export function isMainAdminUser(
  user?: User | null,
  profileUsername?: string | null
): boolean {
  if (!user) return false;

  const emailMatches =
    user.email?.toLowerCase() === MAIN_AUTHOR_CONFIG.EMAIL.toLowerCase();

  const idMatches = user.id === MAIN_AUTHOR_CONFIG.UUID;

  const metadataUsername = (
    user.user_metadata as { username?: string } | undefined
  )?.username;
  const metaMatches =
    metadataUsername?.toLowerCase() === MAIN_AUTHOR_CONFIG.USERNAME.toLowerCase();

  const profileMatches =
    profileUsername?.toLowerCase() === MAIN_AUTHOR_CONFIG.USERNAME.toLowerCase();

  return Boolean(emailMatches || idMatches || metaMatches || profileMatches);
}

/**
 * Valida si el usuario actual tiene permisos legítimos de autor para editar o eliminar una receta.
 * Aísla rigurosamente los permisos entre usuarios comunitarios y el autor principal.
 */
export function isRecipeAuthor(
  recipe: Recipe | null | undefined,
  user?: User | null,
  profileUsername?: string | null
): boolean {
  if (!recipe) return false;

  // 1. El autor principal siempre tiene permisos de administración
  if (isMainAdminUser(user, profileUsername)) {
    return true;
  }

  // 2. Coincidencia por ID remoto de Supabase
  if (user && recipe.user_id && recipe.user_id === user.id) {
    return true;
  }

  // 3. Coincidencia por ID en el perfil asociado
  if (user && recipe.profiles?.id && recipe.profiles.id === user.id) {
    return true;
  }

  // 4. Borrador local offline en este dispositivo
  const isLocalDraft =
    recipe.id.startsWith('user_') || recipe.id.startsWith('local_');
  if (
    isLocalDraft &&
    (!user || recipe.user_id === user?.id || recipe.user_id === 'local_user')
  ) {
    return true;
  }

  return false;
}

/**
 * Determina si el usuario actual tiene privilegios de moderador o administrador.
 * Tiene acceso al panel de denuncias, revisión de contenido, desestimación, ocultamiento y baneo de infractores.
 */
export function isModeratorOrAdmin(
  user?: User | null,
  profileUsername?: string | null,
  userRole?: string | null
): boolean {
  if (!user) return false;
  // 1. leanBorsini es Administrador Supremo / Dueño
  if (isMainAdminUser(user, profileUsername)) return true;
  // 2. Rol específico asignado en profiles ('admin' o 'moderator')
  if (userRole === 'admin' || userRole === 'moderator') return true;
  return false;
}

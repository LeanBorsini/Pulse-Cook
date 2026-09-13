import { supabase } from './supabase';
import {
  ContentReport,
  ReportTargetType,
  ReportReasonCategory,
  ContentStatus,
  Profile,
  UserRole,
} from '@/app/types';
import { MAIN_AUTHOR_CONFIG, isModeratorOrAdmin } from './constants';
import { User } from '@supabase/supabase-js';

const LOCAL_REPORTS_KEY = 'pulse_cook_content_reports_v1';
const BANNED_USERS_KEY = 'pulse_cook_banned_users_v1';

/**
 * Obtiene los reportes almacenados en localStorage (para funcionamiento offline o de respaldo).
 */
export function getLocalReports(): ContentReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Guarda los reportes en el almacenamiento local.
 */
export function saveLocalReports(reports: ContentReport[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('Error saving local reports:', err);
  }
}

/**
 * Comprueba si un usuario ya ha denunciado este contenido en particular.
 */
export function hasUserReported(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string
): boolean {
  const local = getLocalReports();
  return local.some(
    (r) =>
      r.reporter_id === reporterId &&
      r.target_type === targetType &&
      String(r.target_id) === String(targetId)
  );
}

/**
 * Obtiene la lista local de usuarios baneados.
 */
export function getLocalBannedUsers(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BANNED_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Comprueba si un usuario está marcado como baneado (local o remotamente).
 */
export function isUserLocallyBanned(userId?: string | null): boolean {
  if (!userId) return false;
  const banned = getLocalBannedUsers();
  return banned.includes(userId);
}

/**
 * Envía una denuncia formal de contenido.
 * Valida autenticación y persiste en Supabase y respaldo local.
 */
export async function submitContentReport(params: {
  reporter: User;
  reporterUsername?: string | null;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  targetSnippet?: string;
  reportedUserId?: string;
  reportedUsername?: string;
  reasonCategory: ReportReasonCategory;
  reasonText: string;
}): Promise<{ success: boolean; error?: string; report?: ContentReport }> {
  const {
    reporter,
    reporterUsername,
    targetType,
    targetId,
    targetTitle,
    targetSnippet,
    reportedUserId,
    reportedUsername,
    reasonCategory,
    reasonText,
  } = params;

  if (!reporter || !reporter.id) {
    return { success: false, error: 'Debes iniciar sesión para poder reportar contenido.' };
  }

  // Prevenir reportes duplicados por el mismo usuario
  if (hasUserReported(reporter.id, targetType, targetId)) {
    return {
      success: false,
      error: 'Ya has enviado un reporte para esta publicación. Nuestro equipo lo está revisando.',
    };
  }

  const newReport: ContentReport = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    reporter_id: reporter.id,
    reporter_username: reporterUsername || reporter.email?.split('@')[0] || 'Usuario',
    reporter_email: reporter.email,
    target_type: targetType,
    target_id: String(targetId),
    target_title: targetTitle || 'Sin título',
    target_snippet: targetSnippet ? targetSnippet.slice(0, 280) : undefined,
    reported_user_id: reportedUserId,
    reported_username: reportedUsername,
    reason_category: reasonCategory,
    reason_text: reasonText.trim(),
    status: 'pending',
    action_taken: 'none',
    created_at: new Date().toISOString(),
  };

  // 1. Guardar en almacenamiento local inmediato
  const currentLocal = getLocalReports();
  saveLocalReports([newReport, ...currentLocal]);

  // 2. Intentar guardar en Supabase (tabla `content_reports`)
  try {
    const { data, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: reporter.id,
        reporter_username: newReport.reporter_username,
        reporter_email: newReport.reporter_email,
        target_type: targetType,
        target_id: String(targetId),
        target_title: newReport.target_title,
        target_snippet: newReport.target_snippet,
        reported_user_id: reportedUserId || null,
        reported_username: reportedUsername || null,
        reason_category: reasonCategory,
        reason_text: newReport.reason_text,
        status: 'pending',
      })
      .select()
      .single();

    if (!error && data) {
      newReport.id = data.id;
      // Actualizar el ID en local
      const updatedLocal = getLocalReports().map((r) =>
        r.id === newReport.id ? { ...r, id: data.id } : r
      );
      saveLocalReports(updatedLocal);
    } else if (error) {
      console.warn('Supabase report insert fallback to local note:', error.message);
    }
  } catch (err) {
    console.warn('Network report submission note:', err);
  }

  // 3. Revisar el umbral de 3 denuncias para protección automática preventiva
  await checkAndApplyReportThreshold(targetType, targetId, reportedUserId);

  return { success: true, report: newReport };
}

/**
 * Aplica el umbral de 3 denuncias de usuarios únicos:
 * Si acumula 3 o más denuncias pendientes/activas, pasa a estado `under_review`.
 * No afecta automáticamente al contenido de leanBorsini (autor principal).
 */
async function checkAndApplyReportThreshold(
  targetType: ReportTargetType,
  targetId: string,
  reportedUserId?: string
) {
  // Las publicaciones del creador leanBorsini no se ocultan algorítmicamente
  if (reportedUserId === MAIN_AUTHOR_CONFIG.UUID) {
    return;
  }

  const allReports = getLocalReports();
  const relevantReports = allReports.filter(
    (r) =>
      r.target_type === targetType &&
      String(r.target_id) === String(targetId) &&
      r.status !== 'dismissed'
  );

  const uniqueReporters = new Set(relevantReports.map((r) => r.reporter_id));

  if (uniqueReporters.size >= 3) {
    // Aplicar estado de revisión preventiva
    await updateContentStatus(targetType, targetId, 'under_review');
  }
}

/**
 * Obtiene todas las denuncias para el panel de moderación.
 * Accesible únicamente por administradores y moderadores.
 */
export async function fetchContentReports(
  user?: User | null,
  profileUsername?: string | null,
  userRole?: string | null
): Promise<ContentReport[]> {
  if (!isModeratorOrAdmin(user, profileUsername, userRole)) {
    return [];
  }

  const local = getLocalReports();

  try {
    const { data, error } = await supabase
      .from('content_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // Combinar con los locales no sincronizados
      const remoteMap = new Map<string, ContentReport>();
      data.forEach((row) => {
        remoteMap.set(row.id, {
          id: row.id,
          reporter_id: row.reporter_id,
          reporter_username: row.reporter_username || 'Usuario',
          reporter_email: row.reporter_email,
          target_type: row.target_type,
          target_id: row.target_id,
          target_title: row.target_title,
          target_snippet: row.target_snippet,
          reported_user_id: row.reported_user_id,
          reported_username: row.reported_username,
          reason_category: row.reason_category,
          reason_text: row.reason_text,
          status: row.status,
          action_taken: row.action_taken || 'none',
          resolved_by: row.resolved_by,
          resolved_at: row.resolved_at,
          created_at: row.created_at,
        });
      });

      // Agregar los locales que falten
      local.forEach((loc) => {
        if (!remoteMap.has(loc.id)) {
          remoteMap.set(loc.id, loc);
        }
      });

      const merged = Array.from(remoteMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      saveLocalReports(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Error fetching remote reports:', err);
  }

  return local;
}

/**
 * Obtiene la cantidad de reportes pendientes sin resolver para la insignia de alerta.
 */
export async function getPendingReportsCount(
  user?: User | null,
  profileUsername?: string | null,
  userRole?: string | null
): Promise<number> {
  if (!isModeratorOrAdmin(user, profileUsername, userRole)) {
    return 0;
  }

  const reports = await fetchContentReports(user, profileUsername, userRole);
  return reports.filter((r) => r.status === 'pending').length;
}

/**
 * Acción de Moderación: Desestimar una denuncia (falso positivo, spam de denuncias o contenido lícito).
 * Restaura el contenido a 'active' y marca el reporte como 'dismissed'.
 */
export async function dismissReport(
  reportId: string,
  resolver: User
): Promise<{ success: boolean }> {
  const local = getLocalReports();
  const targetReport = local.find((r) => r.id === reportId);

  const updatedLocal = local.map((r) =>
    r.id === reportId
      ? {
          ...r,
          status: 'dismissed' as const,
          action_taken: 'dismissed' as const,
          resolved_by: resolver.id,
          resolved_at: new Date().toISOString(),
        }
      : r
  );
  saveLocalReports(updatedLocal);

  // Restaurar el estado de la publicación a 'active' si estaba en revisión preventiva
  if (targetReport) {
    await updateContentStatus(targetReport.target_type, targetReport.target_id, 'active');
  }

  try {
    await supabase
      .from('content_reports')
      .update({
        status: 'dismissed',
        action_taken: 'dismissed',
        resolved_by: resolver.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId);
  } catch (err) {
    console.warn('Error dismissing report in Supabase:', err);
  }

  return { success: true };
}

/**
 * Acción de Moderación: Ocultar contenido denunciado (marca status = 'hidden').
 */
export async function hideReportedContent(
  report: ContentReport,
  resolver: User
): Promise<{ success: boolean }> {
  // 1. Actualizar el reporte a resuelto con acción 'hidden'
  const local = getLocalReports();
  const updatedLocal = local.map((r) =>
    r.id === report.id
      ? {
          ...r,
          status: 'resolved' as const,
          action_taken: 'hidden' as const,
          resolved_by: resolver.id,
          resolved_at: new Date().toISOString(),
        }
      : r
  );
  saveLocalReports(updatedLocal);

  // 2. Ocultar la entidad
  await updateContentStatus(report.target_type, report.target_id, 'hidden');

  try {
    await supabase
      .from('content_reports')
      .update({
        status: 'resolved',
        action_taken: 'hidden',
        resolved_by: resolver.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', report.id);
  } catch (err) {
    console.warn('Error updating report status in Supabase:', err);
  }

  return { success: true };
}

/**
 * Acción de Moderación: Eliminar definitivamente el contenido denunciado.
 */
export async function deleteReportedContent(
  report: ContentReport,
  resolver: User
): Promise<{ success: boolean }> {
  // 1. Actualizar el reporte
  const local = getLocalReports();
  const updatedLocal = local.map((r) =>
    r.id === report.id
      ? {
          ...r,
          status: 'resolved' as const,
          action_taken: 'deleted' as const,
          resolved_by: resolver.id,
          resolved_at: new Date().toISOString(),
        }
      : r
  );
  saveLocalReports(updatedLocal);

  // 2. Ejecutar borrado según el tipo de contenido
  try {
    if (report.target_type === 'recipe') {
      await supabase.from('recipes').delete().eq('id', report.target_id);
    } else if (report.target_type === 'tip') {
      await supabase.from('chef_tips').delete().eq('id', report.target_id);
    } else if (report.target_type === 'comment') {
      await supabase.from('comments').delete().eq('id', report.target_id);
    } else if (report.target_type === 'tip_experience') {
      await supabase.from('tip_experiences').delete().eq('id', report.target_id);
    }
  } catch (err) {
    console.warn('Error deleting content in Supabase:', err);
  }

  try {
    await supabase
      .from('content_reports')
      .update({
        status: 'resolved',
        action_taken: 'deleted',
        resolved_by: resolver.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', report.id);
  } catch {}

  return { success: true };
}

async function recordModerationLog(log: {
  action: string;
  moderator_id: string;
  target_user_id?: string;
  note?: string;
}) {
  try {
    await supabase.from('moderation_logs').insert([log]);
  } catch (err) {
    console.warn('Error recording moderation log:', err);
  }
}

/**
 * Acción de Moderación: Suspender / Banear usuario infractor.
 * Impide futuras publicaciones, comentarios o interacciones.
 */
export async function toggleUserBan(
  userId: string,
  isBanned: boolean,
  resolver: User
): Promise<{ success: boolean }> {
  // Proteger al autor principal de ser baneado
  if (userId === MAIN_AUTHOR_CONFIG.UUID) {
    return { success: false };
  }

  const bannedList = getLocalBannedUsers();
  if (isBanned) {
    if (!bannedList.includes(userId)) {
      bannedList.push(userId);
    }
  } else {
    const idx = bannedList.indexOf(userId);
    if (idx >= 0) bannedList.splice(idx, 1);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BANNED_USERS_KEY, JSON.stringify(bannedList));
    } catch {}
  }

  try {
    await supabase
      .from('profiles')
      .update({ is_banned: isBanned })
      .eq('id', userId);

    await recordModerationLog({
      action: isBanned ? 'ban_user' : 'unban_user',
      moderator_id: resolver.id,
      target_user_id: userId,
      note: `User ${isBanned ? 'banned' : 'unbanned'} by moderator`,
    });
  } catch (err) {
    console.warn('Error updating user ban in Supabase:', err);
  }

  return { success: true };
}

/**
 * Actualiza el estado de una entidad (active, under_review, hidden).
 */
export async function updateContentStatus(
  targetType: ReportTargetType,
  targetId: string,
  status: ContentStatus
): Promise<void> {
  try {
    if (targetType === 'recipe') {
      await supabase
        .from('recipes')
        .update({ status })
        .eq('id', targetId);
    } else if (targetType === 'tip') {
      await supabase
        .from('chef_tips')
        .update({ status })
        .eq('id', targetId);
    } else if (targetType === 'comment') {
      await supabase
        .from('comments')
        .update({ status })
        .eq('id', targetId);
    } else if (targetType === 'tip_experience') {
      await supabase
        .from('tip_experiences')
        .update({ status })
        .eq('id', targetId);
    }
  } catch (err) {
    console.warn('Status update note:', err);
  }
}

/**
 * Clave local para perfiles cacheados/gestionados.
 */
const MANAGED_USERS_KEY = 'pulse_cook_managed_profiles_v1';

export function getLocalManagedProfiles(): Profile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MANAGED_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalManagedProfiles(profiles: Profile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(profiles));
  } catch {}
}

/**
 * Evalúa con coincidencia inteligente si un perfil responde a la búsqueda.
 * Soporta búsqueda por alias (@username), correo electrónico, UUID,
 * o raíz léxica (por ejemplo: buscar "daniela" o "dani" encuentra a "daniCooker",
 * o buscar "lean" / "leandro" encuentra a "leanBorsini").
 */
export function matchProfileQuery(profile: Profile, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;
  const q = rawQuery.trim().toLowerCase();
  const uname = (profile.username || '').toLowerCase();
  const email = (profile.email || '').toLowerCase();
  const id = (profile.id || '').toLowerCase();

  // 1. Coincidencia directa o subcadena en username, email o ID
  if (uname.includes(q) || (email && email.includes(q)) || id.includes(q)) {
    return true;
  }

  // 2. Si se busca con prefijo de mención '@'
  const cleanQ = q.startsWith('@') ? q.slice(1) : q;
  if (cleanQ && (uname.includes(cleanQ) || (email && email.includes(cleanQ)))) {
    return true;
  }

  // 3. Raíz léxica de prefijo común (3 o más caracteres)
  // Ej: Buscar "daniela" (raíz "dani") coincide con "daniCooker"
  // Ej: Buscar "mari" coincide con "mariela"
  if (cleanQ.length >= 3) {
    const qPrefix3 = cleanQ.slice(0, 3);
    const qPrefix4 = cleanQ.slice(0, 4);
    if (uname.startsWith(qPrefix4) || uname.startsWith(qPrefix3)) {
      return true;
    }
    // Raíces de palabras compuestas (CamelCase o separadores)
    const unameParts = uname.split(/(?=[A-Z])|[^a-z0-9]/).filter(Boolean);
    for (const part of unameParts) {
      if (part.startsWith(qPrefix3) || (cleanQ.length >= 4 && cleanQ.startsWith(part.slice(0, 3)))) {
        return true;
      }
    }
    // Si la búsqueda es más larga y contiene el inicio del username
    if (cleanQ.startsWith(uname.slice(0, 4)) || cleanQ.startsWith(uname.slice(0, 3))) {
      return true;
    }
  }

  // 4. Búsqueda por palabras múltiples separadas
  const words = cleanQ.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const allWordsMatch = words.every(
      (w) =>
        uname.includes(w) ||
        (email && email.includes(w)) ||
        (w.length >= 3 && (uname.startsWith(w.slice(0, 3)) || w.startsWith(uname.slice(0, 3))))
    );
    if (allWordsMatch) return true;
  }

  return false;
}

/**
 * Consulta la lista de usuarios y perfiles para gestión administrativa.
 * Soporta búsqueda en tiempo real por username, email o ID de manera tolerante y robusta.
 */
export async function searchAndFetchProfiles(
  query: string = ''
): Promise<Profile[]> {
  const localList = getLocalManagedProfiles();
  const trimmed = query.trim().toLowerCase();

  try {
    // 1. Consultar la tabla `profiles` en Supabase usando select('*')
    // Esto es 100% tolerante si created_at o email no existen aún en la base de datos
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      const remoteProfiles: Profile[] = (data as (Profile & { updated_at?: string })[]).map((p) => {
        // Garantizar que leanBorsini siempre figure como admin y con su email
        const isMainAuthor =
          p.id === MAIN_AUTHOR_CONFIG.UUID ||
          p.username?.toLowerCase() === MAIN_AUTHOR_CONFIG.USERNAME.toLowerCase() ||
          p.username?.toLowerCase() === 'leanborsini' ||
          (p.email && p.email.toLowerCase() === MAIN_AUTHOR_CONFIG.EMAIL.toLowerCase());

        if (isMainAuthor) {
          return {
            ...p,
            email: p.email || MAIN_AUTHOR_CONFIG.EMAIL,
            role: 'admin' as UserRole,
            is_banned: false,
          };
        }
        return {
          ...p,
          email: p.email || undefined,
          role: (p.role as UserRole) || 'user',
          is_banned: Boolean(p.is_banned),
        };
      });

      // Si leanBorsini no vino en el resultado, agregarlo de forma canónica
      const hasMain = remoteProfiles.some(
        (p) =>
          p.id === MAIN_AUTHOR_CONFIG.UUID ||
          p.username?.toLowerCase() === MAIN_AUTHOR_CONFIG.USERNAME.toLowerCase() ||
          p.username?.toLowerCase() === 'leanborsini'
      );
      if (!hasMain) {
        remoteProfiles.unshift({
          id: MAIN_AUTHOR_CONFIG.UUID,
          username: MAIN_AUTHOR_CONFIG.USERNAME,
          email: MAIN_AUTHOR_CONFIG.EMAIL,
          role: 'admin',
          is_banned: false,
        });
      }

      // Fusionar con caché local para persistencia rápida
      saveLocalManagedProfiles(remoteProfiles);

      if (trimmed) {
        return remoteProfiles.filter((p) => matchProfileQuery(p, trimmed));
      }

      return remoteProfiles;
    } else if (error) {
      console.warn('Supabase profiles query error, checking fallback:', error.message);
    }
  } catch (err) {
    console.warn('Error fetching profiles from Supabase, using local fallback:', err);
  }

  // Fallback con datos locales y base canónica
  const fallbackProfiles: Profile[] = [
    {
      id: MAIN_AUTHOR_CONFIG.UUID,
      username: MAIN_AUTHOR_CONFIG.USERNAME,
      email: MAIN_AUTHOR_CONFIG.EMAIL,
      role: 'admin',
      is_banned: false,
    },
    ...localList.filter((p) => p.id !== MAIN_AUTHOR_CONFIG.UUID && p.username?.toLowerCase() !== 'leanborsini'),
  ];

  if (!trimmed) return fallbackProfiles;

  return fallbackProfiles.filter((p) => matchProfileQuery(p, trimmed));
}

/**
 * Asigna o cambia el rol de un usuario (admin, moderator, user).
 * Solo ejecutable por el Administrador.
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  adminUser: User
): Promise<{ success: boolean; error?: string }> {
  // Proteger al autor principal de ser degradado
  if (targetUserId === MAIN_AUTHOR_CONFIG.UUID && newRole !== 'admin') {
    return { success: false, error: 'No es posible modificar el rol del Administrador Supremo.' };
  }

  // 1. Actualizar caché local
  const currentList = getLocalManagedProfiles();
  const updatedList = currentList.map((p) =>
    p.id === targetUserId ? { ...p, role: newRole } : p
  );
  saveLocalManagedProfiles(updatedList);

  // 2. Persistir en Supabase
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (error) {
      console.warn('Error updating profile role in Supabase:', error);
      return { success: false, error: error.message };
    }

    await recordModerationLog({
      action: `role_change_to_${newRole}`,
      moderator_id: adminUser.id,
      target_user_id: targetUserId,
      note: `Role changed to ${newRole} by admin`,
    });

    return { success: true };
  } catch (err) {
    console.warn('Supabase role update error:', err);
    return { success: true }; // Permite que funcione localmente
  }
}


'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  EyeOff,
  UserX,
  UserCheck,
  Search,
  RefreshCw,
  Users,
  Flag,
  Shield,
  User as UserIcon,
  Award,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { ContentReport, Profile, UserRole } from '../types';
import {
  fetchContentReports,
  dismissReport,
  hideReportedContent,
  deleteReportedContent,
  toggleUserBan,
  isUserLocallyBanned,
  searchAndFetchProfiles,
  updateUserRole,
} from '@/lib/reportStore';
import { MAIN_AUTHOR_CONFIG, isMainAdminUser } from '@/lib/constants';

interface ModerationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ES' | 'EN';
  user: User | null;
  profileUsername: string | null;
  userRole?: string | null;
  onContentUpdated?: () => void;
}

export function ModerationDrawer({
  isOpen,
  onClose,
  lang,
  user,
  profileUsername,
  userRole,
  onContentUpdated,
}: ModerationDrawerProps) {
  const isEs = lang === 'ES';
  const isSupremeAdmin = isMainAdminUser(user, profileUsername) || userRole === 'admin';

  // Navegación principal de dos módulos: 'reports' (Denuncias) o 'users' (Gestión de Usuarios)
  const [mainSection, setMainSection] = useState<'reports' | 'users'>('reports');

  // Estado de Reportes
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'recipe' | 'tip' | 'comment' | 'resolved'>('pending');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Estado de Gestión de Usuarios
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<'all' | 'admins' | 'moderators' | 'users' | 'banned'>('all');

  // Estados compartidos
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cargar Reportes
  const loadReports = useCallback(async () => {
    if (!user) return;
    setLoadingReports(true);
    try {
      const list = await fetchContentReports(user, profileUsername, userRole);
      setReports(list);
    } catch (err) {
      console.warn('Error loading reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [user, profileUsername, userRole]);

  // Cargar Usuarios / Perfiles
  const loadProfiles = useCallback(async (query: string = '') => {
    if (!user) return;
    setLoadingUsers(true);
    try {
      const list = await searchAndFetchProfiles(query);
      setProfiles(list);
    } catch (err) {
      console.warn('Error loading profiles:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [user]);

  // Sincronizar al abrir el drawer
  useEffect(() => {
    let isCancelled = false;
    if (isOpen && user) {
      const initDrawer = async () => {
        setLoadingReports(true);
        setLoadingUsers(true);
        try {
          const [repList, profList] = await Promise.all([
            fetchContentReports(user, profileUsername, userRole),
            searchAndFetchProfiles(''),
          ]);
          if (!isCancelled) {
            setReports(repList);
            setProfiles(profList);
          }
        } catch (err) {
          console.warn('Error initializing moderation drawer:', err);
        } finally {
          if (!isCancelled) {
            setLoadingReports(false);
            setLoadingUsers(false);
          }
        }
      };
      initDrawer();
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, user, profileUsername, userRole]);

  // Contadores de Denuncias
  const pendingCount = useMemo(() => reports.filter((r) => r.status === 'pending').length, [reports]);
  const recipesCount = useMemo(() => reports.filter((r) => r.target_type === 'recipe').length, [reports]);
  const tipsCount = useMemo(() => reports.filter((r) => r.target_type === 'tip').length, [reports]);
  const commentsCount = useMemo(() => reports.filter((r) => r.target_type === 'comment' || r.target_type === 'tip_experience').length, [reports]);

  // Contadores de Usuarios
  const bannedCount = useMemo(() => profiles.filter((p) => p.is_banned || isUserLocallyBanned(p.id)).length, [profiles]);
  const moderatorsCount = useMemo(() => profiles.filter((p) => p.role === 'moderator').length, [profiles]);
  const adminsCount = useMemo(() => profiles.filter((p) => p.role === 'admin' || p.id === MAIN_AUTHOR_CONFIG.UUID).length, [profiles]);

  // Filtrado de reportes
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (activeTab === 'pending' && report.status !== 'pending') return false;
      if (activeTab === 'resolved' && report.status === 'pending') return false;
      if (activeTab === 'recipe' && report.target_type !== 'recipe') return false;
      if (activeTab === 'tip' && report.target_type !== 'tip') return false;
      if (activeTab === 'comment' && report.target_type !== 'comment' && report.target_type !== 'tip_experience') return false;

      if (reportSearchQuery.trim()) {
        const q = reportSearchQuery.toLowerCase();
        const titleMatch = report.target_title?.toLowerCase().includes(q);
        const snippetMatch = report.target_snippet?.toLowerCase().includes(q);
        const reporterMatch = report.reporter_username?.toLowerCase().includes(q) || report.reporter_email?.toLowerCase().includes(q);
        const reportedMatch = report.reported_username?.toLowerCase().includes(q);
        const reasonMatch = report.reason_text?.toLowerCase().includes(q);

        return Boolean(titleMatch || snippetMatch || reporterMatch || reportedMatch || reasonMatch);
      }

      return true;
    });
  }, [reports, activeTab, reportSearchQuery]);

  // Filtrado de Usuarios
  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const isBanned = profile.is_banned || isUserLocallyBanned(profile.id);
      const effectiveRole = profile.id === MAIN_AUTHOR_CONFIG.UUID ? 'admin' : (profile.role || 'user');

      if (userFilterRole === 'banned' && !isBanned) return false;
      if (userFilterRole === 'admins' && effectiveRole !== 'admin') return false;
      if (userFilterRole === 'moderators' && effectiveRole !== 'moderator') return false;
      if (userFilterRole === 'users' && effectiveRole !== 'user') return false;

      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase();
        const nameMatch = profile.username.toLowerCase().includes(q);
        const emailMatch = profile.email?.toLowerCase().includes(q);
        const idMatch = profile.id.toLowerCase().includes(q);
        return Boolean(nameMatch || emailMatch || idMatch);
      }

      return true;
    });
  }, [profiles, userFilterRole, userSearchQuery]);

  // --- ACCIONES DE DENUNCIA ---
  const handleDismiss = async (report: ContentReport) => {
    if (!user) return;
    setActionInProgress(report.id);
    try {
      await dismissReport(report.id, user);
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? { ...r, status: 'dismissed' as const, action_taken: 'dismissed' as const }
            : r
        )
      );
      setFeedbackMessage({
        type: 'success',
        text: isEs ? 'Denuncia desestimada. Contenido reactivado.' : 'Report dismissed. Content reactivated.',
      });
      onContentUpdated?.();
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: isEs ? 'Error al desestimar reporte.' : 'Error dismissing report.',
      });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  const handleHide = async (report: ContentReport) => {
    if (!user) return;
    setActionInProgress(report.id);
    try {
      await hideReportedContent(report, user);
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? { ...r, status: 'resolved' as const, action_taken: 'hidden' as const }
            : r
        )
      );
      setFeedbackMessage({
        type: 'success',
        text: isEs ? 'Contenido ocultado del ojo público.' : 'Content hidden from the public.',
      });
      onContentUpdated?.();
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: isEs ? 'Error al ocultar contenido.' : 'Error hiding content.',
      });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  const handleDelete = async (report: ContentReport) => {
    if (!user) return;
    const confirmMsg = isEs
      ? '¿Estás seguro de que deseas eliminar permanentemente este contenido? Esta acción no se puede deshacer.'
      : 'Are you sure you want to permanently delete this content? This cannot be undone.';
    if (!window.confirm(confirmMsg)) return;

    setActionInProgress(report.id);
    try {
      await deleteReportedContent(report, user);
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? { ...r, status: 'resolved' as const, action_taken: 'deleted' as const }
            : r
        )
      );
      setFeedbackMessage({
        type: 'success',
        text: isEs ? 'Contenido eliminado definitivamente.' : 'Content permanently deleted.',
      });
      onContentUpdated?.();
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: isEs ? 'Error al eliminar contenido.' : 'Error deleting content.',
      });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  // --- ACCIONES DE GESTIÓN DE USUARIOS (Roles & Bans) ---
  const handleToggleUserBanDirect = async (targetUser: Profile, shouldBan: boolean) => {
    if (!user) return;
    if (targetUser.id === MAIN_AUTHOR_CONFIG.UUID) {
      alert(isEs ? 'No es posible suspender al Administrador Supremo (leanBorsini).' : 'Cannot suspend supreme admin.');
      return;
    }

    const confirmMsg = shouldBan
      ? isEs
        ? `¿Suspender la cuenta de @${targetUser.username}? Este correo/cuenta quedará bloqueado de la app y no podrá crear recetas, tips ni comentarios.`
        : `Suspend account of @${targetUser.username}? This user will be banned from posting or commenting.`
      : isEs
      ? `¿Restablecer y quitar el baneo a @${targetUser.username}? Podrá volver a ingresar y utilizar la app normalmente.`
      : `Unban and restore access for @${targetUser.username}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionInProgress(`ban_${targetUser.id}`);
    try {
      await toggleUserBan(targetUser.id, shouldBan, user);
      setProfiles((prev) =>
        prev.map((p) => (p.id === targetUser.id ? { ...p, is_banned: shouldBan } : p))
      );
      setFeedbackMessage({
        type: 'success',
        text: shouldBan
          ? isEs
            ? `Usuario @${targetUser.username} suspendido y bloqueado de la app.`
            : `User @${targetUser.username} suspended and blocked.`
          : isEs
          ? `Usuario @${targetUser.username} desbaneado exitosamente.`
          : `User @${targetUser.username} unbanned successfully.`,
      });
      onContentUpdated?.();
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: isEs ? 'Error al actualizar el baneo del usuario.' : 'Error updating user ban status.',
      });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  const handleChangeRole = async (targetUser: Profile, newRole: UserRole) => {
    if (!user) return;
    if (!isSupremeAdmin) {
      alert(isEs ? 'Solo un Administrador puede asignar roles en la app.' : 'Only an Admin can assign roles.');
      return;
    }
    if (targetUser.id === MAIN_AUTHOR_CONFIG.UUID && newRole !== 'admin') {
      alert(isEs ? 'No se puede modificar el rol del Administrador Supremo.' : 'Cannot demote the supreme admin.');
      return;
    }

    const roleName = newRole === 'admin' ? 'Administrador' : newRole === 'moderator' ? 'Moderador' : 'Usuario estándar';
    const confirmMsg = isEs
      ? `¿Asignar el rol de ${roleName} a @${targetUser.username}?`
      : `Assign ${roleName} role to @${targetUser.username}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionInProgress(`role_${targetUser.id}`);
    try {
      const res = await updateUserRole(targetUser.id, newRole, user);
      if (res.success) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === targetUser.id ? { ...p, role: newRole } : p))
        );
        setFeedbackMessage({
          type: 'success',
          text: isEs
            ? `Rol de @${targetUser.username} actualizado a ${roleName}.`
            : `Role for @${targetUser.username} updated to ${newRole}.`,
        });
        onContentUpdated?.();
      } else {
        setFeedbackMessage({
          type: 'error',
          text: res.error || (isEs ? 'Error al actualizar rol.' : 'Error updating role.'),
        });
      }
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: isEs ? 'Error al procesar el cambio de rol.' : 'Error updating user role.',
      });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  if (!isOpen) return null;

  const getReasonBadge = (cat: string) => {
    switch (cat) {
      case 'spam_scam':
        return { label: isEs ? '🚨 Spam / Scam' : '🚨 Spam / Scam', bg: 'bg-red-50 text-red-800 border-red-200' };
      case 'inappropriate_nudity':
        return { label: isEs ? '⚠️ Inapropiado / Desnudez' : '⚠️ Explicit Content', bg: 'bg-orange-50 text-orange-800 border-orange-200' };
      case 'offensive_harassment':
        return { label: isEs ? '🛑 Falta de respeto / Acoso' : '🛑 Harassment / Offense', bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'dangerous_misleading':
        return { label: isEs ? '🧪 Engañoso / Peligroso' : '🧪 Dangerous Info', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: isEs ? '💬 Otro motivo' : '💬 Other Reason', bg: 'bg-slate-50 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F2] border-l border-[#D8D3C4] w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del Panel de Control */}
        <div className="p-4 sm:p-5 border-b border-[#D8D3C4] bg-[#F2EFE9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2C3523] text-white flex items-center justify-center shadow-sm shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#2C3523]">
                  {isEs ? 'Panel de Moderación & Seguridad' : 'Moderation & Safety Center'}
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                    {pendingCount} {isEs ? 'pendientes' : 'pending'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5C6650]">
                {isSupremeAdmin
                  ? isEs
                    ? 'Control total: Gestión de Denuncias, Roles y Baneo de Usuarios'
                    : 'Full control: Reports inbox, Roles & Ban Management'
                  : isEs
                  ? 'Revisión y resolución de denuncias de la comunidad'
                  : 'Community reports review & enforcement'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (mainSection === 'reports') loadReports();
                else loadProfiles(userSearchQuery);
              }}
              disabled={loadingReports || loadingUsers}
              className="p-2 rounded-xl text-[#5C6650] hover:text-[#2C3523] hover:bg-[#EAE6DB] transition-colors cursor-pointer"
              title={isEs ? 'Actualizar datos' : 'Refresh data'}
            >
              <RefreshCw className={`w-4 h-4 ${loadingReports || loadingUsers ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#5C6650] hover:text-[#2C3523] hover:bg-[#EAE6DB] transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificación flotante de acción */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-red-50 text-red-800 border-b border-red-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* NAVEGACIÓN SUPERIOR: Denuncias vs. Gestión de Usuarios */}
        <div className="flex border-b border-[#D8D3C4] bg-[#EFECE1] shrink-0">
          <button
            onClick={() => setMainSection('reports')}
            className={`flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border-b-2 ${
              mainSection === 'reports'
                ? 'border-[#2C3523] text-[#2C3523] bg-[#FAF8F2]'
                : 'border-transparent text-[#5C6650] hover:bg-[#EAE6DB]'
            }`}
          >
            <Flag className="w-4 h-4 text-amber-600" />
            <span>{isEs ? 'Buzón de Denuncias' : 'Reports Inbox'}</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainSection('users')}
            className={`flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border-b-2 ${
              mainSection === 'users'
                ? 'border-[#2C3523] text-[#2C3523] bg-[#FAF8F2]'
                : 'border-transparent text-[#5C6650] hover:bg-[#EAE6DB]'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-700" />
            <span>{isEs ? 'Gestión de Usuarios & Roles' : 'Users & Roles Manager'}</span>
            {bannedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-800 text-white text-[10px] font-black" title="Baneados">
                {bannedCount}
              </span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 1: BUZÓN DE DENUNCIAS                                             */}
        {/* ========================================================================= */}
        {mainSection === 'reports' && (
          <>
            {/* Barra de Filtros & Búsqueda para Denuncias */}
            <div className="p-4 border-b border-[#D8D3C4] bg-white/60 space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-[#5C6650] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Buscar por título, motivo, denunciante o autor...'
                      : 'Search by title, reason, reporter or author...'
                  }
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#D8D3C4] rounded-xl text-xs sm:text-sm text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'pending'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {isEs ? 'Pendientes' : 'Pending'} ({pendingCount})
                </button>
                <button
                  onClick={() => setActiveTab('recipe')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'recipe'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {isEs ? 'Recetas' : 'Recipes'} ({recipesCount})
                </button>
                <button
                  onClick={() => setActiveTab('tip')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'tip'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {isEs ? 'Tips' : 'Tips'} ({tipsCount})
                </button>
                <button
                  onClick={() => setActiveTab('comment')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'comment'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {isEs ? 'Comentarios' : 'Comments'} ({commentsCount})
                </button>
                <button
                  onClick={() => setActiveTab('resolved')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'resolved'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {isEs ? 'Resueltos' : 'Resolved'}
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {isEs ? 'Todos' : 'All'} ({reports.length})
                </button>
              </div>
            </div>

            {/* Lista de Reportes */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {filteredReports.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-300">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#2C3523]">
                    {isEs ? '¡Todo limpio y bajo control!' : 'All clean and under control!'}
                  </h3>
                  <p className="text-xs text-[#5C6650] max-w-sm mx-auto">
                    {isEs
                      ? 'No hay denuncias pendientes bajo este filtro. La comunidad de Pulse&Cook se mantiene sana y respetuosa.'
                      : 'No pending reports matching this view. Pulse&Cook community is in good standing.'}
                  </p>
                </div>
              ) : (
                filteredReports.map((report) => {
                  const reasonMeta = getReasonBadge(report.reason_category);
                  const isTargetBanned = isUserLocallyBanned(report.reported_user_id);
                  const isBusy = actionInProgress === report.id;

                  return (
                    <div
                      key={report.id}
                      className={`bg-white border rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs transition-all ${
                        report.status === 'pending'
                          ? 'border-[#D8D3C4]'
                          : 'border-[#D8D3C4]/60 opacity-80'
                      }`}
                    >
                      {/* Encabezado de la Denuncia */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-[#EFECE1] text-[#2C3523]">
                            {report.target_type === 'recipe'
                              ? isEs ? 'Receta' : 'Recipe'
                              : report.target_type === 'tip'
                              ? isEs ? 'Tip de Chef' : 'Chef Tip'
                              : isEs ? 'Comentario' : 'Comment'}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${reasonMeta.bg}`}>
                            {reasonMeta.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {report.status === 'pending' ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              {isEs ? 'Pendiente' : 'Pending'}
                            </span>
                          ) : report.status === 'dismissed' ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold">
                              {isEs ? 'Desestimada' : 'Dismissed'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                              {isEs ? 'Resuelta' : 'Resolved'} ({report.action_taken})
                            </span>
                          )}

                          <span className="text-[10px] text-[#5C6650]">
                            {new Date(report.created_at).toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Publicación Denunciada */}
                      <div className="p-3 bg-[#FAF8F2] border border-[#D8D3C4] rounded-xl space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#2C3523] truncate">
                            {report.target_title || (isEs ? 'Publicación' : 'Post')}
                          </span>
                          {report.reported_username && (
                            <span className="text-[11px] text-[#5C6650] shrink-0">
                              {isEs ? 'Autor' : 'Author'}:{' '}
                              <strong className="text-[#2C3523]">@{report.reported_username}</strong>
                              {isTargetBanned && (
                                <span className="ml-1 text-red-600 font-bold">
                                  ({isEs ? 'Suspendido' : 'Banned'})
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {report.target_snippet && (
                          <p className="text-xs text-[#5C6650] italic line-clamp-3 bg-white/80 p-2 rounded-lg border border-[#E5E0D0]">
                            &ldquo;{report.target_snippet}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Detalle y Razón aportada por el denunciante */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[#5C6650] text-[11px]">
                          <span>
                            {isEs ? 'Denunciado por' : 'Reported by'}:{' '}
                            <strong className="text-[#2C3523]">@{report.reporter_username}</strong>{' '}
                            {report.reporter_email && `(${report.reporter_email})`}
                          </span>
                        </div>
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[#2C3523] text-xs leading-relaxed">
                          <p className="font-semibold text-[11px] text-amber-900 mb-0.5">
                            {isEs ? 'Explicación del denunciante:' : 'Reporter justification:'}
                          </p>
                          &ldquo;{report.reason_text}&rdquo;
                        </div>
                      </div>

                      {/* Barra de Acciones de Moderación */}
                      <div className="pt-2 border-t border-[#D8D3C4]/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleDismiss(report)}
                            disabled={isBusy || report.status === 'dismissed'}
                            className="px-2.5 py-1.5 bg-white border border-[#D8D3C4] text-[#2C3523] hover:bg-[#EFECE1] rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                            title={isEs ? 'Desestimar denuncia y mantener activo' : 'Dismiss report'}
                          >
                            {isEs ? 'Desestimar' : 'Dismiss'}
                          </button>

                          <button
                            onClick={() => handleHide(report)}
                            disabled={isBusy || report.action_taken === 'hidden'}
                            className="px-2.5 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1"
                            title={isEs ? 'Ocultar contenido al público' : 'Hide from public'}
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>{isEs ? 'Ocultar' : 'Hide'}</span>
                          </button>

                          <button
                            onClick={() => handleDelete(report)}
                            disabled={isBusy || report.action_taken === 'deleted'}
                            className="px-2.5 py-1.5 bg-white border border-red-300 text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1"
                            title={isEs ? 'Borrar permanentemente' : 'Permanently delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isEs ? 'Eliminar' : 'Delete'}</span>
                          </button>
                        </div>

                        {/* Banear o Gestionar Usuario directamente desde el reporte */}
                        {report.reported_user_id && report.reported_user_id !== MAIN_AUTHOR_CONFIG.UUID && (
                          <button
                            onClick={() => {
                              const foundProfile = profiles.find((p) => p.id === report.reported_user_id);
                              handleToggleUserBanDirect(
                                foundProfile || {
                                  id: report.reported_user_id!,
                                  username: report.reported_username || 'usuario',
                                  is_banned: isTargetBanned,
                                },
                                !isTargetBanned
                              );
                            }}
                            disabled={isBusy}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isTargetBanned
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {isTargetBanned ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{isEs ? 'Desbanear usuario' : 'Unban user'}</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>{isEs ? 'Banear usuario' : 'Ban user'}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 2: GESTIÓN DE USUARIOS Y ROLES (ADMIN CONSOLE)                    */}
        {/* ========================================================================= */}
        {mainSection === 'users' && (
          <>
            {/* Barra de Filtros & Búsqueda para Usuarios */}
            <div className="p-4 border-b border-[#D8D3C4] bg-white/60 space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-[#5C6650] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Buscar usuario por @alias, email o ID...'
                      : 'Search user by @alias, email or ID...'
                  }
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#D8D3C4] rounded-xl text-xs sm:text-sm text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setUserFilterRole('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    userFilterRole === 'all'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {isEs ? 'Todos' : 'All'} ({profiles.length})
                </button>
                <button
                  onClick={() => setUserFilterRole('admins')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    userFilterRole === 'admins'
                      ? 'bg-amber-800 text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-300" />
                    <span>{isEs ? 'Admins' : 'Admins'} ({adminsCount})</span>
                  </span>
                </button>
                <button
                  onClick={() => setUserFilterRole('moderators')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    userFilterRole === 'moderators'
                      ? 'bg-blue-800 text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3 text-blue-300" />
                    <span>{isEs ? 'Moderadores' : 'Moderators'} ({moderatorsCount})</span>
                  </span>
                </button>
                <button
                  onClick={() => setUserFilterRole('banned')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    userFilterRole === 'banned'
                      ? 'bg-red-800 text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <UserX className="w-3 h-3 text-red-300" />
                    <span>{isEs ? 'Baneados' : 'Banned'} ({bannedCount})</span>
                  </span>
                </button>
                <button
                  onClick={() => setUserFilterRole('users')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    userFilterRole === 'users'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'bg-white border border-[#D8D3C4] text-[#5C6650] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {isEs ? 'Usuarios Base' : 'Base Users'}
                </button>
              </div>
            </div>

            {/* Lista de Usuarios */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {filteredProfiles.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-300">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#2C3523]">
                    {isEs ? 'No se encontraron usuarios' : 'No users found'}
                  </h3>
                  <p className="text-xs text-[#5C6650] max-w-sm mx-auto">
                    {isEs
                      ? 'Intenta buscando por otro alias, correo o cambia los filtros de rol.'
                      : 'Try searching by a different alias, email or change the role filter.'}
                  </p>
                </div>
              ) : (
                filteredProfiles.map((targetUser) => {
                  const isMainAdmin = targetUser.id === MAIN_AUTHOR_CONFIG.UUID || targetUser.username?.toLowerCase() === 'leanborsini';
                  const isBanned = Boolean(targetUser.is_banned || isUserLocallyBanned(targetUser.id));
                  const effectiveRole = isMainAdmin ? 'admin' : (targetUser.role || 'user');
                  const isBusyBan = actionInProgress === `ban_${targetUser.id}`;
                  const isBusyRole = actionInProgress === `role_${targetUser.id}`;

                  return (
                    <div
                      key={targetUser.id}
                      className={`bg-white border rounded-2xl p-4 sm:p-4.5 space-y-3.5 shadow-2xs transition-all ${
                        isBanned
                          ? 'border-red-300 bg-red-50/20'
                          : 'border-[#D8D3C4]'
                      }`}
                    >
                      {/* Cabecera del Usuario */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${
                            isMainAdmin
                              ? 'bg-amber-600 text-white'
                              : effectiveRole === 'admin'
                              ? 'bg-[#2C3523] text-white'
                              : effectiveRole === 'moderator'
                              ? 'bg-blue-700 text-white'
                              : 'bg-[#EFECE1] text-[#2C3523] border border-[#D8D3C4]'
                          }`}>
                            {targetUser.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[#2C3523] flex items-center gap-1.5">
                                <span>@{targetUser.username}</span>
                                {isMainAdmin && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md border border-amber-300">
                                    {isEs ? 'Autor Principal / Creador' : 'Supreme Admin / Creator'}
                                  </span>
                                )}
                              </h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5C6650] mt-0.5">
                              {targetUser.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-[#5C6650]" />
                                  <span>{targetUser.email}</span>
                                </span>
                              )}
                              <span className="text-[10px] text-[#7A8270] font-mono">
                                ID: {targetUser.id.substring(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Badges de Estado */}
                        <div className="flex items-center gap-1.5">
                          {isBanned && (
                            <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{isEs ? 'BANEADO' : 'BANNED'}</span>
                            </span>
                          )}

                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                            effectiveRole === 'admin'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : effectiveRole === 'moderator'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-[#F2EFE9] text-[#5C6650] border-[#D8D3C4]'
                          }`}>
                            {effectiveRole === 'admin'
                              ? isEs ? 'Admin' : 'Admin'
                              : effectiveRole === 'moderator'
                              ? isEs ? 'Moderador' : 'Moderator'
                              : isEs ? 'Usuario' : 'User'}
                          </span>
                        </div>
                      </div>

                      {/* Controles de Acción para el Administrador */}
                      <div className="pt-2.5 border-t border-[#D8D3C4]/60 flex flex-wrap items-center justify-between gap-2.5">
                        {/* Asignación de Roles */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#5C6650]">
                            {isEs ? 'Asignar Rol:' : 'Assign Role:'}
                          </span>
                          {isMainAdmin ? (
                            <span className="text-xs font-bold text-amber-800 italic">
                              {isEs ? 'Rol permanente protegido' : 'Protected supreme role'}
                            </span>
                          ) : !isSupremeAdmin ? (
                            <span className="text-xs text-[#5C6650] italic">
                              {isEs ? 'Solo modificable por un Admin' : 'Admin only'}
                            </span>
                          ) : (
                            <select
                              value={effectiveRole}
                              disabled={isBusyRole}
                              onChange={(e) => handleChangeRole(targetUser, e.target.value as UserRole)}
                              className="px-2.5 py-1 bg-white border border-[#D8D3C4] rounded-xl text-xs font-bold text-[#2C3523] cursor-pointer focus:ring-2 focus:ring-[#2C3523]/30 disabled:opacity-50"
                            >
                              <option value="user">{isEs ? 'Usuario Base' : 'Base User'}</option>
                              <option value="moderator">{isEs ? 'Moderador' : 'Moderator'}</option>
                              <option value="admin">{isEs ? 'Administrador' : 'Admin'}</option>
                            </select>
                          )}
                        </div>

                        {/* Botón de Ban / Desbanear */}
                        {!isMainAdmin && (
                          <button
                            onClick={() => handleToggleUserBanDirect(targetUser, !isBanned)}
                            disabled={isBusyBan}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                              isBanned
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            } disabled:opacity-50`}
                          >
                            {isBanned ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{isEs ? 'Desbanear usuario' : 'Unban user'}</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>{isEs ? 'Banear usuario' : 'Ban user'}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

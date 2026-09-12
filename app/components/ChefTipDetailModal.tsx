'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChefTip, TipExperience } from '@/app/types';
import { CHEF_TIP_CATEGORIES } from '@/lib/chefTipsData';
import {
  canManageTip,
  toggleTipLike,
  rateChefTip,
  getTipExperiences,
  addTipExperience,
} from '@/lib/tipStore';
import {
  X,
  Heart,
  Star,
  Clock,
  Edit2,
  Trash2,
  MessageSquare,
  Send,
  Camera,
  CheckCircle2,
  Flag,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface ChefTipDetailModalProps {
  tip: ChefTip | null;
  isOpen: boolean;
  onClose: () => void;
  lang: 'ES' | 'EN';
  user: User | null;
  profileUsername: string | null;
  onEditTip: (tip: ChefTip) => void;
  onDeleteTip: (tipId: string) => void;
  onTipUpdated?: (updatedTip: ChefTip) => void;
  onOpenAuth?: () => void;
  onReportTip?: (tip: ChefTip) => void;
  onReportExperience?: (exp: TipExperience) => void;
}

export function ChefTipDetailModal({
  tip,
  isOpen,
  onClose,
  lang,
  user,
  profileUsername,
  onEditTip,
  onDeleteTip,
  onTipUpdated,
  onOpenAuth,
  onReportTip,
  onReportExperience,
}: ChefTipDetailModalProps) {
  const isEs = lang === 'ES';

  const [localTipUpdate, setLocalTipUpdate] = useState<ChefTip | null>(null);
  const [experiences, setExperiences] = useState<TipExperience[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [justRated, setJustRated] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Derivar el tip actual: priorizar actualización local si coincide con el id actual
  const currentTip = (localTipUpdate && tip && localTipUpdate.id === tip.id) ? localTipUpdate : tip;

  useEffect(() => {
    let isSubscribed = true;
    if (tip?.id) {
      getTipExperiences(tip.id).then((list) => {
        if (isSubscribed) {
          setExperiences(list);
        }
      });
    }
    return () => {
      isSubscribed = false;
    };
  }, [tip?.id]);

  if (!isOpen || !currentTip) return null;

  const categoryMeta = CHEF_TIP_CATEGORIES.find((c) => c.key === currentTip.category);
  const canManage = canManageTip(currentTip, user);

  const displayTitle = isEs
    ? currentTip.title_es
    : currentTip.title_en || currentTip.title_es;
  const displaySummary = isEs
    ? currentTip.summary_es
    : currentTip.summary_en || currentTip.summary_es;
  const displayContent = isEs
    ? currentTip.content_es || currentTip.summary_es
    : currentTip.content_en || currentTip.summary_en || currentTip.content_es;

  // Manejar Like
  const handleLike = async () => {
    if (!user) {
      onOpenAuth?.();
      return;
    }

    setJustLiked(true);
    setTimeout(() => setJustLiked(false), 400);

    const { likesCount, userLiked } = await toggleTipLike(currentTip.id, user?.id);
    const updated = {
      ...currentTip,
      likes_count: likesCount,
      user_liked: userLiked,
    };
    setLocalTipUpdate(updated);
    if (onTipUpdated) onTipUpdated(updated);
  };

  // Manejar Rating con Estrellas
  const handleRate = async (stars: number) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }

    setJustRated(true);
    setTimeout(() => setJustRated(false), 1200);

    const { avgRating, ratingsCount, userRating } = await rateChefTip(
      currentTip.id,
      stars,
      user?.id
    );
    const updated = {
      ...currentTip,
      avg_rating: avgRating,
      ratings_count: ratingsCount,
      user_rating: userRating,
    };
    setLocalTipUpdate(updated);
    if (onTipUpdated) onTipUpdated(updated);
  };

  // Enviar comentario o experiencia
  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth?.();
      return;
    }

    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    const authorName =
      profileUsername ||
      (user?.email ? user.email.split('@')[0] : isEs ? 'Cocinero casero' : 'Home cook');

    try {
      const created = await addTipExperience(
        currentTip.id,
        newComment.trim(),
        newPhotoUrl.trim() || undefined,
        user,
        authorName
      );
      setExperiences((prev) => [created, ...prev]);
      setNewComment('');
      setNewPhotoUrl('');
      setShowPhotoInput(false);
    } catch (err) {
      console.error('Error adding tip experience:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      id="chef-tip-detail-backdrop"
    >
      <div
        className="w-full max-w-2xl bg-[#FAF8F2] border border-[#D8D3C4] rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={displayTitle}
      >
        {/* Cabecera / Imagen */}
        <div className="relative bg-[#EFECE1]">
          {currentTip.image_url ? (
            <div className="relative w-full h-48 sm:h-64 overflow-hidden">
              <Image
                src={currentTip.image_url}
                alt={displayTitle}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
                sizes="(max-width: 768px) 100vw, 672px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>
          ) : (
            <div className="w-full h-28 sm:h-32 bg-gradient-to-r from-[#2C3523]/10 to-[#4B6B2B]/15 flex items-center justify-center border-b border-[#D8D3C4]">
              <span className="text-4xl opacity-80">🍳</span>
            </div>
          )}

          {/* Botón Denunciar Tip en Cabecera */}
          {onReportTip && (
            <button
              onClick={() => {
                if (!user) {
                  onOpenAuth?.();
                  return;
                }
                onReportTip(currentTip);
              }}
              className="absolute top-3 right-14 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-red-900/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer border border-white/20 shadow-sm"
              title={isEs ? 'Denunciar este tip' : 'Report this tip'}
              aria-label={isEs ? 'Denunciar' : 'Report'}
            >
              <Flag className="w-4 h-4 text-red-400" />
            </button>
          )}

          {/* Botón Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badges superiores sobre la imagen */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2 flex-wrap">
              {categoryMeta && (
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-xs backdrop-blur-xs"
                  style={{ backgroundColor: categoryMeta.color }}
                >
                  {categoryMeta.tag}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-black/50 text-white/90 backdrop-blur-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{currentTip.read_time_seconds || 45}s</span>
              </span>
            </div>

            {/* Autor */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/50 backdrop-blur-xs rounded-xl text-white text-xs font-semibold">
              <span>✍️</span>
              <span>@{currentTip.profiles?.username || currentTip.author_username || 'Chef'}</span>
            </div>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Título */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-handwritten font-bold text-[#2C3523] leading-tight tracking-wide">
              {displayTitle}
            </h2>
          </div>

          {/* Caja Resumen Relámpago */}
          <div className="p-4 sm:p-5 bg-[#EFECE1]/80 border-l-4 border-[#2C3523] rounded-r-2xl space-y-1 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#5C6650]">
              {isEs ? '⚡ El Hack Relámpago' : '⚡ The Flash Hack'}
            </span>
            <p className="font-cozy text-sm sm:text-base text-[#2C3523] leading-relaxed">
              {displaySummary}
            </p>
          </div>

          {/* Explicación Detallada */}
          {displayContent && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C6650]">
                {isEs ? '¿Por qué funciona?' : 'Why does this work?'}
              </h4>
              <p className="font-cozy text-sm sm:text-base text-[#38432E] leading-relaxed whitespace-pre-line">
                {displayContent}
              </p>
            </div>
          )}

          {/* Barra de Interacción: Likes & Estrellas */}
          <div className="p-4 bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl flex flex-wrap items-center justify-between gap-4">
            {/* Like / Utilidad */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  currentTip.user_liked
                    ? 'bg-rose-600 text-white shadow-rose-200'
                    : 'bg-white border border-[#D8D3C4] text-[#2C3523] hover:bg-[#EFECE1]'
                } ${justLiked ? 'scale-110' : ''}`}
              >
                <Heart
                  className={`w-4 h-4 transition-transform ${
                    currentTip.user_liked ? 'fill-white text-white' : 'text-rose-500'
                  }`}
                />
                <span>
                  {currentTip.user_liked
                    ? isEs
                      ? '¡Me resultó muy útil!'
                      : 'Super helpful!'
                    : isEs
                    ? 'Me resulta útil'
                    : 'Helpful'}
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-black/10 text-[11px] font-black">
                  {currentTip.likes_count || 0}
                </span>
              </button>
            </div>

            {/* Puntuación con Estrellas (1 a 5) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#5C6650] hidden sm:inline">
                {isEs ? 'Puntúa:' : 'Rate:'}
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const hasRatingData = Boolean(currentTip.user_rating || (currentTip.ratings_count && currentTip.ratings_count > 0));
                  const isFilled = hasRatingData && starVal <= (currentTip.user_rating || Math.round(currentTip.avg_rating || 0));
                  return (
                    <button
                      key={starVal}
                      onClick={() => handleRate(starVal)}
                      className="p-1 text-amber-500 hover:scale-125 transition-transform cursor-pointer"
                      title={`${starVal} ${starVal === 1 ? 'estrella' : 'estrellas'}`}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          isFilled ? 'fill-amber-400 text-amber-500' : 'text-[#D8D3C4]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-black text-[#2C3523] ml-1">
                {currentTip.ratings_count && currentTip.ratings_count > 0 && currentTip.avg_rating
                  ? currentTip.avg_rating.toFixed(1)
                  : '0.0'}
              </span>
              <span className="text-[11px] text-[#5C6650]">
                ({currentTip.ratings_count || 0})
              </span>
            </div>
          </div>

          {/* Feedback tras votar */}
          {justRated && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{isEs ? '¡Gracias por calificar la utilidad de este tip!' : 'Thanks for rating this tip!'}</span>
            </div>
          )}

          {/* Acciones de Edición / Borrado para Autor o leanBorsini */}
          {canManage && (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-xs font-bold text-amber-900">
                {isEs ? 'Opciones de autor' : 'Author tools'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onEditTip(currentTip);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Editar' : 'Edit'}</span>
                </button>

                {confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onDeleteTip(currentTip.id);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      {isEs ? 'Confirmar' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1.5 bg-white border border-gray-300 text-xs font-semibold rounded-xl"
                    >
                      {isEs ? 'No' : 'Cancel'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Eliminar' : 'Delete'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN: Experiencias & Comentarios de la Comunidad */}
          <div className="space-y-4 pt-2 border-t border-[#D8D3C4]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#2C3523]" />
                <h3 className="text-sm font-bold text-[#2C3523]">
                  {isEs ? 'Experiencias de la Comunidad' : 'Community Experiences'}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-[#EFECE1] text-[#2C3523] rounded-full font-bold">
                  {experiences.length}
                </span>
              </div>
            </div>

            {/* Formulario para comentar */}
            <form onSubmit={handleAddExperience} className="space-y-2">
              <div className="flex items-start gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    isEs
                      ? '¿Lo has probado hoy en tu cocina? Cuenta tu experiencia...'
                      : 'Did you try this at home? Share your experiment...'
                  }
                  rows={2}
                  className="flex-1 px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-2xl text-xs sm:text-sm text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="px-4 py-2.5 bg-[#2C3523] text-white rounded-2xl hover:bg-[#3D4932] transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center shrink-0 self-stretch"
                  title={isEs ? 'Publicar experiencia' : 'Post experience'}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Opción para adjuntar foto */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPhotoInput(!showPhotoInput)}
                  className="flex items-center gap-1.5 text-xs text-[#5C6650] hover:text-[#2C3523] font-semibold cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>
                    {showPhotoInput
                      ? isEs
                        ? 'Ocultar foto'
                        : 'Hide photo'
                      : isEs
                      ? 'Adjuntar foto de mi prueba'
                      : 'Attach proof photo'}
                  </span>
                </button>

                {!user && onOpenAuth && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="text-[11px] text-[#5C6650] hover:text-[#2C3523] underline font-medium cursor-pointer"
                  >
                    {isEs ? 'Iniciar sesión para firmar' : 'Sign in to sign'}
                  </button>
                )}
              </div>

              {showPhotoInput && (
                <input
                  type="url"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... o enlace de tu foto"
                  className="w-full px-3 py-2 bg-white border border-[#D8D3C4] rounded-xl text-xs text-[#2C3523] focus:outline-hidden"
                />
              )}
            </form>

            {/* Lista de Experiencias */}
            {experiences.length === 0 ? (
              <div className="p-4 bg-[#F7F5EC] border border-dashed border-[#D8D3C4] rounded-2xl text-center text-xs text-[#5C6650]">
                {isEs
                  ? '¡Sé el primero en compartir tu experiencia probando este truco!'
                  : 'Be the first to share your experience trying this hack!'}
              </div>
            ) : (
              <div className="space-y-3">
                {experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 bg-white border border-[#D8D3C4]/70 rounded-2xl space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#2C3523] text-[#FAF8F2] flex items-center justify-center text-[10px] font-bold">
                          {exp.author_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-[#2C3523]">
                          {exp.author_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#5C6650]">
                          {new Date(exp.created_at).toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {/* Botón denunciar experiencia - SIEMPRE VISIBLE */}
                        {onReportExperience && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!user) {
                                onOpenAuth?.();
                                return;
                              }
                              onReportExperience(exp);
                            }}
                            title={isEs ? 'Denunciar experiencia' : 'Report experience'}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-stone-500 hover:text-red-700 hover:bg-red-50 border border-stone-300/60 hover:border-red-300 bg-white/70 transition-all cursor-pointer shadow-2xs"
                          >
                            <Flag className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] font-semibold text-stone-600 hover:text-red-700">
                              {isEs ? 'Denunciar' : 'Report'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="font-cozy text-xs sm:text-sm text-[#38432E] leading-relaxed">{exp.comment}</p>

                    {exp.photo_url && (
                      <div className="relative w-full h-36 rounded-xl overflow-hidden mt-1.5 border border-[#D8D3C4]">
                        <Image
                          src={exp.photo_url}
                          alt="Foto de experiencia"
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                          sizes="(max-width: 768px) 100vw, 400px"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

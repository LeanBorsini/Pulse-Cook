'use client';

import { useState } from 'react';
import { X, Clock, Users, Edit, Trash2, Video, MessageSquare, Send, Sparkles, Loader2, Star } from 'lucide-react';
import { Recipe, Ingredient, Comment } from '../types';
import { User } from '@supabase/supabase-js';

interface RecipeDetailModalProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  comments?: Comment[];
  loadingIngredients?: boolean;
  loadingComments?: boolean;
  newMessage?: string;
  setNewMessage?: (val: string) => void;
  lang: 'ES' | 'EN';
  user: User | null;
  userRating?: number;
  onRate?: (stars: number) => void;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onAddComment?: (e: React.FormEvent) => void;
  onOpenAuth: () => void;
}

export function RecipeDetailModal({
  recipe,
  ingredients,
  comments = [],
  loadingIngredients,
  loadingComments,
  newMessage = '',
  setNewMessage,
  lang,
  user,
  userRating = 0,
  onRate,
  onClose,
  onEdit,
  onDelete,
  onAddComment,
  onOpenAuth,
}: RecipeDetailModalProps) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [dynamicLang, setDynamicLang] = useState<'ES' | 'EN'>(lang);
  const [translatingView, setTranslatingView] = useState(false);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [translatedContent, setTranslatedContent] = useState<{
    title?: string;
    description?: string;
    instructions?: string;
  } | null>(null);

  // Parse YouTube links
  const getEmbedYoutubeUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  // Compile video list
  const videoList =
    recipe.video_links && recipe.video_links.length > 0
      ? recipe.video_links
      : recipe.youtube_url
      ? [{ id: '1', title: 'Video Tutorial', url: recipe.youtube_url }]
      : [];

  const currentVideo = videoList[activeVideoIndex] || videoList[0];
  const youtubeEmbed = getEmbedYoutubeUrl(currentVideo?.url);

  // Content text depending on language
  const displayedTitle =
    translatedContent?.title ||
    (dynamicLang === 'ES' ? recipe.title_es : recipe.title_en || recipe.title_es);

  const displayedDesc =
    translatedContent?.description ||
    (dynamicLang === 'ES' ? recipe.description_es : recipe.description_en || recipe.description_es);

  const displayedInstructions =
    translatedContent?.instructions ||
    (dynamicLang === 'ES'
      ? recipe.instructions_es || recipe.instructions_en
      : recipe.instructions_en || recipe.instructions_es);

  const handleInstantTranslate = async () => {
    const target = dynamicLang === 'ES' ? 'EN' : 'ES';
    setTranslatingView(true);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: displayedTitle,
          description: displayedDesc,
          instructions: displayedInstructions,
          sourceLang: dynamicLang,
          targetLang: target,
        }),
      });

      const data = await res.json();
      if (res.ok && data) {
        setTranslatedContent({
          title: data.translatedTitle,
          description: data.translatedDescription,
          instructions: data.translatedInstructions,
        });
        setDynamicLang(target);
      }
    } catch (err) {
      console.warn('Instant translation error:', err);
    } finally {
      setTranslatingView(false);
    }
  };

  // Images (Up to 3 images)
  const recipeImages: string[] =
    recipe.images && recipe.images.length > 0
      ? recipe.images
      : recipe.image_url && recipe.image_url.trim() !== ''
      ? [recipe.image_url]
      : [];

  const currentImage = recipeImages[activeImageIndex] || recipeImages[0] || null;

  // Author & Owner check
  const authorName = recipe.profiles?.username || 'leanBorsini';
  const isOwner = user && (recipe.user_id === user.id || recipe.user_id === null || !recipe.user_id);

  const handleStarClick = (starValue: number) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (onRate) {
      onRate(starValue);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#2C3523]">
        
        {/* Renderizado de Galería de Imágenes */}
        {recipeImages.length > 0 && currentImage && (
          <div className="mb-4 space-y-2">
            <div className="w-full h-64 rounded-xl overflow-hidden border border-[#D8D3C4] bg-black/5 relative">
              <img
                src={currentImage}
                alt={`${displayedTitle} - ${activeImageIndex + 1}`}
                className="w-full h-full object-cover transition-all duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).parentElement!.style.display = 'none';
                }}
              />
              {recipeImages.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {activeImageIndex + 1} / {recipeImages.length}
                </div>
              )}
            </div>

            {/* Selector de Miniaturas (si hay más de 1 imagen) */}
            {recipeImages.length > 1 && (
              <div className="flex gap-2">
                {recipeImages.map((imgSrc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative rounded-lg overflow-hidden h-14 w-20 border-2 transition-all ${
                      activeImageIndex === idx
                        ? 'border-[#2C3523] shadow-md scale-105'
                        : 'border-[#D8D3C4] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgSrc}
                      alt={`Miniatura ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Encabezado con controles */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#2C3523] leading-tight">
              {displayedTitle}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-stone-500 font-medium">by @{authorName}</span>
              <span>•</span>
              <button
                type="button"
                onClick={handleInstantTranslate}
                disabled={translatingView}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2C3523] bg-[#EFECE1] hover:bg-[#E2DEC2] px-2 py-0.5 rounded-lg border border-[#D8D3C4] transition-colors"
                title="Traducir esta receta"
              >
                {translatingView ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-600" />
                )}
                <span>{dynamicLang === 'ES' ? 'Ver en Inglés' : 'Ver en Español'}</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {isOwner && (
              <>
                <button
                  onClick={() => onEdit(recipe)}
                  title={lang === 'ES' ? 'Editar' : 'Edit'}
                  className="p-1.5 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] hover:bg-[#E2DEC2] transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(recipe.id)}
                  title={lang === 'ES' ? 'Eliminar' : 'Delete'}
                  className="p-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              title={lang === 'ES' ? 'Cerrar' : 'Close'}
              className="p-1.5 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] hover:bg-[#E2DEC2] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadatos y Sistema de Valoración por Estrellas */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#EFECE1]/70 rounded-xl border border-[#D8D3C4] mb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5C6650]">
            <span className="flex items-center gap-1 bg-[#F7F5EC] px-2.5 py-1 rounded-lg border border-[#D8D3C4]">
              <Clock className="w-3.5 h-3.5" />
              {recipe.prep_time || 15}m
            </span>
            <span className="flex items-center gap-1 bg-[#F7F5EC] px-2.5 py-1 rounded-lg border border-[#D8D3C4]">
              <Users className="w-3.5 h-3.5" />
              {recipe.servings || 1} {lang === 'ES' ? 'Porciones' : 'Servings'}
            </span>
            <span className="bg-[#2C3523] text-[#F7F5EC] px-2.5 py-1 rounded-lg font-semibold">
              {recipe.category || 'General'}
            </span>
          </div>

          {/* Rating Interactivo (1-5 estrellas) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating || userRating || Math.round(recipe.avg_rating || 0)) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleStarClick(star)}
                    className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                    title={`${star} ${lang === 'ES' ? 'estrellas' : 'stars'}`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        filled
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-[#2C3523]">
              {recipe.avg_rating ? recipe.avg_rating.toFixed(1) : '-'}
              <span className="text-[10px] text-stone-500 font-normal ml-1">
                ({recipe.ratings_count || 0} {lang === 'ES' ? 'votos' : 'votes'})
              </span>
            </span>
          </div>
        </div>

        {/* Tags Gastronómicos */}
        {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {recipe.dietary_tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] px-2.5 py-0.5 rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {displayedDesc && (
          <p className="text-xs text-[#5C6650] mb-4 italic leading-relaxed bg-[#EFECE1]/40 p-2.5 rounded-xl border border-[#D8D3C4]/60">
            {displayedDesc}
          </p>
        )}

        {/* Múltiples Videos / Tutoriales */}
        {videoList.length > 0 && (
          <div className="mb-5 bg-[#EFECE1]/60 p-3.5 rounded-xl border border-[#D8D3C4]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif font-bold text-[#2C3523] text-xs flex items-center gap-1.5">
                <Video className="w-4 h-4 text-red-600" />
                {lang === 'ES' ? 'Videos & Tutoriales' : 'Videos & Tutorials'}
              </h3>
              {videoList.length > 1 && (
                <div className="flex gap-1">
                  {videoList.map((vid, idx) => (
                    <button
                      key={vid.id}
                      onClick={() => setActiveVideoIndex(idx)}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                        activeVideoIndex === idx
                          ? 'bg-[#2C3523] text-white'
                          : 'bg-[#EFECE1] text-[#2C3523] border border-[#D8D3C4]'
                      }`}
                    >
                      {vid.title || `Video ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {youtubeEmbed ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#D8D3C4]">
                <iframe
                  src={youtubeEmbed}
                  title="Tutorial Video"
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={currentVideo.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#2C3523] font-semibold underline block"
              >
                🔗 {currentVideo.title || currentVideo.url}
              </a>
            )}
          </div>
        )}

        {/* Ingredientes */}
        <div className="mb-5">
          <h3 className="font-serif font-bold text-[#2C3523] mb-2 text-xs">
            {lang === 'ES' ? 'Ingredientes' : 'Ingredients'}
          </h3>
          {loadingIngredients ? (
            <p className="text-xs text-stone-500">{lang === 'ES' ? 'Cargando ingredientes...' : 'Loading ingredients...'}</p>
          ) : ingredients && ingredients.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-xs text-[#2C3523]">
              {ingredients.map((ing, i) => (
                <li key={i}>
                  <span className="font-semibold">{ing.amount} {ing.unit}</span> - {lang === 'ES' ? ing.name_es : ing.name_en || ing.name_es}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone-400 italic">{lang === 'ES' ? 'Sin ingredientes registrados.' : 'No ingredients.'}</p>
          )}
        </div>

        {/* Instrucciones */}
        {displayedInstructions ? (
          <div className="mb-5 border-t border-[#D8D3C4]/80 pt-4">
            <h3 className="font-serif font-bold text-[#2C3523] mb-2 text-xs">
              {lang === 'ES' ? 'Instrucciones' : 'Instructions'}
            </h3>
            <div className="text-xs text-[#2C3523] whitespace-pre-line leading-relaxed bg-[#EFECE1] p-3.5 rounded-xl border border-[#D8D3C4]">
              {displayedInstructions}
            </div>
          </div>
        ) : (
          <div className="mb-5 border-t border-[#D8D3C4]/80 pt-4">
            <h3 className="font-serif font-bold text-[#2C3523] mb-1 text-xs">
              {lang === 'ES' ? 'Instrucciones' : 'Instructions'}
            </h3>
            <p className="text-xs text-stone-400 italic">
              {lang === 'ES' ? 'No hay instrucciones escritas para esta receta.' : 'No instructions provided.'}
            </p>
          </div>
        )}

        {/* Sección Comentarios Persistentes */}
        <div className="border-t border-[#D8D3C4]/80 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-bold text-[#2C3523] text-xs flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              {lang === 'ES' ? 'Comentarios de la Comunidad' : 'Community Comments'}
              <span className="text-[10px] text-stone-500 font-normal">({comments.length})</span>
            </h3>
          </div>

          {user ? (
            <form onSubmit={onAddComment} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={lang === 'ES' ? 'Comparte tu experiencia o consejo culinario...' : 'Share your feedback or cooking tip...'}
                  value={newMessage}
                  onChange={(e) => setNewMessage && setNewMessage(e.target.value)}
                  required
                  className="flex-1 bg-[#EFECE1] border border-[#D8D3C4] px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
                />
                <button
                  type="submit"
                  className="bg-[#2C3523] text-[#F7F5EC] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-[#3D4932] transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === 'ES' ? 'Publicar' : 'Post'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-4 p-3 bg-[#EFECE1]/80 rounded-xl text-center text-xs text-stone-600 border border-[#D8D3C4]">
              <button onClick={onOpenAuth} className="font-bold text-[#2C3523] underline hover:text-[#3D4932]">
                {lang === 'ES' ? 'Inicia sesión con tu correo' : 'Sign in with your email'}
              </button> {lang === 'ES' ? 'para calificar y dejar comentarios.' : 'to rate and leave comments.'}
            </div>
          )}

          {loadingComments ? (
            <div className="text-center py-4 text-xs text-stone-500">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
              {lang === 'ES' ? 'Cargando comentarios...' : 'Loading comments...'}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-stone-400 italic py-2 text-center">
              {lang === 'ES' ? 'Sé el primero en dejar un comentario o consejo para este plato.' : 'Be the first to leave a comment or tip for this dish.'}
            </p>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="bg-[#EFECE1]/60 p-3 rounded-xl border border-[#D8D3C4] text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[#2C3523] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#2C3523] text-white flex items-center justify-center text-[10px]">
                        {c.user_name ? c.user_name.charAt(0).toUpperCase() : 'C'}
                      </span>
                      @{c.user_name || 'chef'}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-[#5C6650] leading-relaxed pl-6.5">{c.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

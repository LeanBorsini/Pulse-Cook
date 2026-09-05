'use client';

/**
 * @file RecipeDetailModal.tsx
 * @description Modal de visualización exhaustiva de una receta.
 *
 * Características:
 * - Selector local de idioma [ES | EN] con botón de traducción automática interactiva.
 * - Galería de imágenes (hasta 3 fotos) y visor de videos/YouTube embebido.
 * - Ajuste interactivo de porciones (escalado de ingredientes).
 * - Calificación comunitaria por estrellas y sección de comentarios con avatares.
 * - Botón de acceso directo al Modo Cocina interactivo (`CookingModeModal`).
 * - Impresión física / exportación PDF optimizada (`RecipePrintView`).
 * - Inclusión/exclusión directa de la receta en el menú semanal para compras.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  Users,
  Edit,
  Trash2,
  Video,
  MessageSquare,
  Send,
  Loader2,
  Star,
  Printer,
  Share2,
  Check,
  ChefHat,
  ShoppingCart,
} from 'lucide-react';
import { Recipe, Ingredient, Comment } from '../types';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { RecipePrintView } from './RecipePrintView';
import { CookingModeModal } from './CookingModeModal';
import { translateTag, translateIngredientName } from '../../lib/culinaryDictionary';
import { saveLocalRecipe } from '../../lib/recipeStore';
import { getCategoryLabel } from '@/lib/categories';
import { translateTextSmart } from '../../lib/recipeTranslator';
import {
  getLocalUserRating,
  saveLocalRating,
  syncRatingToSupabase,
  getConsolidatedRating,
} from '@/lib/ratingStore';

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
  isInMenu?: boolean;
  onToggleMenu?: (id: string) => void;
  onRecipeUpdated?: (updated: Recipe) => void;
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
  isInMenu = false,
  onToggleMenu,
  onRecipeUpdated,
}: RecipeDetailModalProps) {
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estados reactivos y persistentes para calificación con estrellas
  const [ratedState, setRatedState] = useState<{
    recipeId: string;
    userRating: number;
    avgRating?: number;
    ratingsCount: number;
  } | null>(null);
  const [ratingFeedbackMessage, setRatingFeedbackMessage] = useState<string | null>(null);

  // Derivación del estado actual de calificación combinando base de datos, almacenamiento local y votos recientes
  const effectiveRatingState = useMemo(() => {
    if (ratedState && ratedState.recipeId === recipe.id) {
      return {
        userRating: ratedState.userRating,
        avgRating: ratedState.avgRating,
        ratingsCount: ratedState.ratingsCount,
      };
    }
    const localVote = getLocalUserRating(recipe.id, user?.id);
    const consolidated = getConsolidatedRating(recipe.id, recipe.avg_rating, recipe.ratings_count, user?.id);
    return {
      userRating: userRating || recipe.user_rating || localVote || consolidated.userRating,
      avgRating: consolidated.avgRating !== undefined ? consolidated.avgRating : recipe.avg_rating,
      ratingsCount: consolidated.ratingsCount || recipe.ratings_count || 0,
    };
  }, [recipe.id, recipe.avg_rating, recipe.ratings_count, recipe.user_rating, userRating, user?.id, ratedState]);

  const currentUserRating = effectiveRatingState.userRating;
  const currentAvgRating = effectiveRatingState.avgRating;
  const currentRatingsCount = effectiveRatingState.ratingsCount;

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  // Estados de edición manual directa de instrucciones
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [instructionEditText, setInstructionEditText] = useState('');

  const isEs = lang === 'ES';

  // Textos fieles según el idioma global de la app
  const displayedTitle = isEs
    ? (recipe.title_es || recipe.title_en || '')
    : (recipe.title_en || recipe.title_es || '');

  const displayedDesc = isEs
    ? (recipe.description_es || recipe.description_en || '')
    : (recipe.description_en || recipe.description_es || '');

  // Instrucciones activas para el idioma global: respetando íntegramente las palabras del usuario
  const displayedInstructions = isEs
    ? (recipe.instructions_es || recipe.instructions_en || '')
    : (recipe.instructions_en || recipe.instructions_es || '');

  const handleSaveEditedInstructions = async () => {
    const trimmed = instructionEditText.trim();
    const updated: Recipe = {
      ...recipe,
      ...(isEs
        ? {
            instructions_es: trimmed,
            instructions_en: recipe.instructions_en || translateTextSmart(trimmed, 'ES', 'EN'),
          }
        : {
            instructions_en: trimmed,
            instructions_es: recipe.instructions_es || translateTextSmart(trimmed, 'EN', 'ES'),
          }),
    };
    saveLocalRecipe(updated, ingredients);
    if (onRecipeUpdated) {
      onRecipeUpdated(updated);
    }

    // Sincronizar en Supabase para que todos los usuarios vean el cambio en tiempo real
    try {
      if (recipe.id && !recipe.id.startsWith('user_') && !recipe.id.startsWith('rec_')) {
        await supabase
          .from('recipes')
          .update({
            instructions_es: updated.instructions_es,
          })
          .eq('id', recipe.id);
      }
    } catch (supaErr) {
      console.warn('Error syncing edited instructions to Supabase:', supaErr);
    }

    setIsEditingInstructions(false);
  };

  const handleShareWhatsApp = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const text = isEs
      ? `🍽️ *${displayedTitle}* en Pulse & Cook\n⏱️ Tiempo: ${recipe.prep_time || 15}m | 👥 Porciones: ${recipe.servings || 1}\n\n${displayedDesc ? `${displayedDesc}\n\n` : ''}👉 Mira la receta completa con ingredientes y modo cocina aquí:\n${currentUrl}`
      : `🍽️ *${displayedTitle}* on Pulse & Cook\n⏱️ Time: ${recipe.prep_time || 15}m | 👥 Servings: ${recipe.servings || 1}\n\n${displayedDesc ? `${displayedDesc}\n\n` : ''}👉 Check out the full recipe with ingredients and cooking mode here:\n${currentUrl}`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Images (Up to 3 images)
  const recipeImages: string[] =
    recipe.images && recipe.images.length > 0
      ? recipe.images
      : recipe.image_url && recipe.image_url.trim() !== ''
      ? [recipe.image_url]
      : [];

  const currentImage = recipeImages[activeImageIndex] || recipeImages[0] || null;

  // Author & Owner check - Cada usuario puede editar sus recetas originales
  const authorName =
    recipe.profiles?.username ||
    (recipe.user_id === user?.id
      ? (user?.user_metadata?.username || user?.email?.split('@')[0] || 'Tú')
      : 'leanBorsini');

  // Solo el autor original puede editar o eliminar su receta
  const isOwner = Boolean(
    (user && (recipe.user_id === user.id || recipe.profiles?.id === user.id)) ||
    (recipe.user_id === 'local_user' || (!recipe.user_id && recipe.id.startsWith('user_')))
  );

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareData = {
      title: `${displayedTitle} - Pulse & Cook`,
      text: `${displayedTitle} - ${displayedDesc || '¡Mira esta deliciosa receta en Pulse & Cook!'}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(
        `🍽️ *${displayedTitle}* (Pulse & Cook)\n⏱️ ${recipe.prep_time || 15} min | 👥 ${recipe.servings || 1} porciones\n\n${displayedDesc || ''}\n\n👉 Mira la receta completa aquí: ${window.location.href}`
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleStarClick = (starValue: number) => {
    // 1. Guardar de forma inmediata en almacenamiento local persistente (soporta re-calificar y actualizar voto)
    const summary = saveLocalRating(recipe.id, starValue, user?.id);

    // 2. Actualizar el estado visual de este modal de forma inmediata
    const wasAlreadyRated = currentUserRating > 0;
    const isVoteChange = wasAlreadyRated && currentUserRating !== starValue;
    setRatedState({
      recipeId: recipe.id,
      userRating: starValue,
      avgRating: summary.avgRating,
      ratingsCount: summary.ratingsCount,
    });

    setRatingFeedbackMessage(
      isVoteChange
        ? (isEs ? `¡Voto actualizado a ${starValue}★!` : `Vote updated to ${starValue}★!`)
        : (isEs ? `¡Calificado con ${starValue}★!` : `Rated with ${starValue}★!`)
    );
    setTimeout(() => setRatingFeedbackMessage(null), 3000);

    // 3. Sincronizar en Supabase en segundo plano
    syncRatingToSupabase(recipe.id, starValue, user?.id);

    // 4. Notificar al componente padre
    if (onRate) {
      onRate(starValue);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn print:block print:static print:bg-transparent print:p-0"
    >
      {/* Vista Exclusiva para Impresión y PDF */}
      <RecipePrintView
        recipe={recipe}
        lang={lang}
        servings={recipe.servings || 1}
        ingredients={ingredients}
        currentImage={currentImage}
      />

      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[92vh] flex flex-col text-[#2C3523] print:hidden overflow-hidden">
        
        {/* Barra Superior Fija (Sticky Header): Botón Cerrar SIEMPRE VISIBLE y accesible en móvil */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#F7F5EC]/95 backdrop-blur-md border-b border-[#D8D3C4] shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6650] shrink-0">
              {isEs ? 'Receta' : 'Recipe'}
            </span>
            <span className="text-[#8C987E]">•</span>
            <h3 className="text-sm font-serif font-bold text-[#2C3523] truncate">
              {displayedTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Cerrar (X) - SIEMPRE VISIBLE Y NUNCA OCULTO */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#EAE5D6] hover:bg-[#DED8C6] active:scale-90 text-[#2C3523] flex items-center justify-center border border-[#D8D3C4] transition-all cursor-pointer shadow-xs"
              title={isEs ? 'Cerrar ventana' : 'Close window'}
              aria-label={isEs ? 'Cerrar' : 'Close'}
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Contenedor scrolleable con todo el cuerpo de la receta */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Renderizado de Galería de Imágenes */}
          {recipeImages.length > 0 && currentImage && (
            <div className="space-y-2">
              <div className="w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-[#D8D3C4] bg-black/5 relative">
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
                      className={`relative rounded-lg overflow-hidden h-14 w-20 border-2 transition-all cursor-pointer ${
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

          {/* Encabezado del Plato */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C3523] leading-tight">
              {displayedTitle}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-stone-500 font-medium">by @{authorName}</span>
            </div>
          </div>

          {/* Barra de Acciones Gastronómicas (Diseñada para envolver limpiamente en móvil sin desbordar) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Cocinar Paso a Paso */}
            <button
              onClick={() => setIsCookingMode(true)}
              title={lang === 'ES' ? 'Modo Cocina Paso a Paso' : 'Step-by-Step Cooking Mode'}
              className="p-2 px-3.5 rounded-xl bg-[#2C3523] text-white hover:bg-[#3D4932] transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer active:scale-95"
            >
              <ChefHat className="w-4 h-4 text-amber-300" />
              <span>{lang === 'ES' ? 'Cocinar Paso a Paso' : 'Cook Step-by-Step'}</span>
            </button>

            {/* Botón Añadir al Menú */}
            {onToggleMenu && (
              <button
                onClick={() => onToggleMenu(recipe.id)}
                title={isInMenu ? (lang === 'ES' ? 'Quitar del Menú' : 'Remove from Menu') : (lang === 'ES' ? 'Añadir al Menú' : 'Add to Menu')}
                className={`p-2 px-3 rounded-xl border transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                  isInMenu
                    ? 'bg-[#EAE5D6] text-[#2C3523] border-[#2C3523] font-bold'
                    : 'bg-[#EFECE1] border-[#D8D3C4] text-[#5C6650] hover:bg-[#E2DEC2]'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{isInMenu ? (lang === 'ES' ? 'En Menú ✓' : 'In Menu ✓') : (lang === 'ES' ? '+ Menú' : '+ Menu')}</span>
              </button>
            )}

            {/* Botón Compartir */}
            <button
              onClick={handleShare}
              title={lang === 'ES' ? 'Compartir receta' : 'Share recipe'}
              className="p-2 px-3 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] hover:bg-[#E2DEC2] transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? (lang === 'ES' ? '¡Copiado!' : 'Copied!') : (lang === 'ES' ? 'Compartir' : 'Share')}</span>
            </button>

            {/* Botón Compartir por WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              title={lang === 'ES' ? 'Enviar receta por WhatsApp' : 'Send recipe via WhatsApp'}
              className="p-2 px-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#128C7E] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
            >
              <svg className="w-3.5 h-3.5 fill-current text-[#25D366]" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.974.531 1.83.813 2.796.814 3.183 0 5.769-2.588 5.77-5.768 0-3.181-2.587-5.768-5.77-5.768zm3.364 8.163c-.141.398-.711.758-1.034.792-.324.034-.737.154-2.433-.553-1.472-.614-2.42-2.115-2.493-2.213-.074-.098-.598-.796-.598-1.518 0-.722.378-1.076.513-1.223.134-.147.294-.184.392-.184.098 0 .196 0 .282.006.09.006.211-.034.33.251.123.294.417 1.018.454 1.092.037.074.062.16.012.257-.049.098-.074.16-.147.245-.074.086-.156.192-.223.257-.074.074-.151.155-.065.302.086.147.383.633.823 1.025.566.505 1.043.662 1.19.736.147.074.233.061.32-.037.086-.098.368-.429.466-.576.098-.147.196-.123.331-.074.135.049.859.405 1.006.478.147.074.245.11.282.172.037.061.037.356-.104.754z" />
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.95.56 3.77 1.53 5.32L2.05 22l4.82-1.44C8.36 21.49 10.13 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18.2c-1.68 0-3.25-.49-4.58-1.33l-.33-.21-2.86.85.86-2.77-.22-.35A8.16 8.16 0 013.8 12c0-4.52 3.68-8.2 8.2-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.52-3.68 8.2-8.2 8.2z" />
              </svg>
              <span>WhatsApp</span>
            </button>

            {/* Botón Imprimir / PDF */}
            <button
              onClick={handlePrint}
              title={lang === 'ES' ? 'Imprimir / Guardar en PDF' : 'Print / Save as PDF'}
              className="p-2 px-3 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] hover:bg-[#E2DEC2] transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#425035]" />
              <span>PDF</span>
            </button>

            {/* Acciones de Edición/Eliminación */}
            {isOwner && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={() => onEdit(recipe)}
                  title={lang === 'ES' ? 'Editar' : 'Edit'}
                  className="p-2 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] hover:bg-[#E2DEC2] transition-colors cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(recipe.id)}
                  title={lang === 'ES' ? 'Eliminar' : 'Delete'}
                  className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Metadatos y Sistema de Valoración por Estrellas */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#EFECE1]/70 rounded-xl border border-[#D8D3C4]">
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
                {getCategoryLabel(recipe.category, lang)}
              </span>
            </div>

            {/* Rating Interactivo (1-5 estrellas) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5" role="group" aria-label={isEs ? 'Calificación con estrellas' : 'Star rating'}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled =
                      (hoverRating || currentUserRating) >= star ||
                      (!hoverRating && !currentUserRating && Math.round(currentAvgRating || 0) >= star);
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => handleStarClick(star)}
                        className="p-1 transition-transform hover:scale-125 active:scale-95 focus:outline-none cursor-pointer"
                        title={`${star} ${isEs ? 'estrellas (toca para calificar)' : 'stars (tap to rate)'}`}
                        aria-label={`${star} ${isEs ? 'estrellas' : 'stars'}`}
                      >
                        <Star
                          className={`w-4 h-4 transition-colors ${
                            filled
                              ? 'text-amber-500 fill-amber-500 drop-shadow-xs'
                              : 'text-stone-300 hover:text-amber-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-baseline gap-1 ml-1">
                  <span className="text-xs font-bold text-[#2C3523]">
                    {currentAvgRating !== undefined && currentAvgRating > 0 ? currentAvgRating.toFixed(1) : '-'}
                  </span>
                  <span className="text-[10px] text-stone-500 font-normal">
                    ({currentRatingsCount} {isEs ? (currentRatingsCount === 1 ? 'voto' : 'votos') : (currentRatingsCount === 1 ? 'vote' : 'votes')})
                  </span>
                </div>
              </div>

              {/* Indicador de voto del usuario y mensaje de confirmación */}
              {(ratingFeedbackMessage || currentUserRating > 0) && (
                <div className="text-[10px] flex items-center gap-1 font-medium">
                  {ratingFeedbackMessage ? (
                    <span className="text-emerald-800 bg-emerald-100/90 border border-emerald-300/70 px-2 py-0.5 rounded-md font-semibold animate-pulse">
                      ✓ {ratingFeedbackMessage}
                    </span>
                  ) : (
                    <span className="text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md">
                      {isEs
                        ? `Tu voto: ${currentUserRating}★ (toca otra para cambiar)`
                        : `Your vote: ${currentUserRating}★ (tap another to change)`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tags Gastronómicos */}
          {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.dietary_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] px-2.5 py-0.5 rounded-full font-medium"
                >
                  {translateTag(tag, lang)}
                </span>
              ))}
            </div>
          )}

          {displayedDesc && (
            <p className="text-xs text-[#5C6650] italic leading-relaxed bg-[#EFECE1]/40 p-3 rounded-xl border border-[#D8D3C4]/60">
              {displayedDesc}
            </p>
          )}

          {/* Múltiples Videos / Tutoriales */}
          {videoList.length > 0 && (
            <div className="bg-[#EFECE1]/60 p-3.5 rounded-xl border border-[#D8D3C4]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-serif font-bold text-[#2C3523] text-xs flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-600" />
                  {isEs ? 'Videos & Tutoriales' : 'Videos & Tutorials'}
                </h3>
                {videoList.length > 1 && (
                  <div className="flex gap-1">
                    {videoList.map((vid, idx) => (
                      <button
                        key={vid.id}
                        onClick={() => setActiveVideoIndex(idx)}
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
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
          <div>
            <h3 className="font-serif font-bold text-[#2C3523] mb-2 text-xs uppercase tracking-wider">
              {isEs ? 'Ingredientes' : 'Ingredients'}
            </h3>
            {loadingIngredients ? (
              <p className="text-xs text-stone-500">{isEs ? 'Cargando ingredientes...' : 'Loading ingredients...'}</p>
            ) : ingredients && ingredients.length > 0 ? (
              <ul className="list-disc list-inside space-y-1.5 text-xs text-[#2C3523] bg-[#EFECE1]/50 p-3 rounded-xl border border-[#D8D3C4]">
                {ingredients.map((ing, i) => (
                  <li key={i}>
                    <span className="font-semibold">{ing.amount} {ing.unit}</span> - {translateIngredientName(ing.name_es, ing.name_en, lang)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">{isEs ? 'Sin ingredientes registrados.' : 'No ingredients.'}</p>
            )}
          </div>

          {/* Instrucciones */}
          <div className="border-t border-[#D8D3C4]/80 pt-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-serif font-bold text-[#2C3523] text-xs uppercase tracking-wider">
                {isEs ? 'Instrucciones' : 'Instructions'}
              </h3>
              
              {/* Botón Editar Instrucciones en línea - Solo visible para el autor/dueño */}
              {isOwner && !isEditingInstructions && (
                <button
                  type="button"
                  onClick={() => {
                    setInstructionEditText(displayedInstructions);
                    setIsEditingInstructions(true);
                  }}
                  className="text-[11px] text-stone-700 hover:text-stone-900 font-medium flex items-center gap-1 cursor-pointer bg-[#EFECE1] hover:bg-[#E2DEC2] border border-[#D8D3C4] px-2.5 py-1 rounded-lg transition-colors"
                  title={isEs ? 'Editar texto de instrucciones' : 'Edit instructions text'}
                >
                  <Edit className="w-3 h-3 text-[#5C6650]" />
                  <span>{isEs ? 'Editar' : 'Edit'}</span>
                </button>
              )}
            </div>

            {isEditingInstructions ? (
              <div className="space-y-2 bg-[#EFECE1] p-3 rounded-xl border border-[#D8D3C4]">
                <div className="flex items-center justify-between text-xs text-[#5C6650] font-medium">
                  <span>{isEs ? 'Editando instrucciones (Español):' : 'Editing instructions (English):'}</span>
                  <span className="text-[10px] text-stone-500">Paso a paso numerado (1., 2., 3.)</span>
                </div>
                <textarea
                  value={instructionEditText}
                  onChange={(e) => setInstructionEditText(e.target.value)}
                  rows={6}
                  className="w-full text-xs text-[#2C3523] bg-[#F7F5EC] p-3 rounded-lg border border-[#D8D3C4] focus:outline-none focus:ring-1 focus:ring-[#2C3523] leading-relaxed resize-y font-sans"
                  placeholder={isEs ? 'Escribe o ajusta las instrucciones paso a paso...' : 'Write or adjust step-by-step instructions...'}
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingInstructions(false)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[#D8D3C4] bg-[#F7F5EC] text-[#5C6650] hover:bg-[#EFECE1] font-medium cursor-pointer"
                  >
                    {isEs ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditedInstructions}
                    className="px-3.5 py-1.5 text-xs rounded-lg bg-[#2C3523] text-white hover:bg-[#3D4932] font-semibold cursor-pointer active:scale-95 shadow-xs"
                  >
                    {isEs ? 'Guardar Cambios' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : displayedInstructions ? (
              <div className="text-xs text-[#2C3523] whitespace-pre-line leading-relaxed bg-[#EFECE1] p-3.5 rounded-xl border border-[#D8D3C4]">
                {displayedInstructions}
              </div>
            ) : (
              <div className="text-xs text-[#2C3523] whitespace-pre-line leading-relaxed bg-[#EFECE1] p-3.5 rounded-xl border border-[#D8D3C4]">
                {recipe.instructions_es || recipe.instructions_en || (isEs ? 'No hay instrucciones escritas.' : 'No instructions provided.')}
              </div>
            )}
          </div>

          {/* Sección Comentarios Persistentes */}
          <div className="border-t border-[#D8D3C4]/80 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-bold text-[#2C3523] text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5" />
                {isEs ? 'Comentarios de la Comunidad' : 'Community Comments'}
                <span className="text-[10px] text-stone-500 font-normal">({comments.length})</span>
              </h3>
            </div>

            {user ? (
              <form onSubmit={onAddComment} className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={isEs ? 'Comparte tu experiencia o consejo culinario...' : 'Share your feedback or cooking tip...'}
                    value={newMessage}
                    onChange={(e) => setNewMessage && setNewMessage(e.target.value)}
                    required
                    className="flex-1 bg-[#EFECE1] border border-[#D8D3C4] px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
                  />
                  <button
                    type="submit"
                    className="bg-[#2C3523] text-[#F7F5EC] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-[#3D4932] transition-colors shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Publicar' : 'Post'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-4 p-3 bg-[#EFECE1]/80 rounded-xl text-center text-xs text-stone-600 border border-[#D8D3C4]">
                <button onClick={onOpenAuth} className="font-bold text-[#2C3523] underline hover:text-[#3D4932] cursor-pointer">
                  {isEs ? 'Inicia sesión con tu correo' : 'Sign in with your email'}
                </button> {isEs ? 'para calificar y dejar comentarios.' : 'to rate and leave comments.'}
              </div>
            )}

            {loadingComments ? (
              <div className="text-center py-4 text-xs text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                {isEs ? 'Cargando comentarios...' : 'Loading comments...'}
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2 text-center">
                {isEs ? 'Sé el primero en dejar un comentario o consejo para este plato.' : 'Be the first to leave a comment or tip for this dish.'}
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

          {/* Botón inferior para cerrar con el pulgar */}
          <div className="pt-2 border-t border-[#D8D3C4] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#EAE5D6] hover:bg-[#DED8C6] active:scale-95 text-[#2C3523] text-xs font-bold border border-[#D8D3C4] transition-all cursor-pointer shadow-xs"
            >
              {isEs ? 'Cerrar Receta' : 'Close Recipe'}
            </button>
          </div>

        </div>

      </div>

      {/* Modo Cocina (Paso a paso, pantalla limpia, porciones y voz) */}
      <CookingModeModal
        isOpen={isCookingMode}
        onClose={() => setIsCookingMode(false)}
        recipe={recipe}
        ingredients={ingredients}
        lang={lang}
        displayedTitle={displayedTitle || ''}
        displayedInstructions={displayedInstructions || ''}
      />
    </div>
  );
}

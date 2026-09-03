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

import { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Users,
  Edit,
  Trash2,
  Video,
  MessageSquare,
  Send,
  Sparkles,
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
import { RecipePrintView } from './RecipePrintView';
import { CookingModeModal } from './CookingModeModal';
import { translateTag, translateIngredientName } from '../../lib/culinaryDictionary';
import { saveLocalRecipe } from '../../lib/recipeStore';
import {
  hasGenuineEnglishInstructions,
  hasGenuineSpanishInstructions,
  isSpanishCulinaryText,
  translateTextSmart,
} from '../../lib/recipeTranslator';

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
}: RecipeDetailModalProps) {
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [overrideLang, setOverrideLang] = useState<'ES' | 'EN' | null>(null);
  const [prevRecipeId, setPrevRecipeId] = useState(recipe.id);
  const [prevLang, setPrevLang] = useState(lang);
  const [translatingView, setTranslatingView] = useState(false);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{
    title?: string;
    description?: string;
    instructions?: string;
  } | null>(null);

  // Sincronizar estado cuando cambia el idioma base o la receta seleccionada
  if (recipe.id !== prevRecipeId || lang !== prevLang) {
    setPrevRecipeId(recipe.id);
    setPrevLang(lang);
    setOverrideLang(null);
    setTranslatedContent(null);
  }

  const dynamicLang: 'ES' | 'EN' = overrideLang || lang;
  const setDynamicLang = (newLang: 'ES' | 'EN') => setOverrideLang(newLang);

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

  // Detección real y precisa de disponibilidad lingüística genuina en la receta
  const hasValidEn = hasGenuineEnglishInstructions(recipe.instructions_en, recipe.instructions_es);
  const hasValidEs = hasGenuineSpanishInstructions(recipe.instructions_es, recipe.instructions_en);

  // Textos a mostrar según el idioma dinámico seleccionado
  const displayedTitle =
    translatedContent?.title ||
    (dynamicLang === 'ES' 
      ? (recipe.title_es || recipe.title_en || '') 
      : (recipe.title_en && recipe.title_en !== recipe.title_es ? recipe.title_en : (recipe.title_en || recipe.title_es || '')));

  const displayedDesc =
    translatedContent?.description ||
    (dynamicLang === 'ES' 
      ? (recipe.description_es || recipe.description_en || '') 
      : (recipe.description_en && recipe.description_en !== recipe.description_es ? recipe.description_en : (recipe.description_en || recipe.description_es || '')));

  // Instrucciones activas para el idioma dinámico seleccionado
  const displayedInstructions =
    translatedContent?.instructions ||
    (dynamicLang === 'ES'
      ? (hasValidEs ? recipe.instructions_es : (recipe.instructions_es || recipe.instructions_en || ''))
      : (hasValidEn ? recipe.instructions_en : (recipe.instructions_en && !isSpanishCulinaryText(recipe.instructions_en) ? recipe.instructions_en : '')));

  // Indicador de si las instrucciones mostradas en el idioma activo no están traducidas
  const needsTranslationToActiveLang =
    (dynamicLang === 'EN' && !hasValidEn && !translatedContent?.instructions && Boolean(recipe.instructions_es || recipe.instructions_en)) ||
    (dynamicLang === 'ES' && !hasValidEs && !translatedContent?.instructions && Boolean(recipe.instructions_en || recipe.instructions_es));

  const handleInstantTranslate = async (forceTargetLang?: 'ES' | 'EN') => {
    const target = forceTargetLang || (dynamicLang === 'ES' ? 'EN' : 'ES');

    // Si ya existe la traducción guardada directamente en el objeto de la receta y es genuina
    if (target === 'ES' && hasValidEs && recipe.instructions_es && recipe.instructions_es.trim()) {
      setDynamicLang('ES');
      setTranslatedContent((prev) => ({
        ...prev,
        title: recipe.title_es,
        description: recipe.description_es,
        instructions: recipe.instructions_es,
      }));
      return;
    }
    if (target === 'EN' && hasValidEn && recipe.instructions_en && recipe.instructions_en.trim()) {
      setDynamicLang('EN');
      setTranslatedContent((prev) => ({
        ...prev,
        title: recipe.title_en,
        description: recipe.description_en,
        instructions: recipe.instructions_en,
      }));
      return;
    }

    // Determinar con certeza los textos fuente para traducir
    const sourceTextTitle = target === 'EN' ? (recipe.title_es || displayedTitle) : (recipe.title_en || displayedTitle);
    const sourceTextDesc = target === 'EN' ? (recipe.description_es || displayedDesc) : (recipe.description_en || displayedDesc);
    const sourceTextInst = target === 'EN'
      ? (recipe.instructions_es || recipe.instructions_en || '')
      : (recipe.instructions_en || recipe.instructions_es || '');
    const sourceLang: 'ES' | 'EN' = target === 'EN' ? 'ES' : 'EN';

    setTranslatingView(true);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sourceTextTitle,
          description: sourceTextDesc,
          instructions: sourceTextInst,
          sourceLang,
          targetLang: target,
        }),
      });

      const data = await res.json();
      if (res.ok && data && data.translatedInstructions) {
        const translatedInst = data.translatedInstructions;
        const translatedTitle = data.translatedTitle || sourceTextTitle;
        const translatedDesc = data.translatedDescription || sourceTextDesc;

        setTranslatedContent({
          title: translatedTitle,
          description: translatedDesc,
          instructions: translatedInst,
        });
        setDynamicLang(target);

        // Guardar y persistir la traducción en almacenamiento local
        const updatedRecipe: Recipe = {
          ...recipe,
          ...(target === 'EN'
            ? {
                title_en: translatedTitle,
                description_en: translatedDesc,
                instructions_en: translatedInst,
              }
            : {
                title_es: translatedTitle,
                description_es: translatedDesc,
                instructions_es: translatedInst,
              }),
        };
        saveLocalRecipe(updatedRecipe, ingredients);
      } else {
        // Fallback inmediato con el diccionario culinario inteligente
        const fallbackInst = translateTextSmart(sourceTextInst, sourceLang, target);
        setTranslatedContent({
          title: sourceTextTitle,
          description: sourceTextDesc,
          instructions: fallbackInst,
        });
        setDynamicLang(target);
      }
    } catch (err) {
      console.warn('Instant translation error, using smart culinary dictionary:', err);
      const fallbackInst = translateTextSmart(sourceTextInst, sourceLang, target);
      setTranslatedContent({
        title: sourceTextTitle,
        description: sourceTextDesc,
        instructions: fallbackInst,
      });
      setDynamicLang(target);
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

  // Author & Owner check - permitir gestionar libremente las recetas en el dispositivo
  const authorName = recipe.profiles?.username || 'leanBorsini';
  const isOwner = true;

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
    if (!user) {
      onOpenAuth();
      return;
    }
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
        lang={dynamicLang}
        servings={recipe.servings || 1}
        ingredients={ingredients}
        currentImage={currentImage}
      />

      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[92vh] flex flex-col text-[#2C3523] print:hidden overflow-hidden">
        
        {/* Barra Superior Fija (Sticky Header): Botón Cerrar SIEMPRE VISIBLE y accesible en móvil */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#F7F5EC]/95 backdrop-blur-md border-b border-[#D8D3C4] shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6650] shrink-0">
              {dynamicLang === 'ES' ? 'Receta' : 'Recipe'}
            </span>
            <span className="text-[#8C987E]">•</span>
            <h3 className="text-sm font-serif font-bold text-[#2C3523] truncate">
              {displayedTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Traducir Rápido */}
            <button
              type="button"
              onClick={() => handleInstantTranslate()}
              disabled={translatingView}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2C3523] bg-[#EAE5D6] hover:bg-[#DED8C6] px-2.5 py-1.5 rounded-xl border border-[#D8D3C4] transition-colors cursor-pointer shadow-xs active:scale-95"
              title={dynamicLang === 'ES' ? 'Ver en Inglés' : 'Ver en Español'}
            >
              {translatingView ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="hidden sm:inline">
                {dynamicLang === 'ES' ? 'Ver en Inglés' : 'Ver en Español'}
              </span>
              <span className="sm:hidden font-bold">
                {dynamicLang === 'ES' ? 'EN' : 'ES'}
              </span>
            </button>

            {/* Botón Cerrar (X) - SIEMPRE VISIBLE Y NUNCA OCULTO */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#EAE5D6] hover:bg-[#DED8C6] active:scale-90 text-[#2C3523] flex items-center justify-center border border-[#D8D3C4] transition-all cursor-pointer shadow-xs"
              title={lang === 'ES' ? 'Cerrar ventana' : 'Close window'}
              aria-label={lang === 'ES' ? 'Cerrar' : 'Close'}
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
                {recipe.servings || 1} {dynamicLang === 'ES' ? 'Porciones' : 'Servings'}
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
                      className="p-0.5 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                      title={`${star} ${dynamicLang === 'ES' ? 'estrellas' : 'stars'}`}
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
                  ({recipe.ratings_count || 0} {dynamicLang === 'ES' ? 'votos' : 'votes'})
                </span>
              </span>
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
                  {translateTag(tag, dynamicLang)}
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
                  {dynamicLang === 'ES' ? 'Videos & Tutoriales' : 'Videos & Tutorials'}
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
              {dynamicLang === 'ES' ? 'Ingredientes' : 'Ingredients'}
            </h3>
            {loadingIngredients ? (
              <p className="text-xs text-stone-500">{dynamicLang === 'ES' ? 'Cargando ingredientes...' : 'Loading ingredients...'}</p>
            ) : ingredients && ingredients.length > 0 ? (
              <ul className="list-disc list-inside space-y-1.5 text-xs text-[#2C3523] bg-[#EFECE1]/50 p-3 rounded-xl border border-[#D8D3C4]">
                {ingredients.map((ing, i) => (
                  <li key={i}>
                    <span className="font-semibold">{ing.amount} {ing.unit}</span> - {translateIngredientName(ing.name_es, ing.name_en, dynamicLang)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">{dynamicLang === 'ES' ? 'Sin ingredientes registrados.' : 'No ingredients.'}</p>
            )}
          </div>

          {/* Instrucciones con detector y traductor inteligente */}
          <div className="border-t border-[#D8D3C4]/80 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif font-bold text-[#2C3523] text-xs uppercase tracking-wider">
                {dynamicLang === 'ES' ? 'Instrucciones' : 'Instructions'}
              </h3>
              
              <div className="flex items-center gap-1.5">
                {/* Selector de idioma específico para las instrucciones */}
                <div className="inline-flex rounded-lg border border-[#D8D3C4] p-0.5 bg-[#EFECE1]">
                  <button
                    type="button"
                    onClick={() => handleInstantTranslate('ES')}
                    disabled={translatingView}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                      dynamicLang === 'ES'
                        ? 'bg-[#2C3523] text-white shadow-xs'
                        : 'text-[#5C6650] hover:text-[#2C3523]'
                    }`}
                  >
                    ES
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInstantTranslate('EN')}
                    disabled={translatingView}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                      dynamicLang === 'EN'
                        ? 'bg-[#2C3523] text-white shadow-xs'
                        : 'text-[#5C6650] hover:text-[#2C3523]'
                    }`}
                  >
                    EN
                  </button>
                </div>

                {/* Botón de traducción directa */}
                <button
                  type="button"
                  onClick={() => handleInstantTranslate(dynamicLang === 'ES' ? 'EN' : 'ES')}
                  disabled={translatingView}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition-colors"
                  title={dynamicLang === 'ES' ? 'Traducir al inglés' : 'Translate to Spanish'}
                >
                  {translatingView ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-600" />}
                  <span>{dynamicLang === 'ES' ? 'Traducir al Inglés' : 'Traducir al Español'}</span>
                </button>
              </div>
            </div>

            {/* Banner destacado si las instrucciones están en otro idioma */}
            {needsTranslationToActiveLang && (
              <div className="mb-3 flex items-center justify-between gap-2 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">
                    {dynamicLang === 'EN' 
                      ? 'Instructions are currently in Spanish.' 
                      : 'Las instrucciones están en inglés.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleInstantTranslate(dynamicLang)}
                  disabled={translatingView}
                  className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                >
                  {translatingView ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>{dynamicLang === 'EN' ? 'Translate to English' : 'Traducir al Español'}</span>
                </button>
              </div>
            )}

            {translatingView ? (
              <div className="p-6 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] flex flex-col items-center justify-center gap-2 text-xs text-[#5C6650]">
                <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                <span className="font-medium">
                  {dynamicLang === 'ES' ? 'Traduciendo instrucciones al español con IA...' : 'Translating instructions to English with AI...'}
                </span>
              </div>
            ) : displayedInstructions ? (
              <div className="text-xs text-[#2C3523] whitespace-pre-line leading-relaxed bg-[#EFECE1] p-3.5 rounded-xl border border-[#D8D3C4]">
                {displayedInstructions}
              </div>
            ) : (
              <div className="text-xs text-[#2C3523] whitespace-pre-line leading-relaxed bg-[#EFECE1] p-3.5 rounded-xl border border-[#D8D3C4]">
                {recipe.instructions_es || recipe.instructions_en || (dynamicLang === 'ES' ? 'No hay instrucciones escritas.' : 'No instructions provided.')}
              </div>
            )}
          </div>

          {/* Sección Comentarios Persistentes */}
          <div className="border-t border-[#D8D3C4]/80 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-bold text-[#2C3523] text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5" />
                {dynamicLang === 'ES' ? 'Comentarios de la Comunidad' : 'Community Comments'}
                <span className="text-[10px] text-stone-500 font-normal">({comments.length})</span>
              </h3>
            </div>

            {user ? (
              <form onSubmit={onAddComment} className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={dynamicLang === 'ES' ? 'Comparte tu experiencia o consejo culinario...' : 'Share your feedback or cooking tip...'}
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
                    <span>{dynamicLang === 'ES' ? 'Publicar' : 'Post'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-4 p-3 bg-[#EFECE1]/80 rounded-xl text-center text-xs text-stone-600 border border-[#D8D3C4]">
                <button onClick={onOpenAuth} className="font-bold text-[#2C3523] underline hover:text-[#3D4932] cursor-pointer">
                  {dynamicLang === 'ES' ? 'Inicia sesión con tu correo' : 'Sign in with your email'}
                </button> {dynamicLang === 'ES' ? 'para calificar y dejar comentarios.' : 'to rate and leave comments.'}
              </div>
            )}

            {loadingComments ? (
              <div className="text-center py-4 text-xs text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                {dynamicLang === 'ES' ? 'Cargando comentarios...' : 'Loading comments...'}
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2 text-center">
                {dynamicLang === 'ES' ? 'Sé el primero en dejar un comentario o consejo para este plato.' : 'Be the first to leave a comment or tip for this dish.'}
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
              {dynamicLang === 'ES' ? 'Cerrar Receta' : 'Close Recipe'}
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
        lang={dynamicLang}
        displayedTitle={displayedTitle || ''}
        displayedInstructions={displayedInstructions || ''}
      />
    </div>
  );
}

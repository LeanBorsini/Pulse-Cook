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

import { useState, useEffect, useCallback } from 'react';
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
import { getCategoryLabel } from '@/lib/categories';
import {
  hasGenuineEnglishInstructions,
  hasGenuineSpanishInstructions,
  isSpanishCulinaryText,
  isEnglishCulinaryText,
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
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [showOriginalComments, setShowOriginalComments] = useState<Record<string, boolean>>({});

  // Sincronizar estado cuando cambia el idioma base o la receta seleccionada
  if (recipe.id !== prevRecipeId || lang !== prevLang) {
    setPrevRecipeId(recipe.id);
    setPrevLang(lang);
    setOverrideLang(null);
    setTranslatedContent(null);
    setTranslatedComments({});
    setShowOriginalComments({});
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
      : (hasValidEn ? recipe.instructions_en : (translatedContent?.instructions || (translatingView ? '' : (recipe.instructions_en && !isSpanishCulinaryText(recipe.instructions_en) ? recipe.instructions_en : '')))));

  // Indicador de si las instrucciones mostradas en el idioma activo no están traducidas
  const needsTranslationToActiveLang =
    (dynamicLang === 'EN' && !hasValidEn && !translatedContent?.instructions && Boolean(recipe.instructions_es || recipe.instructions_en)) ||
    (dynamicLang === 'ES' && !hasValidEs && !translatedContent?.instructions && Boolean(recipe.instructions_en || recipe.instructions_es));

  // Determinar la acción exacta para el botón de traducción
  const targetForTranslateAction: 'ES' | 'EN' = (() => {
    if (dynamicLang === 'EN') {
      return hasValidEn && !isSpanishCulinaryText(displayedInstructions) ? 'ES' : 'EN';
    } else {
      return hasValidEs && !isEnglishCulinaryText(displayedInstructions) ? 'EN' : 'ES';
    }
  })();

  const handleInstantTranslate = useCallback(async (forceTargetLang?: 'ES' | 'EN') => {
    const target = forceTargetLang || (dynamicLang === 'ES' ? 'EN' : 'ES');

    // Si ya existe la traducción guardada directamente en el objeto de la receta y es genuina
    // y no se está forzando re-traducción
    const isTargetGenuinelyAvailable =
      target === 'ES'
        ? hasValidEs && recipe.instructions_es && recipe.instructions_es.trim()
        : hasValidEn && recipe.instructions_en && recipe.instructions_en.trim();

    if (isTargetGenuinelyAvailable && !forceTargetLang) {
      setDynamicLang(target);
      setTranslatedContent({
        title: target === 'ES' ? recipe.title_es : (recipe.title_en || recipe.title_es),
        description: target === 'ES' ? recipe.description_es : (recipe.description_en || recipe.description_es),
        instructions: target === 'ES' ? recipe.instructions_es : (recipe.instructions_en || ''),
      });
      return;
    }

    // Determinar con certeza los textos fuente para traducir
    const sourceTextTitle = target === 'EN' ? (recipe.title_es || displayedTitle) : (recipe.title_en || displayedTitle);
    const sourceTextDesc = target === 'EN' ? (recipe.description_es || displayedDesc) : (recipe.description_en || displayedDesc);
    // Para instrucciones: si vamos a EN, preferir siempre las instrucciones en español originales para evitar traducir textos corruptos en Spanglish
    const sourceTextInst = target === 'EN'
      ? (recipe.instructions_es || (hasValidEn ? recipe.instructions_en : '') || recipe.instructions_en || '')
      : (recipe.instructions_en || (hasValidEs ? recipe.instructions_es : '') || recipe.instructions_es || '');
    const sourceLang: 'ES' | 'EN' = target === 'EN' ? 'ES' : 'EN';

    const commentsPayload = comments.map((c) => ({
      id: c.id,
      message: c.message,
    }));

    setTranslatingView(true);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sourceTextTitle,
          description: sourceTextDesc,
          instructions: sourceTextInst,
          comments: commentsPayload,
          sourceLang,
          targetLang: target,
        }),
      });

      const data = await res.json();
      if (res.ok && data && (data.translatedInstructions || data.translatedTitle)) {
        const translatedInst = data.translatedInstructions || sourceTextInst;
        const translatedTitle = data.translatedTitle || sourceTextTitle;
        const translatedDesc = data.translatedDescription || sourceTextDesc;

        setTranslatedContent({
          title: translatedTitle,
          description: translatedDesc,
          instructions: translatedInst,
        });
        setDynamicLang(target);

        if (Array.isArray(data.translatedComments)) {
          const commMap: Record<string, string> = {};
          data.translatedComments.forEach((tc: { id: string; message: string }) => {
            if (tc && tc.id && tc.message) {
              commMap[tc.id] = tc.message;
            }
          });
          setTranslatedComments(commMap);
        }

        // Guardar y persistir la traducción en almacenamiento local y notificar al componente padre
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
        if (onRecipeUpdated) {
          onRecipeUpdated(updatedRecipe);
        }
      } else {
        // En caso de fallo o modo sin conexión, mantener el texto limpio sin corromperlo con Spanglish
        const fallbackTitle = translateTextSmart(sourceTextTitle, sourceLang, target);
        const fallbackDesc = translateTextSmart(sourceTextDesc, sourceLang, target);
        const fallbackCommMap: Record<string, string> = {};
        comments.forEach((c) => {
          fallbackCommMap[c.id] = translateTextSmart(c.message, sourceLang, target) || c.message;
        });

        setTranslatedContent({
          title: fallbackTitle || sourceTextTitle,
          description: fallbackDesc || sourceTextDesc,
          instructions: sourceTextInst,
        });
        setTranslatedComments(fallbackCommMap);
        setDynamicLang(target);
      }
    } catch (err) {
      console.warn('Instant translation error:', err);
      const fallbackTitle = translateTextSmart(sourceTextTitle, sourceLang, target);
      const fallbackDesc = translateTextSmart(sourceTextDesc, sourceLang, target);
      const fallbackCommMap: Record<string, string> = {};
      comments.forEach((c) => {
        fallbackCommMap[c.id] = translateTextSmart(c.message, sourceLang, target) || c.message;
      });

      setTranslatedContent({
        title: fallbackTitle || sourceTextTitle,
        description: fallbackDesc || sourceTextDesc,
        instructions: sourceTextInst,
      });
      setTranslatedComments(fallbackCommMap);
      setDynamicLang(target);
    } finally {
      setTranslatingView(false);
    }
  }, [
    comments,
    displayedDesc,
    displayedTitle,
    dynamicLang,
    hasValidEn,
    hasValidEs,
    ingredients,
    onRecipeUpdated,
    recipe,
  ]);

  // Auto-traducción fluida: Si la app está en inglés y las instrucciones están en español (o viceversa),
  // se traducen automáticamente con Chef IA para que el usuario las lea en su idioma sin tener que apretar el botón
  useEffect(() => {
    let isMounted = true;
    if (needsTranslationToActiveLang && !translatingView) {
      const timer = setTimeout(() => {
        if (isMounted) {
          handleInstantTranslate(dynamicLang);
        }
      }, 50);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [recipe.id, dynamicLang, needsTranslationToActiveLang, translatingView, handleInstantTranslate]);

  const handleShareWhatsApp = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const isEs = dynamicLang === 'ES';
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

            {/* Botón Compartir por WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              title={dynamicLang === 'ES' ? 'Enviar receta por WhatsApp' : 'Send recipe via WhatsApp'}
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
                {recipe.servings || 1} {dynamicLang === 'ES' ? 'Porciones' : 'Servings'}
              </span>
              <span className="bg-[#2C3523] text-[#F7F5EC] px-2.5 py-1 rounded-lg font-semibold">
                {getCategoryLabel(recipe.category, dynamicLang)}
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
                  onClick={() => handleInstantTranslate(targetForTranslateAction)}
                  disabled={translatingView}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition-colors"
                  title={targetForTranslateAction === 'EN' ? 'Traducir receta al inglés' : 'Traducir receta al español'}
                >
                  {translatingView ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-600" />}
                  <span>
                    {targetForTranslateAction === 'EN'
                      ? (dynamicLang === 'EN' ? 'Translate to English' : 'Traducir al Inglés')
                      : (dynamicLang === 'EN' ? 'Translate to Spanish' : 'Traducir al Español')}
                  </span>
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
                  {dynamicLang === 'ES' ? 'Traduciendo receta completa (instrucciones, descripción y comentarios)...' : 'Translating complete recipe (instructions, description and comments)...'}
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
              {comments.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleInstantTranslate(dynamicLang)}
                  disabled={translatingView}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition-colors"
                  title={dynamicLang === 'ES' ? 'Traducir comentarios' : 'Translate comments'}
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>{dynamicLang === 'ES' ? 'Traducir comentarios' : 'Translate comments'}</span>
                </button>
              )}
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
                {comments.map((c) => {
                  const isTranslated = Boolean(translatedComments[c.id]);
                  const isViewingOriginal = showOriginalComments[c.id];
                  const messageToShow = isTranslated && !isViewingOriginal ? translatedComments[c.id] : c.message;

                  return (
                    <div key={c.id} className="bg-[#EFECE1]/60 p-3 rounded-xl border border-[#D8D3C4] text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[#2C3523] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-[#2C3523] text-white flex items-center justify-center text-[10px]">
                            {c.user_name ? c.user_name.charAt(0).toUpperCase() : 'C'}
                          </span>
                          @{c.user_name || 'chef'}
                        </span>
                        <div className="flex items-center gap-2">
                          {isTranslated && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowOriginalComments((prev) => ({
                                  ...prev,
                                  [c.id]: !prev[c.id],
                                }))
                              }
                              className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer underline"
                            >
                              {isViewingOriginal
                                ? (dynamicLang === 'ES' ? 'Ver traducción' : 'See translation')
                                : (dynamicLang === 'ES' ? 'Ver original' : 'See original')}
                            </button>
                          )}
                          <span className="text-[10px] text-stone-400">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                      <p className="text-[#5C6650] leading-relaxed pl-6.5">{messageToShow}</p>
                    </div>
                  );
                })}
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

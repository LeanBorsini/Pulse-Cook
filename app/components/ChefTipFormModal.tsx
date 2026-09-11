'use client';

import { useState } from 'react';
import { ChefTip, TipCategoryKey } from '@/app/types';
import { CHEF_TIP_CATEGORIES } from '@/lib/chefTipsData';
import { X, Sparkles, Image as ImageIcon, Clock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { translateTextSmart, cleanToPureEnglish, cleanToPureSpanish } from '@/lib/recipeTranslator';

interface ChefTipFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tipData: Partial<ChefTip>) => Promise<void>;
  initialTip?: ChefTip | null;
  lang: 'ES' | 'EN';
}

export function ChefTipFormModal({
  isOpen,
  onClose,
  onSave,
  initialTip,
  lang,
}: ChefTipFormModalProps) {
  const isEs = lang === 'ES';

  const [prevTipId, setPrevTipId] = useState<string | null>(initialTip?.id || null);
  const [title, setTitle] = useState(() => {
    if (!initialTip) return '';
    return isEs
      ? initialTip.title_es || initialTip.title_en || ''
      : initialTip.title_en || initialTip.title_es || '';
  });
  const [summary, setSummary] = useState(() => {
    if (!initialTip) return '';
    return isEs
      ? initialTip.summary_es || initialTip.summary_en || ''
      : initialTip.summary_en || initialTip.summary_es || '';
  });
  const [content, setContent] = useState(() => {
    if (!initialTip) return '';
    return isEs
      ? initialTip.content_es || initialTip.content_en || ''
      : initialTip.content_en || initialTip.content_es || '';
  });
  const [category, setCategory] = useState<TipCategoryKey>(initialTip?.category || 'knife_skills');
  const [imageUrl, setImageUrl] = useState(initialTip?.image_url || '');
  const [readTimeSeconds, setReadTimeSeconds] = useState(initialTip?.read_time_seconds || 45);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sincronizar si cambia el tip a editar
  if (initialTip?.id !== prevTipId) {
    setPrevTipId(initialTip?.id || null);
    setTitle(
      isEs
        ? initialTip?.title_es || initialTip?.title_en || ''
        : initialTip?.title_en || initialTip?.title_es || ''
    );
    setSummary(
      isEs
        ? initialTip?.summary_es || initialTip?.summary_en || ''
        : initialTip?.summary_en || initialTip?.summary_es || ''
    );
    setContent(
      isEs
        ? initialTip?.content_es || initialTip?.content_en || ''
        : initialTip?.content_en || initialTip?.content_es || ''
    );
    setCategory(initialTip?.category || 'knife_skills');
    setImageUrl(initialTip?.image_url || '');
    setReadTimeSeconds(initialTip?.read_time_seconds || 45);
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanSummary = summary.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      setErrorMsg(isEs ? 'El título del tip es obligatorio.' : 'Tip title is required.');
      return;
    }
    if (!cleanSummary) {
      setErrorMsg(
        isEs ? 'El truco relámpago (resumen) es obligatorio.' : 'Flash hack (summary) is required.'
      );
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      // Traducción automática por detrás asistida por IA / endpoint de traducción
      let translatedTitle = '';
      let translatedSummary = '';
      let translatedContent = '';

      const sourceLang = isEs ? 'ES' : 'EN';
      const targetLang = isEs ? 'EN' : 'ES';

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: cleanTitle,
            description: cleanSummary,
            instructions: cleanContent || cleanSummary,
            sourceLang,
            targetLang,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data) {
            translatedTitle = data.translatedTitle || '';
            translatedSummary = data.translatedDescription || '';
            translatedContent = cleanContent ? (data.translatedInstructions || '') : '';
          }
        }
      } catch (apiErr) {
        console.warn('API translation background notice, using heuristic translator:', apiErr);
      }

      // Fallback heurístico inteligente si la API no devolvió algún campo
      if (!translatedTitle) {
        translatedTitle = translateTextSmart(cleanTitle, sourceLang, targetLang);
      }
      if (!translatedSummary) {
        translatedSummary = translateTextSmart(cleanSummary, sourceLang, targetLang);
      }
      if (cleanContent && !translatedContent) {
        translatedContent = translateTextSmart(cleanContent, sourceLang, targetLang);
      }

      const finalTitleEs = isEs ? cleanTitle : (translatedTitle || cleanTitle);
      const finalTitleEn = isEs ? (translatedTitle || cleanTitle) : cleanTitle;

      const finalSummaryEs = isEs ? cleanSummary : (translatedSummary || cleanSummary);
      const finalSummaryEn = isEs ? (translatedSummary || cleanSummary) : cleanSummary;

      const finalContentEs = cleanContent
        ? (isEs ? cleanContent : (translatedContent || cleanContent))
        : finalSummaryEs;
      const finalContentEn = cleanContent
        ? (isEs ? (translatedContent || cleanContent) : cleanContent)
        : finalSummaryEn;

      await onSave({
        id: initialTip?.id,
        title_es: isEs ? finalTitleEs : cleanToPureSpanish(finalTitleEs),
        title_en: isEs ? cleanToPureEnglish(finalTitleEn) : finalTitleEn,
        summary_es: isEs ? finalSummaryEs : cleanToPureSpanish(finalSummaryEs),
        summary_en: isEs ? cleanToPureEnglish(finalSummaryEn) : finalSummaryEn,
        content_es: finalContentEs,
        content_en: finalContentEn,
        category,
        image_url: imageUrl.trim() || undefined,
        read_time_seconds: readTimeSeconds,
      });

      onClose();
    } catch (err) {
      console.error('Error saving chef tip:', err);
      setErrorMsg(isEs ? 'Error al guardar el tip. Inténtalo de nuevo.' : 'Error saving tip. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      id="chef-tip-form-backdrop"
    >
      <div
        className="w-full max-w-xl bg-[#FAF8F2] border border-[#D8D3C4] rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={
          initialTip
            ? isEs
              ? 'Editar Tip de Chef'
              : 'Edit Chef Tip'
            : isEs
            ? 'Nuevo Tip de Chef'
            : 'New Chef Tip'
        }
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#EFECE1] border-b border-[#D8D3C4]">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C3523] leading-tight font-handwritten">
                {initialTip
                  ? isEs
                    ? 'Editar Tip Culinario'
                    : 'Edit Chef Tip'
                  : isEs
                  ? 'Nuevo Tip Relámpago de Chef'
                  : 'New Flash Chef Tip'}
              </h3>
              <p className="text-[11px] text-[#5C6650]">
                {isEs
                  ? 'Escribe en tu idioma. La IA traduce y adapta todo al inglés por detrás.'
                  : 'Write in your language. AI handles translations in the background.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5C6650] hover:text-[#2C3523] hover:bg-[#D8D3C4]/40 transition-colors cursor-pointer disabled:opacity-40"
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Categoría Temática */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650] mb-2">
              {isEs ? 'Categoría Temática' : 'Hack Category'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHEF_TIP_CATEGORIES.map((cat) => {
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-start gap-1 transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-[#2C3523] bg-[#2C3523] text-white shadow-xs'
                        : 'border-[#D8D3C4] bg-[#F7F5EC] text-[#2C3523] hover:bg-[#EFECE1]'
                    }`}
                  >
                    <span className="text-[11px] opacity-90">{cat.tag}</span>
                    <span className="text-xs truncate w-full font-semibold">
                      {isEs ? cat.label_es : cat.label_en}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título (UN SOLO CAMPO) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650]">
              {isEs ? 'Título del Tip' : 'Tip Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isEs
                  ? 'Ej: La regla del trapo húmedo bajo la tabla de cortar'
                  : 'Ex: The damp towel rule under your cutting board'
              }
              className="w-full px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-xl text-xl sm:text-2xl font-handwritten font-bold text-[#2C3523] tracking-wide focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30"
              required
              disabled={isSaving}
            />
          </div>

          {/* Resumen Relámpago (UN SOLO CAMPO) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650]">
              {isEs ? 'Truco Relámpago (Resumen directo)' : 'Flash Hack (Direct summary)'}
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder={
                isEs
                  ? 'Explica el truco en 1 o 2 oraciones prácticas y al grano...'
                  : 'Explain the hack in 1 or 2 practical, straightforward sentences...'
              }
              className="w-full px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-xl font-cozy text-xs sm:text-sm text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 resize-none"
              required
              disabled={isSaving}
            />
          </div>

          {/* Explicación Ampliada / Detalle Científico (Opcional - UN SOLO CAMPO) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650]">
                {isEs
                  ? '¿Por qué funciona? / Detalle culinario (Opcional)'
                  : 'Why does it work? / Culinary detail (Optional)'}
              </label>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder={
                isEs
                  ? 'Explicación técnica, el fundamento culinario o consejo adicional...'
                  : 'Technical explanation, culinary reason or additional tip...'
              }
              className="w-full px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-xl font-cozy text-xs sm:text-sm text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 resize-none"
              disabled={isSaving}
            />
          </div>

          {/* Imagen y Tiempo de Lectura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650] mb-1.5 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{isEs ? 'URL de Imagen (Opcional)' : 'Image URL (Optional)'}</span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-white border border-[#D8D3C4] rounded-xl text-xs text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{isEs ? 'Tiempo de lectura' : 'Read Time'}</span>
              </label>
              <select
                value={readTimeSeconds}
                onChange={(e) => setReadTimeSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[#D8D3C4] rounded-xl text-xs font-semibold text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 cursor-pointer"
                disabled={isSaving}
              >
                <option value={30}>30 {isEs ? 'segundos (Relámpago)' : 'seconds (Flash)'}</option>
                <option value={45}>45 {isEs ? 'segundos (Recomendado)' : 'seconds (Standard)'}</option>
                <option value={60}>60 {isEs ? 'segundos (Detallado)' : 'seconds (Detailed)'}</option>
              </select>
            </div>
          </div>

          {/* Banner discreto indicando asistencia por IA */}
          <div className="flex items-center gap-2 p-2.5 bg-[#F4F1E8] border border-[#E2DDD0] rounded-xl text-[11px] text-[#5C6650]">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isEs
                ? 'Al guardar, la IA genera y optimiza automáticamente la versión en inglés por detrás sin pasos adicionales.'
                : 'Upon saving, AI automatically generates and optimizes the English/Spanish translation in the background.'}
            </span>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D8D3C4]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-[#5C6650] hover:text-[#2C3523] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2C3523] text-[#FAF8F2] hover:bg-[#3D4932] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>{isEs ? 'Traduciendo y guardando...' : 'Translating and saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {initialTip
                      ? isEs
                        ? 'Actualizar Tip'
                        : 'Update Tip'
                      : isEs
                      ? 'Publicar Tip'
                      : 'Publish Tip'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

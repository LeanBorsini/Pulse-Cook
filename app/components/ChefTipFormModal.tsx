'use client';

import { useState } from 'react';
import { ChefTip, TipCategoryKey } from '@/app/types';
import { CHEF_TIP_CATEGORIES } from '@/lib/chefTipsData';
import { X, Sparkles, Image as ImageIcon, Clock, Check, AlertCircle } from 'lucide-react';
import { translateTextSmart } from '@/lib/recipeTranslator';

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
  const [titleEs, setTitleEs] = useState(initialTip?.title_es || '');
  const [titleEn, setTitleEn] = useState(initialTip?.title_en || '');
  const [summaryEs, setSummaryEs] = useState(initialTip?.summary_es || '');
  const [summaryEn, setSummaryEn] = useState(initialTip?.summary_en || '');
  const [contentEs, setContentEs] = useState(initialTip?.content_es || '');
  const [contentEn, setContentEn] = useState(initialTip?.content_en || '');
  const [category, setCategory] = useState<TipCategoryKey>(initialTip?.category || 'knife_skills');
  const [imageUrl, setImageUrl] = useState(initialTip?.image_url || '');
  const [readTimeSeconds, setReadTimeSeconds] = useState(initialTip?.read_time_seconds || 45);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (initialTip?.id !== prevTipId) {
    setPrevTipId(initialTip?.id || null);
    setTitleEs(initialTip?.title_es || '');
    setTitleEn(initialTip?.title_en || '');
    setSummaryEs(initialTip?.summary_es || '');
    setSummaryEn(initialTip?.summary_en || '');
    setContentEs(initialTip?.content_es || '');
    setContentEn(initialTip?.content_en || '');
    setCategory(initialTip?.category || 'knife_skills');
    setImageUrl(initialTip?.image_url || '');
    setReadTimeSeconds(initialTip?.read_time_seconds || 45);
  }

  if (!isOpen) return null;

  const handleAutoTranslate = async () => {
    if (!titleEs.trim() && !summaryEs.trim()) {
      setErrorMsg(
        isEs
          ? 'Introduce primero el título o resumen en español para traducir.'
          : 'Enter title or summary in Spanish first to translate.'
      );
      return;
    }

    setIsTranslating(true);
    setErrorMsg('');
    try {
      if (titleEs.trim() && !titleEn.trim()) {
        const transTitle = translateTextSmart(titleEs, 'ES', 'EN');
        setTitleEn(transTitle);
      }
      if (summaryEs.trim() && !summaryEn.trim()) {
        const transSummary = translateTextSmart(summaryEs, 'ES', 'EN');
        setSummaryEn(transSummary);
      }
      if (contentEs.trim() && !contentEn.trim()) {
        const transContent = translateTextSmart(contentEs, 'ES', 'EN');
        setContentEn(transContent);
      }
    } catch (err) {
      console.warn('Auto translation warning:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEs.trim()) {
      setErrorMsg(isEs ? 'El título en español es obligatorio.' : 'Spanish title is required.');
      return;
    }
    if (!summaryEs.trim()) {
      setErrorMsg(
        isEs ? 'El resumen o truco relámpago es obligatorio.' : 'Short summary is required.'
      );
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      await onSave({
        id: initialTip?.id,
        title_es: titleEs.trim(),
        title_en: titleEn.trim() || titleEs.trim(),
        summary_es: summaryEs.trim(),
        summary_en: summaryEn.trim() || summaryEs.trim(),
        content_es: contentEs.trim() || summaryEs.trim(),
        content_en: contentEn.trim() || summaryEn.trim() || contentEs.trim(),
        category,
        image_url: imageUrl.trim() || undefined,
        read_time_seconds: readTimeSeconds,
      });
      onClose();
    } catch (err) {
      console.error('Error saving tip:', err);
      setErrorMsg(isEs ? 'Error al guardar el tip.' : 'Error saving tip.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
                  ? 'Consejo corto y profesional (30-60 seg de lectura)'
                  : 'Short, practical professional hack (30-60s read)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5C6650] hover:text-[#2C3523] hover:bg-[#D8D3C4]/40 transition-colors cursor-pointer"
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

          {/* Título en Español e Inglés */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650]">
                {isEs ? 'Título Directo' : 'Catchy Title'}
              </label>
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={isTranslating}
                className="flex items-center gap-1 text-[11px] font-bold text-[#2C3523] hover:underline cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {isTranslating
                    ? isEs
                      ? 'Traduciendo...'
                      : 'Translating...'
                    : isEs
                    ? 'Auto-traducir inglés'
                    : 'Auto-translate English'}
                </span>
              </button>
            </div>

            <div>
              <input
                type="text"
                value={titleEs}
                onChange={(e) => setTitleEs(e.target.value)}
                placeholder={
                  isEs
                    ? 'Ej: La regla del trapo húmedo bajo la tabla'
                    : 'Ej: The damp towel rule under your board'
                }
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-xl text-xs sm:text-sm font-semibold text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30"
                required
              />
              <span className="text-[10px] text-[#5C6650] mt-0.5 block">
                {isEs ? 'Versión en Español (Principal)' : 'Spanish Version (Main)'}
              </span>
            </div>

            <div>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Ex: The damp towel rule under your cutting board"
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-xl text-xs sm:text-sm font-medium text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30"
              />
              <span className="text-[10px] text-[#5C6650] mt-0.5 block">
                {isEs ? 'Versión en Inglés (Opcional)' : 'English Version (Optional)'}
              </span>
            </div>
          </div>

          {/* Resumen Relámpago (2-3 oraciones) */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650]">
              {isEs ? 'Truco Relámpago (Resumen 2-3 frases)' : 'Flash Hack (2-3 sentences summary)'}
            </label>

            <div>
              <textarea
                value={summaryEs}
                onChange={(e) => setSummaryEs(e.target.value)}
                rows={2}
                placeholder={
                  isEs
                    ? 'Explica el truco en 2 o 3 frases directas y prácticas...'
                    : 'Explain the hack in 2 or 3 direct, practical sentences...'
                }
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-xl text-xs sm:text-sm text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 resize-none"
                required
              />
              <span className="text-[10px] text-[#5C6650] mt-0.5 block">
                {isEs ? 'Resumen en Español' : 'Summary in Spanish'}
              </span>
            </div>

            <div>
              <textarea
                value={summaryEn}
                onChange={(e) => setSummaryEn(e.target.value)}
                rows={2}
                placeholder="English summary..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-xl text-xs sm:text-sm text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 resize-none"
              />
              <span className="text-[10px] text-[#5C6650] mt-0.5 block">
                {isEs ? 'Resumen en Inglés (Opcional)' : 'Summary in English (Optional)'}
              </span>
            </div>
          </div>

          {/* Explicación Ampliada / Detalle Científico (Opcional) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650]">
              {isEs
                ? 'El Porqué Científico o Detallado (Opcional)'
                : 'The Science & Detail (Optional)'}
            </label>
            <textarea
              value={contentEs}
              onChange={(e) => setContentEs(e.target.value)}
              rows={3}
              placeholder={
                isEs
                  ? '¿Por qué ocurre esto? Explicación técnica o consejo adicional...'
                  : 'Why does this work? Scientific reason or extra tip...'
              }
              className="w-full px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-xl text-xs sm:text-sm text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 resize-none"
            />
          </div>

          {/* Imagen y Tiempo de Lectura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650] mb-1.5 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{isEs ? 'URL de Imagen' : 'Image URL'}</span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-white border border-[#D8D3C4] rounded-xl text-xs text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6650] mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{isEs ? 'Tiempo estimado' : 'Read Time'}</span>
              </label>
              <select
                value={readTimeSeconds}
                onChange={(e) => setReadTimeSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[#D8D3C4] rounded-xl text-xs font-semibold text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 cursor-pointer"
              >
                <option value={30}>30 {isEs ? 'segundos (Relámpago)' : 'seconds (Flash)'}</option>
                <option value={45}>45 {isEs ? 'segundos (Recomendado)' : 'seconds (Standard)'}</option>
                <option value={60}>60 {isEs ? 'segundos (Detallado)' : 'seconds (Detailed)'}</option>
              </select>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D8D3C4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5C6650] hover:text-[#2C3523] rounded-xl transition-colors cursor-pointer"
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2C3523] text-[#FAF8F2] hover:bg-[#3D4932] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSaving
                  ? isEs
                    ? 'Guardando...'
                    : 'Saving...'
                  : initialTip
                  ? isEs
                    ? 'Actualizar Tip'
                    : 'Update Tip'
                  : isEs
                  ? 'Publicar Tip'
                  : 'Publish Tip'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

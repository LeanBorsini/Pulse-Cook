'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Recipe, VideoLink } from '../types';
import { User } from '@supabase/supabase-js';
import { uploadRecipeImage } from '@/lib/storage';
import { Sparkles, Loader2, Plus, Trash2, Video, X, Upload, Image as ImageIcon, Star, Link } from 'lucide-react';

interface RecipeFormModalProps {
  recipeToEdit?: Recipe | null;
  lang: 'ES' | 'EN';
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_TAGS = [
  'Sin Gluten',
  'Sin Lácteos',
  'Vegetariano',
  'Vegano',
  'Sin Frutos Secos',
  'Keto / Low Carb',
  'Rápido (<20m)',
  'Postre',
  'Almuerzo / Cena',
];

export function RecipeFormModal({
  recipeToEdit,
  lang,
  user,
  onClose,
  onSuccess,
}: RecipeFormModalProps) {
  const [titleEs, setTitleEs] = useState(recipeToEdit?.title_es || '');
  const [titleEn, setTitleEn] = useState(recipeToEdit?.title_en || '');
  const [category, setCategory] = useState(recipeToEdit?.category || 'General');
  const [prepTime, setPrepTime] = useState(recipeToEdit?.prep_time || 15);
  const [servings, setServings] = useState(recipeToEdit?.servings || 1);
  const [descEs, setDescEs] = useState(recipeToEdit?.description_es || '');
  const [descEn, setDescEn] = useState(recipeToEdit?.description_en || '');
  const [instEs, setInstEs] = useState(recipeToEdit?.instructions_es || '');
  const [instEn, setInstEn] = useState(recipeToEdit?.instructions_en || '');

  // Manejo de Imágenes (Límite máximo 3)
  const initialImages: string[] =
    recipeToEdit?.images && recipeToEdit.images.length > 0
      ? recipeToEdit.images
      : recipeToEdit?.image_url
      ? [recipeToEdit.image_url]
      : [];

  const [images, setImages] = useState<string[]>(initialImages);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manejo de múltiples videos
  const initialVideos: VideoLink[] =
    recipeToEdit?.video_links && recipeToEdit.video_links.length > 0
      ? recipeToEdit.video_links
      : recipeToEdit?.youtube_url
      ? [{ id: '1', title: 'Video Tutorial', url: recipeToEdit.youtube_url }]
      : [];

  const [videos, setVideos] = useState<VideoLink[]>(initialVideos);

  // Manejo de etiquetas gastronómicas dinámicas
  const [selectedTags, setSelectedTags] = useState<string[]>(recipeToEdit?.dietary_tags || []);
  const [customTagInput, setCustomTagInput] = useState('');

  // Estados de IA y guardado
  const [translating, setTranslating] = useState(false);
  const [translationSuccess, setTranslationSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auto-traducción inteligente con Gemini
  const handleAutoTranslate = async (source: 'ES' | 'EN') => {
    const isSourceEs = source === 'ES';
    const sourceTitle = isSourceEs ? titleEs : titleEn;
    const sourceDesc = isSourceEs ? descEs : descEn;
    const sourceInst = isSourceEs ? instEs : instEn;

    if (!sourceTitle && !sourceDesc && !sourceInst) {
      alert(
        lang === 'ES'
          ? 'Por favor escribe al menos el título o las instrucciones antes de traducir.'
          : 'Please write at least the title or instructions before translating.'
      );
      return;
    }

    setTranslating(true);
    setTranslationSuccess(false);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sourceTitle,
          description: sourceDesc,
          instructions: sourceInst,
          sourceLang: isSourceEs ? 'ES' : 'EN',
          targetLang: isSourceEs ? 'EN' : 'ES',
        }),
      });

      const data = await res.json();

      if (res.ok && data) {
        if (isSourceEs) {
          if (data.translatedTitle) setTitleEn(data.translatedTitle);
          if (data.translatedDescription) setDescEn(data.translatedDescription);
          if (data.translatedInstructions) setInstEn(data.translatedInstructions);
        } else {
          if (data.translatedTitle) setTitleEs(data.translatedTitle);
          if (data.translatedDescription) setDescEs(data.translatedDescription);
          if (data.translatedInstructions) setInstEs(data.translatedInstructions);
        }

        // Si la IA sugiere tags no incluidos, agregarlos opcionalmente
        if (data.suggestedTags && Array.isArray(data.suggestedTags)) {
          setSelectedTags((prev) => {
            const combined = [...prev];
            data.suggestedTags.forEach((tag: string) => {
              if (tag && !combined.includes(tag) && combined.length < 8) {
                combined.push(tag);
              }
            });
            return combined;
          });
        }

        setTranslationSuccess(true);
        setTimeout(() => setTranslationSuccess(false), 3000);
      } else {
        alert(data.error || 'Error en la traducción con IA');
      }
    } catch (err) {
      console.error('Translation call failed:', err);
      alert('No se pudo conectar con el servicio de traducción.');
    } finally {
      setTranslating(false);
    }
  };

  // Video Management
  const addVideoField = () => {
    setVideos((prev) => [
      ...prev,
      { id: Date.now().toString(), title: `Video ${prev.length + 1}`, url: '' },
    ]);
  };

  const removeVideoField = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVideoField = (id: string, field: 'title' | 'url', value: string) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  // Tags Management
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = customTagInput.trim();
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags((prev) => [...prev, clean]);
      setCustomTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  // Manejo de carga de fotos (Máximo 3 imágenes)
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const availableSlots = 3 - images.length;
    if (availableSlots <= 0) {
      alert(
        lang === 'ES'
          ? 'Límite alcanzado: Máximo 3 imágenes por receta para optimizar el rendimiento.'
          : 'Limit reached: Maximum 3 images per recipe to keep the app lightweight.'
      );
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);
    setUploadingImage(true);

    try {
      const uploadPromises = filesToUpload.map((file) =>
        uploadRecipeImage(file, user?.id || 'guest')
      );
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(Boolean);

      setImages((prev) => [...prev, ...validUrls].slice(0, 3));
    } catch (err) {
      console.warn('Error uploading files:', err);
      alert(lang === 'ES' ? 'Error al subir una o más imágenes.' : 'Error uploading images.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddImageUrl = () => {
    const cleanUrl = customImageUrl.trim();
    if (!cleanUrl) return;

    if (images.length >= 3) {
      alert(
        lang === 'ES'
          ? 'Límite alcanzado: Máximo 3 imágenes por receta.'
          : 'Limit reached: Maximum 3 images per recipe.'
      );
      return;
    }

    setImages((prev) => [...prev, cleanUrl].slice(0, 3));
    setCustomImageUrl('');
    setShowUrlInput(false);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetCoverImage = (indexToCover: number) => {
    if (indexToCover === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(indexToCover, 1);
      return [selected, ...copy];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const validVideos = videos.filter((v) => v.url.trim() !== '');

    const recipeData = {
      title_es: titleEs,
      title_en: titleEn || titleEs,
      category,
      prep_time: Number(prepTime),
      servings: Number(servings),
      description_es: descEs,
      description_en: descEn || descEs,
      instructions_es: instEs,
      instructions_en: instEn || instEs,
      image_url: images[0] || '',
      images: images,
      youtube_url: validVideos[0]?.url || '',
      video_links: validVideos,
      user_id: user?.id,
      dietary_tags: selectedTags,
    };

    let error;
    if (recipeToEdit?.id) {
      const { error: err } = await supabase
        .from('recipes')
        .update(recipeData)
        .eq('id', recipeToEdit.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('recipes').insert([recipeData]);
      error = err;
    }

    setSaving(false);
    if (!error) {
      onSuccess();
    } else {
      alert('Error guardando la receta: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#2C3523]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#5C6650] hover:bg-[#EFECE1] hover:text-[#2C3523] transition-colors"
          title={lang === 'ES' ? 'Cerrar' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between gap-2 mb-4 border-b border-[#D8D3C4]/60 pb-3">
          <h2 className="text-xl font-serif font-bold text-[#2C3523]">
            {recipeToEdit
              ? lang === 'ES' ? 'Editar Receta' : 'Edit Recipe'
              : lang === 'ES' ? 'Crear Nueva Receta' : 'Create New Recipe'}
          </h2>
          
          {/* Botón de Auto-traducción con IA */}
          <button
            type="button"
            onClick={() => handleAutoTranslate(titleEs ? 'ES' : 'EN')}
            disabled={translating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2C3523] text-[#F7F5EC] text-xs font-semibold rounded-xl hover:bg-[#3D4932] disabled:opacity-50 transition-all shadow-sm"
          >
            {translating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{lang === 'ES' ? 'Traduciendo...' : 'Translating...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{lang === 'ES' ? 'Auto-Traducir con IA' : 'Auto-Translate with AI'}</span>
              </>
            )}
          </button>
        </div>

        {translationSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2.5 rounded-xl mb-4 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            {lang === 'ES' ? '¡Traducción completada con éxito!' : 'Translation completed successfully!'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          {/* Títulos bilingües */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Título en Español' : 'Title in Spanish'} *
              </label>
              <input
                type="text"
                required
                value={titleEs}
                onChange={(e) => setTitleEs(e.target.value)}
                placeholder="Ej. Tarta de Manzana Casera"
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Título en Inglés (o autotraducir)' : 'Title in English'}
              </label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. Homemade Apple Pie"
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
              />
            </div>
          </div>

          {/* Categoría, Tiempo y Porciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Categoría' : 'Category'}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Postres, Pastas"
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Tiempo Prep (min)' : 'Prep Time (min)'}
              </label>
              <input
                type="number"
                min="1"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Porciones' : 'Servings'}
              </label>
              <input
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
              />
            </div>
          </div>

          {/* Descripciones Bilingües */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Descripción (Español)' : 'Description (Spanish)'}
              </label>
              <textarea
                rows={2}
                value={descEs}
                onChange={(e) => setDescEs(e.target.value)}
                placeholder="Breve reseña del plato..."
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Descripción (Inglés)' : 'Description (English)'}
              </label>
              <textarea
                rows={2}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                placeholder="Short description in English..."
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
              />
            </div>
          </div>

          {/* Instrucciones Bilingües */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Paso a paso (Español)' : 'Step by step (Spanish)'}
              </label>
              <textarea
                rows={4}
                value={instEs}
                onChange={(e) => setInstEs(e.target.value)}
                placeholder="1. Mezclar los ingredientes...&#10;2. Hornear a 180°C..."
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Paso a paso (Inglés)' : 'Step by step (English)'}
              </label>
              <textarea
                rows={4}
                value={instEn}
                onChange={(e) => setInstEn(e.target.value)}
                placeholder="1. Mix the ingredients...&#10;2. Bake at 350°F..."
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2.5 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all font-mono"
              />
            </div>
          </div>

          {/* Gestor de Fotos de la Receta (Hasta 3 fotos) */}
          <div className="bg-[#EFECE1]/60 p-3.5 rounded-xl border border-[#D8D3C4] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2C3523] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                {lang === 'ES' ? 'Fotos de la Receta' : 'Recipe Photos'}
                <span className="text-[11px] font-normal text-[#5C6650]">
                  ({images.length}/3 {lang === 'ES' ? 'máx' : 'max'})
                </span>
              </label>

              {images.length < 3 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] font-semibold text-[#5C6650] hover:text-[#2C3523] flex items-center gap-1"
                  >
                    <Link className="w-3 h-3" />
                    {lang === 'ES' ? 'Por URL' : 'By URL'}
                  </button>
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-semibold text-[#2C3523] hover:underline flex items-center gap-1 bg-[#F7F5EC] px-2.5 py-1 rounded-lg border border-[#D8D3C4]"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    {lang === 'ES' ? 'Subir Foto' : 'Upload Photo'}
                  </button>
                </div>
              )}
            </div>

            {/* Input oculto para subir archivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            {/* Formulario desplegable para agregar por URL */}
            {showUrlInput && images.length < 3 && (
              <div className="flex gap-2 p-2 bg-[#F7F5EC] rounded-xl border border-[#D8D3C4] animate-fadeIn">
                <input
                  type="url"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 bg-transparent text-xs outline-none px-2"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1 bg-[#2C3523] text-[#F7F5EC] text-xs font-semibold rounded-lg hover:bg-[#3D4932]"
                >
                  {lang === 'ES' ? 'Añadir' : 'Add'}
                </button>
              </div>
            )}

            {/* Galería de Miniaturas */}
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {images.map((imgSrc, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-[#D8D3C4] bg-stone-200 aspect-video shadow-sm"
                  >
                    <img
                      src={imgSrc}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Badge de Portada */}
                    {idx === 0 ? (
                      <div className="absolute top-1.5 left-1.5 bg-[#2C3523]/90 backdrop-blur-sm text-[#F7F5EC] text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                        <Star className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                        <span>{lang === 'ES' ? 'Portada' : 'Cover'}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCoverImage(idx)}
                        className="absolute top-1.5 left-1.5 bg-black/60 hover:bg-black/80 text-white text-[9px] font-medium px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title={lang === 'ES' ? 'Hacer foto principal' : 'Make cover'}
                      >
                        {lang === 'ES' ? 'Hacer Portada' : 'Make Cover'}
                      </button>
                    )}

                    {/* Botón para eliminar foto */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title={lang === 'ES' ? 'Eliminar foto' : 'Delete photo'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Slot para añadir más si hay espacio */}
                {images.length < 3 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border-2 border-dashed border-[#D8D3C4] hover:border-[#2C3523] bg-[#F7F5EC]/60 hover:bg-[#F7F5EC] flex flex-col items-center justify-center p-2 cursor-pointer transition-colors aspect-video text-[#5C6650] hover:text-[#2C3523]"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin mb-1 text-[#2C3523]" />
                    ) : (
                      <Upload className="w-4 h-4 mb-1" />
                    )}
                    <span className="text-[10px] font-medium">
                      {uploadingImage
                        ? lang === 'ES' ? 'Subiendo...' : 'Uploading...'
                        : lang === 'ES' ? '+ Añadir foto' : '+ Add photo'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilesSelected(e.dataTransfer.files);
                }}
                className="rounded-xl border-2 border-dashed border-[#D8D3C4] hover:border-[#2C3523] bg-[#F7F5EC] p-4 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-[#5C6650] mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-[#2C3523]">
                  {lang === 'ES' ? 'Haz clic o arrastra hasta 3 fotos aquí' : 'Click or drop up to 3 photos here'}
                </p>
                <p className="text-[11px] text-[#5C6650] mt-0.5">
                  {lang === 'ES' ? 'JPG, PNG o WebP (Comprimidas automáticamente)' : 'JPG, PNG or WebP (Auto compressed)'}
                </p>
              </div>
            )}
          </div>

          {/* Múltiples Links de Video (YouTube / Tutoriales) */}
          <div className="bg-[#EFECE1]/60 p-3.5 rounded-xl border border-[#D8D3C4]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#2C3523] flex items-center gap-1.5">
                <Video className="w-4 h-4 text-red-600" />
                {lang === 'ES' ? 'Videos & Tutoriales (Múltiples Enlaces)' : 'Videos & Tutorials (Multiple Links)'}
              </label>
              <button
                type="button"
                onClick={addVideoField}
                className="text-[11px] font-semibold text-[#2C3523] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {lang === 'ES' ? 'Añadir Video' : 'Add Video'}
              </button>
            </div>

            {videos.length === 0 ? (
              <p className="text-[11px] text-[#5C6650] italic">
                {lang === 'ES' ? 'Sin enlaces de video añadidos.' : 'No video links added.'}
              </p>
            ) : (
              <div className="space-y-2">
                {videos.map((vid) => (
                  <div key={vid.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={vid.title}
                      onChange={(e) => updateVideoField(vid.id, 'title', e.target.value)}
                      placeholder="Título del video (ej. Masa, Horneado)"
                      className="w-1/3 bg-[#F7F5EC] border border-[#D8D3C4] p-2 rounded-lg text-xs"
                    />
                    <input
                      type="url"
                      value={vid.url}
                      onChange={(e) => updateVideoField(vid.id, 'url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1 bg-[#F7F5EC] border border-[#D8D3C4] p-2 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeVideoField(vid.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title={lang === 'ES' ? 'Eliminar enlace' : 'Delete link'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Etiquetas Gastronómicas Dinámicas */}
          <div>
            <label className="block text-xs font-semibold text-[#2C3523] mb-1.5">
              {lang === 'ES' ? 'Etiquetas Gastronómicas & Dietarias' : 'Dietary & Culinary Tags'}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {COMMON_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                      active
                        ? 'bg-[#2C3523] text-[#F7F5EC] border-[#2C3523]'
                        : 'bg-[#EFECE1] text-[#5C6650] border-[#D8D3C4] hover:bg-[#E2DEC2]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Tags seleccionados actuales y agregar personalizados */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#EFECE1] border border-[#D8D3C4] rounded-xl">
              {selectedTags.map((t) => (
                <span
                  key={t}
                  className="bg-[#2C3523] text-[#F7F5EC] px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-amber-300 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="flex-1 min-w-[120px] flex items-center gap-1">
                <input
                  type="text"
                  placeholder={lang === 'ES' ? 'Nuevo tag...' : 'New tag...'}
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={addCustomTag}
                  className="w-full bg-transparent text-xs outline-none text-[#2C3523] px-1"
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="px-2 py-0.5 bg-[#D8D3C4] hover:bg-[#C5BEAD] text-[#2C3523] rounded text-[10px] font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#D8D3C4]/60 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#EFECE1] hover:bg-[#E2DEC2] text-[#2C3523] rounded-xl font-semibold text-xs border border-[#D8D3C4] transition-colors"
            >
              {lang === 'ES' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#2C3523] text-[#F7F5EC] rounded-xl font-semibold text-xs hover:bg-[#3D4932] disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving
                ? lang === 'ES' ? 'Guardando receta...' : 'Saving recipe...'
                : lang === 'ES' ? 'Guardar Receta' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

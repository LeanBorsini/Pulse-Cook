'use client';

/**
 * @file RecipeFormModal.tsx
 * @description Modal de creación y edición completa de recetas.
 *
 * Características:
 * - Soporte para carga y edición bilingüe simultánea.
 * - Auto-traducción asistida por IA (o diccionario offline de respaldo) al guardar o con botón interactivo.
 * - Subida y compresión de hasta 3 fotos con previsualización inmediata.
 * - Gestión dinámica de ingredientes con cantidades y unidades normalizadas.
 * - Enlace a YouTube con reproductor embebido y múltiples enlaces adicionales.
 * - Selección de etiquetas dietéticas rápidas (chips).
 * - Guardado híbrido: actualiza `localStorage` de forma inmediata e intenta sincronizar con Supabase si está disponible.
 */

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Recipe, VideoLink, Ingredient } from '../types';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Link,
  Video,
  UploadCloud,
  Check,
  Globe,
  Utensils,
  ChefHat,
  Camera,
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { uploadRecipeImage } from '@/lib/storage';
import { saveLocalRecipe, getLocalIngredients } from '@/lib/recipeStore';
import { translateTextSmart } from '@/lib/recipeTranslator';

interface RecipeFormModalProps {
  recipeToEdit?: Recipe | null;
  lang: 'ES' | 'EN';
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_TAGS = [
  'Vegetariano',
  'Vegano',
  'Sin Gluten',
  'Keto',
  'Bajo en Carbohidratos',
  'Rápido (<30min)',
  'Fácil',
  'Repostería',
  'Pasta',
  'Carne',
  'Pescado',
  'Saludable',
];

export function RecipeFormModal({
  recipeToEdit,
  lang,
  user,
  onClose,
  onSuccess,
}: RecipeFormModalProps) {
  const isEs = lang === 'ES';

  // Identificar el idioma inicial en el que se redactará la receta
  const [formInputLang, setFormInputLang] = useState<'ES' | 'EN'>(lang);

  // Un solo campo de texto principal espacioso para el usuario
  const [title, setTitle] = useState(() => {
    if (!recipeToEdit) return '';
    return isEs
      ? recipeToEdit.title_es || recipeToEdit.title_en || ''
      : recipeToEdit.title_en || recipeToEdit.title_es || '';
  });

  const [description, setDescription] = useState(() => {
    if (!recipeToEdit) return '';
    return isEs
      ? recipeToEdit.description_es || recipeToEdit.description_en || ''
      : recipeToEdit.description_en || recipeToEdit.description_es || '';
  });

  const [instructions, setInstructions] = useState(() => {
    if (!recipeToEdit) return '';
    return isEs
      ? recipeToEdit.instructions_es || recipeToEdit.instructions_en || ''
      : recipeToEdit.instructions_en || recipeToEdit.instructions_es || '';
  });

  // Ingredientes
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    if (recipeToEdit?.id) {
      return getLocalIngredients(recipeToEdit.id);
    }
    return [
      { name_es: '', name_en: '', amount: 1, unit: '' }
    ];
  });

  // Campos complementarios
  const [category, setCategory] = useState(recipeToEdit?.category || 'General');
  const [prepTime, setPrepTime] = useState<number>(recipeToEdit?.prep_time || 25);
  const [servings, setServings] = useState<number>(recipeToEdit?.servings || 4);

  // Imágenes (hasta 3 fotos)
  const [images, setImages] = useState<string[]>(() => {
    if (recipeToEdit?.images && recipeToEdit.images.length > 0) {
      return recipeToEdit.images;
    }
    if (recipeToEdit?.image_url && recipeToEdit.image_url.trim() !== '') {
      return [recipeToEdit.image_url];
    }
    return [];
  });
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Videos
  const [videos, setVideos] = useState<VideoLink[]>(
    recipeToEdit?.video_links && recipeToEdit.video_links.length > 0
      ? recipeToEdit.video_links
      : recipeToEdit?.youtube_url
      ? [{ id: '1', title: 'Video', url: recipeToEdit.youtube_url }]
      : []
  );

  // Etiquetas
  const [selectedTags, setSelectedTags] = useState<string[]>(recipeToEdit?.dietary_tags || []);
  const [customTagInput, setCustomTagInput] = useState('');

  // Estados de guardado y auto-traducción en segundo plano
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  // Ingredients Management
  const addIngredientField = () => {
    setIngredients((prev) => [
      ...prev,
      { name_es: '', name_en: '', amount: 1, unit: '' }
    ]);
  };

  const removeIngredientField = (index: number) => {
    setIngredients((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateIngredientField = (
    index: number,
    field: keyof Ingredient,
    value: string | number
  ) => {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Videos Management
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

  // Manejo de carga de imágenes
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const availableSlots = 3 - images.length;
    if (availableSlots <= 0) {
      alert(
        isEs
          ? 'Límite alcanzado: Máximo 3 imágenes por receta.'
          : 'Limit reached: Maximum 3 images per recipe.'
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
      alert(isEs ? 'Error al subir una o más imágenes.' : 'Error uploading images.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleCameraCapture = async (file: File) => {
    const availableSlots = 3 - images.length;
    if (availableSlots <= 0) {
      alert(
        isEs
          ? 'Límite alcanzado: Máximo 3 imágenes por receta.'
          : 'Limit reached: Maximum 3 images per recipe.'
      );
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadRecipeImage(file, user?.id || 'guest');
      if (uploadedUrl) {
        setImages((prev) => [...prev, uploadedUrl].slice(0, 3));
      }
    } catch (err) {
      console.warn('Error uploading captured photo:', err);
      alert(isEs ? 'Error al procesar la foto tomada.' : 'Error processing captured photo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddImageUrl = () => {
    const cleanUrl = customImageUrl.trim();
    if (!cleanUrl) return;

    if (images.length >= 3) {
      alert(
        isEs
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

  // Guardar receta con Auto-Traducción transparente en segundo plano
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert(isEs ? 'Por favor introduce un título para la receta.' : 'Please provide a recipe title.');
      return;
    }

    setSaving(true);
    setStatusMessage(isEs ? 'Sincronizando y auto-traduciendo receta...' : 'Syncing & auto-translating recipe...');

    const validVideos = videos.filter((v) => v.url.trim() !== '');

    // Valores iniciales según el idioma en el que redactó el usuario
    let title_es = formInputLang === 'ES' ? title : '';
    let title_en = formInputLang === 'EN' ? title : '';
    let desc_es = formInputLang === 'ES' ? description : '';
    let desc_en = formInputLang === 'EN' ? description : '';
    let inst_es = formInputLang === 'ES' ? instructions : '';
    let inst_en = formInputLang === 'EN' ? instructions : '';

    // Llamada automática al motor Gemini para traducir el idioma faltante
    try {
      const sourceLang = formInputLang;
      const targetLang = formInputLang === 'ES' ? 'EN' : 'ES';

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          instructions,
          sourceLang,
          targetLang,
        }),
      });

      if (res.ok) {
        const translated = await res.json();
        if (sourceLang === 'ES') {
          title_en = translated.translatedTitle || title;
          desc_en = translated.translatedDescription || description;
          inst_en = translated.translatedInstructions || instructions;
        } else {
          title_es = translated.translatedTitle || title;
          desc_es = translated.translatedDescription || description;
          inst_es = translated.translatedInstructions || instructions;
        }

        // Si la IA sugiere nuevas etiquetas que enriquezcan la receta
        if (translated.suggestedTags && Array.isArray(translated.suggestedTags)) {
          translated.suggestedTags.forEach((t: string) => {
            if (t && !selectedTags.includes(t) && selectedTags.length < 8) {
              selectedTags.push(t);
            }
          });
        }
      } else {
        // Fallback: usar el diccionario inteligente culinario si la API de traducción no responde
        if (sourceLang === 'ES') {
          title_en = title;
          desc_en = description;
          inst_en = translateTextSmart(instructions, 'ES', 'EN');
        } else {
          title_es = title;
          desc_es = description;
          inst_es = translateTextSmart(instructions, 'EN', 'ES');
        }
      }
    } catch (err) {
      console.warn('Auto-translation failed during save, falling back to smart culinary dictionary:', err);
      if (formInputLang === 'ES') {
        title_en = title;
        desc_en = description;
        inst_en = translateTextSmart(instructions, 'ES', 'EN');
      } else {
        title_es = title;
        desc_es = description;
        inst_es = translateTextSmart(instructions, 'EN', 'ES');
      }
    }

    // Filtrar ingredientes válidos (con nombre)
    const validIngredients: Ingredient[] = ingredients
      .filter((ing) => (ing.name_es && ing.name_es.trim() !== '') || (ing.name_en && ing.name_en.trim() !== ''))
      .map((ing) => ({
        recipe_id: recipeToEdit?.id || '',
        name_es: ing.name_es?.trim() || ing.name_en?.trim() || '',
        name_en: ing.name_en?.trim() || ing.name_es?.trim() || '',
        amount: Number(ing.amount) || 1,
        unit: ing.unit?.trim() || '',
        aisle: ing.aisle || 'General',
      }));

    const recipeId = recipeToEdit?.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const recipeData: Recipe = {
      id: recipeId,
      title_es,
      title_en,
      category: category || 'General',
      prep_time: Number(prepTime) || 20,
      servings: Number(servings) || 4,
      description_es: desc_es,
      description_en: desc_en,
      instructions_es: inst_es,
      instructions_en: inst_en,
      image_url: images[0] || '',
      images: images,
      youtube_url: validVideos[0]?.url || '',
      video_links: validVideos,
      user_id: user?.id || 'local_user',
      profiles: {
        id: user?.id || 'local_user',
        username: user?.email ? user.email.split('@')[0] : 'Mi Cocina',
        avatar_url: '',
      },
      dietary_tags: selectedTags,
      avg_rating: recipeToEdit?.avg_rating,
      ratings_count: recipeToEdit?.ratings_count,
      user_rating: recipeToEdit?.user_rating,
      created_at: recipeToEdit?.created_at || new Date().toISOString(),
    };

    // 1. Guardar de forma 100% persistente en el almacenamiento local
    saveLocalRecipe(recipeData, validIngredients);

    // 2. Intentar guardar en Supabase en segundo plano si está disponible
    try {
      const supabasePayload = {
        title_es,
        title_en,
        category: category || 'General',
        prep_time: Number(prepTime) || 20,
        servings: Number(servings) || 4,
        description_es: desc_es,
        description_en: desc_en,
        instructions_es: inst_es,
        instructions_en: inst_en,
        image_url: images[0] || '',
        images: images,
        youtube_url: validVideos[0]?.url || '',
        video_links: validVideos,
        user_id: user?.id || null,
        dietary_tags: selectedTags,
      };

      if (recipeToEdit?.id && !recipeToEdit.id.startsWith('user_') && !recipeToEdit.id.startsWith('rec_')) {
        await supabase
          .from('recipes')
          .update(supabasePayload)
          .eq('id', recipeToEdit.id);
      } else if (user) {
        const { data: supaRecipe } = await supabase
          .from('recipes')
          .insert([supabasePayload])
          .select()
          .single();

        if (supaRecipe && validIngredients.length > 0) {
          const ingPayload = validIngredients.map((ing) => ({
            recipe_id: supaRecipe.id,
            name_es: ing.name_es,
            name_en: ing.name_en,
            amount: ing.amount,
            unit: ing.unit,
          }));
          await supabase.from('ingredients').insert(ingPayload);
        }
      }
    } catch (supaErr) {
      console.warn('Supabase sync skipped/offline, saved locally:', supaErr);
    }

    setSaving(false);
    setStatusMessage(null);
    onSuccess();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn"
    >
      <div className="bg-[#FDFBF7] border border-[#D8D3C4] rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[92vh] flex flex-col text-[#2C3523] overflow-hidden">
        
        {/* Barra Superior Fija (Sticky Header): Botón Cerrar SIEMPRE VISIBLE */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#D8D3C4] shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="p-1.5 bg-[#2C3523] text-white rounded-lg shrink-0">
              <ChefHat className="w-4 h-4 text-amber-300" />
            </div>
            <h2 className="text-sm sm:text-base font-serif font-bold text-[#2C3523] truncate">
              {recipeToEdit
                ? isEs ? 'Editar Receta' : 'Edit Recipe'
                : isEs ? 'Añadir Nueva Receta' : 'Add New Recipe'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Selector de idioma de redacción */}
            <button
              type="button"
              onClick={() => setFormInputLang(formInputLang === 'ES' ? 'EN' : 'ES')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2C3523] bg-[#EFECE1] hover:bg-[#E2DEC2] px-2.5 py-1.5 rounded-xl border border-[#D8D3C4] shadow-2xs transition-colors cursor-pointer"
              title={isEs ? 'Cambiar idioma de redacción' : 'Change writing language'}
            >
              <Globe className="w-3 h-3 text-[#5C6650]" />
              <span className="hidden xs:inline">{formInputLang === 'ES' ? 'Redactar en ES' : 'Writing in EN'}</span>
              <span className="xs:hidden">{formInputLang}</span>
            </button>

            {/* Botón Cerrar (X) - SIEMPRE VISIBLE */}
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-8 h-8 rounded-full bg-[#EAE5D6] hover:bg-[#DED8C6] active:scale-90 text-[#2C3523] flex items-center justify-center border border-[#D8D3C4] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title={isEs ? 'Cerrar' : 'Close'}
              aria-label={isEs ? 'Cerrar' : 'Close'}
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Formulario Scrolleable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <p className="text-xs text-[#737D67]">
            {isEs
              ? 'Escribe tu receta cómodamente. Se auto-traducirá en segundo plano al guardar.'
              : 'Write your recipe easily. It will automatically translate in the background when saved.'}
          </p>
          
          {/* 1. TÍTULO UNIFICADO Y ESPACIOSO */}
          <div>
            <label className="block text-xs font-bold text-[#2C3523] mb-1.5">
              {isEs ? 'Título de la receta' : 'Recipe Title'} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                formInputLang === 'ES'
                  ? 'Ej. Risotto cremoso de setas y parmesano'
                  : 'e.g. Creamy Mushroom and Parmesan Risotto'
              }
              className="w-full bg-[#F4F1EA] border border-[#D8D3C4] px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#2C3523] placeholder-[#8C987E] outline-none focus:border-[#2C3523] focus:ring-1 focus:ring-[#2C3523] transition-all"
            />
          </div>

          {/* 2. Categoría, Tiempo y Porciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#2C3523] mb-1">
                {isEs ? 'Categoría' : 'Category'}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={isEs ? 'Ej. Pastas, Postres' : 'e.g. Pasta, Desserts'}
                className="w-full bg-[#F4F1EA] border border-[#D8D3C4] px-3 py-2 rounded-xl text-xs font-medium outline-none focus:border-[#2C3523] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#2C3523] mb-1">
                {isEs ? 'Tiempo Prep (min)' : 'Prep Time (min)'}
              </label>
              <input
                type="number"
                min="1"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full bg-[#F4F1EA] border border-[#D8D3C4] px-3 py-2 rounded-xl text-xs font-medium outline-none focus:border-[#2C3523] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#2C3523] mb-1">
                {isEs ? 'Porciones' : 'Servings'}
              </label>
              <input
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full bg-[#F4F1EA] border border-[#D8D3C4] px-3 py-2 rounded-xl text-xs font-medium outline-none focus:border-[#2C3523] transition-all"
              />
            </div>
          </div>

          {/* 3. DESCRIPCIÓN UNIFICADA */}
          <div>
            <label className="block text-xs font-bold text-[#2C3523] mb-1.5">
              {isEs ? 'Breve descripción o historia del plato' : 'Short description or story'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                formInputLang === 'ES'
                  ? 'Un clásico reconfortante ideal para cenas especiales...'
                  : 'A comforting classic perfect for cozy dinner nights...'
              }
              className="w-full bg-[#F4F1EA] border border-[#D8D3C4] px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#2C3523] placeholder-[#8C987E] outline-none focus:border-[#2C3523] focus:ring-1 focus:ring-[#2C3523] transition-all"
            />
          </div>

          {/* 4. INGREDIENTES */}
          <div className="bg-[#FAF8F2] p-4 rounded-xl border border-[#E5DFD0] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2C3523] flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-[#425035]" />
                <span>{isEs ? 'Ingredientes' : 'Ingredients'}</span>
                <span className="text-[11px] font-normal text-[#737D67]">
                  ({ingredients.filter(i => i.name_es?.trim() || i.name_en?.trim()).length})
                </span>
              </label>
              <button
                type="button"
                onClick={addIngredientField}
                className="text-[11px] font-semibold text-[#2C3523] flex items-center gap-1 bg-[#EFECE1] px-2.5 py-1 rounded-lg border border-[#D8D3C4] hover:bg-[#E5E0D0] transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>{isEs ? 'Añadir Ingrediente' : 'Add Ingredient'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Cant."
                    value={ing.amount ?? 1}
                    onChange={(e) => updateIngredientField(idx, 'amount', Number(e.target.value))}
                    className="w-16 bg-[#F4F1EA] border border-[#D8D3C4] px-2 py-1.5 rounded-lg text-xs outline-none focus:border-[#2C3523]"
                  />
                  <input
                    type="text"
                    placeholder={isEs ? 'Unidad (g, ml, cda...)' : 'Unit (g, ml, tbsp...)'}
                    value={ing.unit || ''}
                    onChange={(e) => updateIngredientField(idx, 'unit', e.target.value)}
                    className="w-24 sm:w-28 bg-[#F4F1EA] border border-[#D8D3C4] px-2 py-1.5 rounded-lg text-xs outline-none focus:border-[#2C3523]"
                  />
                  <input
                    type="text"
                    placeholder={isEs ? 'Nombre del ingrediente (ej. Harina)' : 'Ingredient name (e.g. Flour)'}
                    value={isEs ? (ing.name_es || '') : (ing.name_en || ing.name_es || '')}
                    onChange={(e) => {
                      updateIngredientField(idx, 'name_es', e.target.value);
                      updateIngredientField(idx, 'name_en', e.target.value);
                    }}
                    className="flex-1 bg-[#F4F1EA] border border-[#D8D3C4] px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-[#2C3523]"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredientField(idx)}
                      className="p-1.5 text-[#737D67] hover:text-red-700 rounded-lg hover:bg-red-50"
                      title={isEs ? 'Eliminar' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. INSTRUCCIONES PASO A PASO UNIFICADAS Y AMPLIAS */}
          <div>
            <label className="block text-xs font-bold text-[#2C3523] mb-1.5 flex items-center justify-between">
              <span>{isEs ? 'Instrucciones paso a paso' : 'Step-by-step Instructions'}</span>
              <span className="text-[10px] font-normal text-[#737D67]">
                {isEs ? 'Escribe los pasos numerados o con guiones' : 'Numbered steps or bullet points'}
              </span>
            </label>
            <textarea
              rows={5}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                formInputLang === 'ES'
                  ? '1. En una sartén honda, dorar la cebolla y el ajo picados finamente con un chorrito de aceite de oliva.\n2. Añadir las setas laminadas y cocinar a fuego medio hasta que suelten su agua.\n3. Incorporar el arroz, tostar 1 minuto y verter el caldo poco a poco removiendo constantemente.\n4. Terminar con mantequilla y parmesano rallado.'
                  : '1. In a deep pan, sauté finely chopped onion and garlic in olive oil until translucent.\n2. Add sliced mushrooms and cook over medium heat until golden.\n3. Add the rice, toast for 1 minute, then pour warm broth gradually while stirring.\n4. Finish with butter and freshly grated parmesan.'
              }
              className="w-full bg-[#F4F1EA] border border-[#D8D3C4] px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#2C3523] placeholder-[#8C987E] outline-none focus:border-[#2C3523] focus:ring-1 focus:ring-[#2C3523] transition-all leading-relaxed"
            />
          </div>

          {/* 5. GESTOR DE FOTOS (Hasta 3 imágenes) */}
          <div className="bg-[#FAF8F2] p-4 rounded-xl border border-[#E5DFD0] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2C3523] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <span>{isEs ? 'Fotos de la Receta' : 'Recipe Photos'}</span>
                <span className="text-[11px] font-normal text-[#737D67]">
                  ({images.length}/3 {isEs ? 'máx' : 'max'})
                </span>
              </label>

              {images.length < 3 && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] font-semibold text-[#5C6650] hover:text-[#2C3523] flex items-center gap-1"
                  >
                    <Link className="w-3 h-3" />
                    <span className="hidden sm:inline">{isEs ? 'Por URL' : 'By URL'}</span>
                  </button>

                  {/* Botón Cámara en vivo */}
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => setShowCameraModal(true)}
                    className="text-[11px] font-semibold text-amber-950 flex items-center gap-1 bg-amber-200/80 hover:bg-amber-300/80 px-2.5 py-1 rounded-lg border border-amber-400/70 transition-colors shadow-2xs cursor-pointer"
                    title={isEs ? 'Abrir cámara para tomar foto' : 'Open camera to take photo'}
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-800" />
                    <span>{isEs ? 'Cámara' : 'Camera'}</span>
                  </button>

                  {/* Botón Subir Archivo */}
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-semibold text-[#2C3523] flex items-center gap-1 bg-[#EFECE1] px-2.5 py-1 rounded-lg border border-[#D8D3C4] hover:bg-[#E5E0D0] transition-colors cursor-pointer"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                    ) : (
                      <UploadCloud className="w-3 h-3 text-emerald-700" />
                    )}
                    <span>{isEs ? 'Subir' : 'Upload'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                </div>
              )}
            </div>

            {/* Input para URL manual */}
            {showUrlInput && images.length < 3 && (
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://ejemplo.com/foto-receta.jpg"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="flex-1 bg-[#F4F1EA] border border-[#D8D3C4] px-3 py-1.5 rounded-lg text-xs outline-none focus:border-[#2C3523]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 bg-[#2C3523] text-white rounded-lg text-xs font-semibold hover:bg-[#3D4932]"
                >
                  {isEs ? 'Añadir' : 'Add'}
                </button>
              </div>
            )}

            {/* Galería de miniaturas */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-lg overflow-hidden border border-[#D8D3C4] aspect-video bg-[#EAE5D6]"
                  >
                    <img
                      src={img}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 bg-[#2C3523] text-[#FDFBF7] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        {isEs ? 'Portada' : 'Cover'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity"
                      title={isEs ? 'Eliminar foto' : 'Delete photo'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Videos Multimedia */}
          <div className="bg-[#FAF8F2] p-4 rounded-xl border border-[#E5DFD0] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#2C3523] flex items-center gap-1.5">
                <Video className="w-4 h-4 text-red-600" />
                <span>{isEs ? 'Videos Culinarios' : 'Cooking Videos'}</span>
                <span className="text-[11px] font-normal text-[#737D67]">
                  (YouTube / Reels)
                </span>
              </label>
              <button
                type="button"
                onClick={addVideoField}
                className="text-[11px] font-semibold text-[#2C3523] flex items-center gap-1 bg-[#EFECE1] px-2.5 py-1 rounded-lg border border-[#D8D3C4] hover:bg-[#E5E0D0] transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>{isEs ? 'Añadir Video' : 'Add Video'}</span>
              </button>
            </div>

            {videos.map((vid) => (
              <div key={vid.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isEs ? 'Título ej. Paso a Paso' : 'Title e.g. Step by Step'}
                  value={vid.title}
                  onChange={(e) => updateVideoField(vid.id, 'title', e.target.value)}
                  className="w-1/3 bg-[#F4F1EA] border border-[#D8D3C4] px-2.5 py-1.5 rounded-lg text-xs outline-none"
                />
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={vid.url}
                  onChange={(e) => updateVideoField(vid.id, 'url', e.target.value)}
                  className="flex-1 bg-[#F4F1EA] border border-[#D8D3C4] px-2.5 py-1.5 rounded-lg text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeVideoField(vid.id)}
                  className="p-1.5 text-[#737D67] hover:text-red-700 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* 7. Etiquetas Gastronómicas */}
          <div>
            <label className="block text-xs font-bold text-[#2C3523] mb-1.5">
              {isEs ? 'Etiquetas Culinarias' : 'Dietary Tags & Filters'}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                      active
                        ? 'bg-[#2C3523] text-[#FDFBF7] border-[#2C3523]'
                        : 'bg-[#F4F1EA] text-[#5C6650] border-[#D8D3C4] hover:bg-[#EAE5D6]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={addCustomTag}
                placeholder={isEs ? 'Añadir etiqueta personalizada...' : 'Add custom tag...'}
                className="flex-1 bg-[#F4F1EA] border border-[#D8D3C4] px-3 py-1.5 rounded-lg text-xs outline-none"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-3 py-1.5 bg-[#EFECE1] hover:bg-[#E5E0D0] text-[#2C3523] font-semibold text-xs rounded-lg border border-[#D8D3C4]"
              >
                {isEs ? 'Añadir' : 'Add'}
              </button>
            </div>
          </div>

          {/* Estado de carga durante el guardado */}
          {statusMessage && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold animate-pulse">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Botones de acción finales */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFECE1]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-[#5C6650] hover:text-[#2C3523] rounded-xl hover:bg-[#EFECE1] transition-colors"
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2C3523] hover:bg-[#3D4932] text-[#FDFBF7] font-semibold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEs ? 'Guardando...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEs ? 'Guardar Receta' : 'Save Recipe'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Captura con Cámara en Vivo */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
        lang={lang}
      />
    </div>
  );
}

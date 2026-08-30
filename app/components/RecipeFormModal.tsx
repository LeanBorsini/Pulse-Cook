'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Recipe } from '../types';
import { User } from '@supabase/supabase-js';

interface RecipeFormModalProps {
  recipeToEdit?: Recipe | null;
  lang: 'ES' | 'EN';
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

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
  const [imageUrl, setImageUrl] = useState(recipeToEdit?.image_url || '');
  const [youtubeUrl, setYoutubeUrl] = useState(recipeToEdit?.youtube_url || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const recipeData = {
      title_es: titleEs,
      title_en: titleEn || titleEs,
      category,
      prep_time: Number(prepTime),
      servings: Number(servings),
      description_es: descEs,
      description_en: descEn || descEs,
      instructions_es: instEs,
      image_url: imageUrl,
      youtube_url: youtubeUrl,
      user_id: user?.id,
      dietary_tags: recipeToEdit?.dietary_tags || [],
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 font-bold hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-[#2C3523] mb-4">
          {recipeToEdit
            ? lang === 'ES' ? 'Editar Receta' : 'Edit Recipe'
            : lang === 'ES' ? 'Nueva Receta' : 'New Recipe'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Título (ES)</label>
            <input
              type="text"
              required
              value={titleEs}
              onChange={(e) => setTitleEs(e.target.value)}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Categoría</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">Tiempo (min)</label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Porciones</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Descripción (ES)</label>
            <textarea
              rows={2}
              value={descEs}
              onChange={(e) => setDescEs(e.target.value)}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Instrucciones (ES)</label>
            <textarea
              rows={4}
              value={instEs}
              onChange={(e) => setInstEs(e.target.value)}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">URL Imagen</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">URL YouTube</label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-lg"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-200 rounded-lg font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#2C3523] text-white rounded-lg font-bold hover:bg-[#3D4932]"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
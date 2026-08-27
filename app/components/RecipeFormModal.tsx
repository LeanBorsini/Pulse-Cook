'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Recipe, Ingredient } from '../types';

interface RecipeFormModalProps {
  lang: 'ES' | 'EN';
  isEditing: boolean;
  formRecipe: Partial<Recipe>;
  setFormRecipe: React.Dispatch<React.SetStateAction<Partial<Recipe>>>;
  formIngredients: Ingredient[];
  setFormIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const CATEGORIES = ['Snack', 'Main Dishes', 'Breakfast', 'Dessert', 'Dinner', 'Salad', 'Appetizers', 'Sauces & Dressings'];
const AVAILABLE_TAGS = ['glutenfree', 'dairyfree', 'vegetarian', 'vegan', 'nutfree', 'lowcarb', 'keto', 'quick'];

export function RecipeFormModal({
  lang,
  isEditing,
  formRecipe,
  setFormRecipe,
  formIngredients,
  setFormIngredients,
  onClose,
  onSubmit,
}: RecipeFormModalProps) {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `dishes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('recipes')
        .upload(filePath, file);

      if (uploadError) {
        alert(lang === 'ES' ? `Error: ${uploadError.message}` : uploadError.message);
        return;
      }

      const { data } = supabase.storage.from('recipes').getPublicUrl(filePath);

      setFormRecipe((prev) => ({
        ...prev,
        image_url: data.publicUrl,
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleAddIngredientRow = () => {
    setFormIngredients([
      ...formIngredients,
      { name_es: '', amount: 1, unit: 'g', aisle: 'General' },
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...formIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setFormIngredients(updated);
  };

  const toggleTag = (tag: string) => {
    const currentTags = formRecipe.dietary_tags || [];
    if (currentTags.includes(tag)) {
      setFormRecipe({
        ...formRecipe,
        dietary_tags: currentTags.filter((t) => t !== tag),
      });
    } else {
      setFormRecipe({
        ...formRecipe,
        dietary_tags: [...currentTags, tag],
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#F7F5EC] border border-[#D8D3C4]/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-[#2C3523] hover:bg-[#EFECE1]"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-serif font-bold text-[#2C3523] mb-4">
          {isEditing
            ? lang === 'ES' ? 'Editar Receta' : 'Edit Recipe'
            : lang === 'ES' ? 'Nueva Receta' : 'New Recipe'}
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2C3523] mb-1">
              {lang === 'ES' ? 'Título (Español)' : 'Title (Spanish)'}
            </label>
            <input
              type="text"
              required
              value={formRecipe.title_es || ''}
              onChange={(e) => setFormRecipe({ ...formRecipe, title_es: e.target.value })}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#2C3523]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3523] mb-1">
              {lang === 'ES' ? 'Título (Inglés)' : 'Title (English)'}
            </label>
            <input
              type="text"
              value={formRecipe.title_en || ''}
              onChange={(e) => setFormRecipe({ ...formRecipe, title_en: e.target.value })}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#2C3523]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3523] mb-1">
              {lang === 'ES' ? 'Foto del Plato' : 'Dish Photo'}
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 bg-[#EFECE1] border border-[#D8D3C4] px-4 py-2 rounded-lg text-xs font-semibold text-[#2C3523] cursor-pointer hover:bg-[#E2DEC2] transition-all">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading 
                    ? (lang === 'ES' ? 'Subiendo...' : 'Uploading...') 
                    : (lang === 'ES' ? 'Subir desde dispositivo' : 'Upload photo')}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              
              {formRecipe.image_url && (
                <div className="mt-2">
                  <img
                    src={formRecipe.image_url}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg border border-[#D8D3C4]"
                  />
                </div>
              )}

              <input
                type="url"
                placeholder={lang === 'ES' ? 'O pega la URL de una imagen directamente...' : 'Or paste direct image URL...'}
                value={formRecipe.image_url || ''}
                onChange={(e) => setFormRecipe({ ...formRecipe, image_url: e.target.value })}
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] px-3 py-1.5 rounded-lg text-xs outline-none focus:border-[#2C3523]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                {lang === 'ES' ? 'Categoría' : 'Category'}
              </label>
              <select
                value={formRecipe.category || 'Main Dishes'}
                onChange={(e) => setFormRecipe({ ...formRecipe, category: e.target.value })}
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#2C3523]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                  {lang === 'ES' ? 'Prep (min)' : 'Time (min)'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formRecipe.prep_time ?? 15}
                  onChange={(e) => setFormRecipe({ ...formRecipe, prep_time: Number(e.target.value) })}
                  className="w-full bg-[#EFECE1] border border-[#D8D3C4] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#2C3523]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2C3523] mb-1">
                  {lang === 'ES' ? 'Porciones' : 'Servings'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formRecipe.servings ?? 2}
                  onChange={(e) => setFormRecipe({ ...formRecipe, servings: Number(e.target.value) })}
                  className="w-full bg-[#EFECE1] border border-[#D8D3C4] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#2C3523]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3523] mb-1">
              {lang === 'ES' ? 'Descripción' : 'Description'}
            </label>
            <textarea
              rows={2}
              value={formRecipe.description_es || ''}
              onChange={(e) => setFormRecipe({ ...formRecipe, description_es: e.target.value })}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#2C3523]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3523] mb-1">
              {lang === 'ES' ? 'Instrucciones / Paso a Paso' : 'Cooking Instructions'}
            </label>
            <textarea
              rows={4}
              placeholder={lang === 'ES' ? '1. Hervir agua. 2. Añadir sal...' : '1. Boil water. 2. Add salt...'}
              value={formRecipe.instructions_es || ''}
              onChange={(e) => setFormRecipe({ ...formRecipe, instructions_es: e.target.value })}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#2C3523]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3523] mb-1">
              {lang === 'ES' ? 'URL de YouTube (Opcional)' : 'YouTube URL (Optional)'}
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={formRecipe.youtube_url || ''}
              onChange={(e) => setFormRecipe({ ...formRecipe, youtube_url: e.target.value })}
              className="w-full bg-[#EFECE1] border border-[#D8D3C4] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#2C3523]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3523] mb-1">
              {lang === 'ES' ? 'Etiquetas Dietéticas' : 'Dietary Tags'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((tag) => {
                const active = formRecipe.dietary_tags?.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                      active ? 'bg-[#2C3523] text-[#F7F5EC]' : 'bg-[#EFECE1] text-[#5C6650] border border-[#D8D3C4]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#D8D3C4] pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-[#2C3523]">
                {lang === 'ES' ? 'Ingredientes' : 'Ingredients'}
              </label>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="flex items-center gap-1 text-xs text-[#2C3523] font-semibold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                {lang === 'ES' ? 'Añadir Ingrediente' : 'Add Ingredient'}
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {formIngredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={lang === 'ES' ? 'Nombre' : 'Name'}
                    value={ing.name_es}
                    onChange={(e) => handleIngredientChange(idx, 'name_es', e.target.value)}
                    className="flex-1 bg-[#EFECE1] border border-[#D8D3C4] px-2 py-1 rounded text-xs outline-none focus:border-[#2C3523]"
                  />
                  <input
                    type="number"
                    step="any"
                    value={ing.amount}
                    onChange={(e) => handleIngredientChange(idx, 'amount', Number(e.target.value))}
                    className="w-16 bg-[#EFECE1] border border-[#D8D3C4] px-2 py-1 rounded text-xs outline-none focus:border-[#2C3523]"
                  />
                  <input
                    type="text"
                    placeholder="Unidad"
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                    className="w-16 bg-[#EFECE1] border border-[#D8D3C4] px-2 py-1 rounded text-xs outline-none focus:border-[#2C3523]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredientRow(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-[#2C3523] text-[#F7F5EC] py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3D4932] transition-all mt-4 disabled:opacity-50"
          >
            {isEditing
              ? lang === 'ES' ? 'Guardar Cambios' : 'Save Changes'
              : lang === 'ES' ? 'Crear Receta' : 'Create Recipe'}
          </button>
        </form>
      </div>
    </div>
  );
}
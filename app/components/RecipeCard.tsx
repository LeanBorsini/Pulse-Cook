'use client';

import { Clock, Users, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  lang: 'ES' | 'EN';
  isSelected: boolean;
  onOpenDetails: (recipe: Recipe) => void;
  onToggleMenu: (id: string) => void;
}

export function RecipeCard({
  recipe,
  lang,
  isSelected,
  onOpenDetails,
  onToggleMenu,
}: RecipeCardProps) {
  return (
    <div className="bg-[#F7F5EC]/80 backdrop-blur-sm border border-[#D8D3C4] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Banner de Categoría Header */}
        <div className="bg-[#2C3523] text-[#F7F5EC] px-4 py-2 font-semibold text-xs flex justify-between items-center">
          <span>{recipe.category}</span>
        </div>

        {/* Imagen de la Receta */}
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title_es}
            onClick={() => onOpenDetails(recipe)}
            className="w-full h-48 object-cover cursor-pointer hover:opacity-95 transition-opacity"
          />
        ) : (
          <div
            onClick={() => onOpenDetails(recipe)}
            className="w-full h-32 bg-[#EFECE1] border-b border-[#D8D3C4] flex items-center justify-center text-[#5C6650] text-xs font-medium cursor-pointer"
          >
            {lang === 'ES' ? 'Sin imagen' : 'No image'}
          </div>
        )}

        {/* Contenido de la Tarjeta */}
        <div className="p-5 cursor-pointer" onClick={() => onOpenDetails(recipe)}>
          <h3 className="font-serif text-lg font-bold text-[#2C3523] mb-2 hover:underline">
            {lang === 'ES' ? recipe.title_es : recipe.title_en || recipe.title_es}
          </h3>

          <p className="text-xs text-[#5C6650] line-clamp-2 mb-4">
            {lang === 'ES' ? recipe.description_es : recipe.description_en || recipe.description_es}
          </p>

          <div className="flex items-center gap-4 text-xs font-medium text-[#5C6650]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {lang === 'ES' ? `Prepr. ${recipe.prep_time}m` : `Prep ${recipe.prep_time}m`}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {recipe.servings} {lang === 'ES' ? 'Porciones' : 'Servings'}
            </span>
          </div>
        </div>
      </div>

      {/* Botón para Añadir al Menú Semanal */}
      <div className="px-5 pb-5 pt-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu(recipe.id);
          }}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
            isSelected
              ? 'bg-[#2C3523] text-[#F7F5EC] border-[#2C3523]'
              : 'border-[#D8D3C4] text-[#2C3523] hover:bg-[#EFECE1]'
          }`}
        >
          {isSelected ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {lang === 'ES' ? 'Añadida al Menú' : 'Added to Menu'}
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              {lang === 'ES' ? 'Añadir al Menú Semanal' : 'Add to Weekly Menu'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
'use client';

import { Recipe } from '../types';
import { User } from '@supabase/supabase-js';

interface RecipeCardProps {
  recipe: Recipe;
  lang: 'ES' | 'EN';
  isSelected: boolean;
  user: User | null;
  onOpenDetails: (recipe: Recipe) => void;
  onToggleMenu: (id: string) => void;
  onOpenAuth: () => void;
}

export function RecipeCard({
  recipe,
  lang,
  isSelected,
  user,
  onOpenDetails,
  onToggleMenu,
  onOpenAuth,
}: RecipeCardProps) {
  const title = lang === 'ES' ? recipe.title_es : (recipe.title_en || recipe.title_es);
  const authorName = recipe.profiles?.username || 'comunidad';

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onOpenAuth();
      return;
    }
    onToggleMenu(recipe.id);
  };

  return (
    <div className="bg-[#f2efe9] rounded-2xl overflow-hidden shadow-sm border border-stone-200 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        {/* Imagen */}
        <div
          className="relative h-48 w-full bg-stone-300 overflow-hidden cursor-pointer"
          onClick={() => onOpenDetails(recipe)}
        >
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-stone-400">Sin foto</div>
          )}
          <span className="absolute top-3 left-3 bg-stone-900/80 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
            {recipe.category}
          </span>
        </div>

        {/* Info */}
        <div className="p-4 cursor-pointer" onClick={() => onOpenDetails(recipe)}>
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-serif text-lg font-bold text-stone-800 line-clamp-1">{title}</h3>
          </div>

          <p className="text-xs text-stone-500 mb-3 font-medium">by @{authorName}</p>

          <div className="flex items-center gap-4 text-xs text-stone-600 mb-2">
            <span>⏱ Prep: {recipe.prep_time}m</span>
            <span>👥 {recipe.servings} {lang === 'ES' ? 'Porciones' : 'Servings'}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={handleMenuClick}
          className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors border ${
            isSelected
              ? 'bg-amber-600 text-white border-amber-600'
              : 'border-stone-300 text-stone-700 hover:bg-stone-200'
          }`}
        >
          {isSelected
            ? '✓ ' + (lang === 'ES' ? 'En el Menú' : 'In Menu')
            : '+ ' + (lang === 'ES' ? 'Añadir al Menú' : 'Add to Weekly Menu')}
        </button>
      </div>
    </div>
  );
}
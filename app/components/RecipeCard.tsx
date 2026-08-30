'use client';

import { Recipe } from '../types';
import { User } from '@supabase/supabase-js';

interface RecipeCardProps {
  recipe: Recipe & { profiles?: { username: string } };
  lang: 'ES' | 'EN';
  isSelected: boolean;
  user: User | null;
  onOpenDetails: (recipe: Recipe) => void;
  onToggleMenu: (recipeId: string) => void;
  onOpenAuth: () => void;
}

export function RecipeCard({
  recipe,
  lang,
  isSelected,
  user,
  onOpenDetails,
  onToggleMenu,
}: RecipeCardProps) {
  const title = lang === 'ES' ? recipe.title_es : recipe.title_en || recipe.title_es;
  const description =
    lang === 'ES' ? recipe.description_es : recipe.description_en || recipe.description_es;
  const authorName = recipe.profiles?.username || 'leanBorsini';

  return (
    <div className="bg-[#f9f8f6] rounded-2xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {recipe.image_url && (
          <img
            src={recipe.image_url}
            alt={title}
            className="w-full h-48 object-cover rounded-xl mb-4"
          />
        )}
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-bold text-stone-800">{title}</h2>
          <span className="text-xs bg-stone-200 text-stone-700 font-semibold px-2.5 py-1 rounded-full">
            ⏱️ {recipe.prep_time} min
          </span>
        </div>
        <p className="text-xs text-stone-500 mb-3 font-medium">Por @{authorName}</p>
        <p className="text-stone-600 text-sm line-clamp-2 mb-4">{description}</p>
      </div>

      <div className="flex gap-2 pt-2 border-t border-stone-200/60">
        <button
          onClick={() => onOpenDetails(recipe)}
          className="flex-1 py-2 bg-stone-200 text-stone-800 rounded-lg text-xs font-bold hover:bg-stone-300 transition-colors"
        >
          {lang === 'ES' ? 'Ver Receta' : 'View Recipe'}
        </button>
        <button
          onClick={() => onToggleMenu(recipe.id)}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
            isSelected
              ? 'bg-amber-500 text-white'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300'
          }`}
        >
          {isSelected ? '✓' : '+ Menu'}
        </button>
      </div>
    </div>
  );
}
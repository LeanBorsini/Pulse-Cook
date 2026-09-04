'use client';

import { Clock, Users, BookmarkCheck, Plus, Star, Images } from 'lucide-react';
import { Recipe } from '../types';
import { User } from '@supabase/supabase-js';
import { cleanToPureSpanish, cleanToPureEnglish } from '../../lib/recipeTranslator';
import { getCategoryLabel } from '@/lib/categories';

interface RecipeCardProps {
  recipe: Recipe;
  lang: 'ES' | 'EN';
  isSelected: boolean;
  user?: User | null;
  onOpenDetails: (recipe: Recipe) => void;
  onToggleMenu: (recipeId: string) => void;
  onOpenAuth?: () => void;
}

export function RecipeCard({
  recipe,
  lang,
  isSelected,
  onOpenDetails,
  onToggleMenu,
}: RecipeCardProps) {
  const rawTitle = lang === 'ES' ? (recipe.title_es || recipe.title_en || '') : (recipe.title_en || recipe.title_es || '');
  const title = lang === 'ES' ? cleanToPureSpanish(rawTitle) : cleanToPureEnglish(rawTitle);

  const rawDescription =
    lang === 'ES' ? (recipe.description_es || recipe.description_en || '') : (recipe.description_en || recipe.description_es || '');
  const description = lang === 'ES' ? cleanToPureSpanish(rawDescription) : cleanToPureEnglish(rawDescription);
  const authorName = recipe.profiles?.username || 'leanBorsini';

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMenu(recipe.id);
  };

  const hasRating = (recipe.avg_rating && recipe.avg_rating > 0) || (recipe.ratings_count && recipe.ratings_count > 0);
  const imagesCount = recipe.images?.length || (recipe.image_url ? 1 : 0);

  return (
    <div
      onClick={() => onOpenDetails(recipe)}
      className="bg-[#F7F5EC] rounded-2xl p-5 border border-[#D8D3C4] shadow-sm hover:shadow-md hover:border-[#2C3523]/40 transition-all flex flex-col justify-between cursor-pointer group"
    >
      <div>
        {recipe.image_url && (
          <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border border-[#D8D3C4]/60 bg-black/5 relative">
            <img
              src={recipe.image_url}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLElement).parentElement!.style.display = 'none';
              }}
            />
            {hasRating && (
              <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{recipe.avg_rating?.toFixed(1)}</span>
                <span className="text-[9px] text-stone-300 font-normal">({recipe.ratings_count})</span>
              </div>
            )}
            {imagesCount > 1 && (
              <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                <Images className="w-3 h-3" />
                <span>{imagesCount}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-start gap-2 mb-1.5">
          <h2 className="text-xl font-serif font-bold text-[#2C3523] group-hover:text-[#3D4932] transition-colors leading-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#5C6650] mb-2.5 font-medium flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EAE5D6] text-[#2C3523] border border-[#D8D3C4]/80">
            {getCategoryLabel(recipe.category, lang)}
          </span>
          <span>•</span>
          <span>by @{authorName}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {recipe.prep_time}m
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {recipe.servings}
          </span>
          {!recipe.image_url && hasRating && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                {recipe.avg_rating?.toFixed(1)} ({recipe.ratings_count})
              </span>
            </>
          )}
        </div>

        {description && (
          <p className="text-[#5C6650] text-xs leading-relaxed line-clamp-2 mb-4">
            {description}
          </p>
        )}

        {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {recipe.dietary_tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-[#EFECE1] border border-[#D8D3C4] text-[#2C3523] px-2 py-0.5 rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t border-[#D8D3C4]/60">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(recipe);
          }}
          className="flex-1 py-2 bg-[#EFECE1] text-[#2C3523] border border-[#D8D3C4] rounded-xl text-xs font-semibold hover:bg-[#E2DEC2] transition-colors"
        >
          {lang === 'ES' ? 'Ver Receta' : 'View Recipe'}
        </button>
        <button
          onClick={handleMenuClick}
          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
            isSelected
              ? 'bg-[#2C3523] text-[#F7F5EC] border border-[#2C3523]'
              : 'bg-[#EFECE1] text-[#2C3523] hover:bg-[#E2DEC2] border border-[#D8D3C4]'
          }`}
          title={lang === 'ES' ? 'Añadir al menú semanal' : 'Add to weekly menu'}
        >
          {isSelected ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ES' ? 'En Menú' : 'In Menu'}</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ES' ? 'Menú' : 'Menu'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

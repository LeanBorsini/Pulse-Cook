'use client';

import { Plus, ShoppingBag } from 'lucide-react';

interface HeaderProps {
  lang: 'ES' | 'EN';
  setLang: (lang: 'ES' | 'EN') => void;
  onOpenNewRecipe: () => void;
  selectedCount: number;
  onOpenShoppingList: () => void;
}

export function Header({
  lang,
  setLang,
  onOpenNewRecipe,
  selectedCount,
  onOpenShoppingList,
}: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-[#D8D3C4]">
      <div>
        <h1 className="text-6xl font-handwritten font-bold text-[#2C3523] -mb-2">
          Pulse&Cook
        </h1>
        <p className="text-sm text-[#5C6650]">
          {lang === 'ES' ? 'Recetario Personal & Familiar' : 'Personal & Family Recipe Book'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onOpenNewRecipe}
          className="flex items-center gap-2 bg-[#2C3523] text-[#F7F5EC] px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-[#3D4932] transition-all"
        >
          <Plus className="w-4 h-4" />
          {lang === 'ES' ? 'Nueva Receta' : 'Add Recipe'}
        </button>

        {selectedCount > 0 && (
          <button
            onClick={onOpenShoppingList}
            className="flex items-center gap-2 bg-[#4A533C] text-[#F7F5EC] px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-[#3D4932] transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            {lang === 'ES' ? `Ver Lista (${selectedCount})` : `View List (${selectedCount})`}
          </button>
        )}

        <button
          onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')}
          className="px-4 py-2 text-sm font-semibold border border-[#2C3523] rounded-full hover:bg-[#2C3523] hover:text-[#F7F5EC] transition-all"
        >
          {lang === 'ES' ? 'ES | EN' : 'EN | ES'}
        </button>
      </div>
    </header>
  );
}
'use client';

import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { RECIPE_CATEGORIES } from '@/lib/categories';

const TAG_TRANSLATIONS: Record<string, { ES: string; EN: string }> = {
  'glutenfree': { ES: 'Sin Gluten', EN: 'Gluten Free' },
  'dairyfree': { ES: 'Sin Lácteos', EN: 'Dairy Free' },
  'vegetarian': { ES: 'Vegetariano', EN: 'Vegetarian' },
  'vegan': { ES: 'Vegano', EN: 'Vegan' },
  'nutfree': { ES: 'Sin Frutos Secos', EN: 'Nut Free' },
  'lowcarb': { ES: 'Bajo en Carbohidratos', EN: 'Low Carb' },
  'keto': { ES: 'Keto', EN: 'Keto' },
  'quick': { ES: 'Rápido', EN: 'Quick' },
};

interface SearchBarProps {
  lang: 'ES' | 'EN';
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  selectedCategory?: string | null;
  setSelectedCategory?: (category: string | null) => void;
}

export function SearchBar({
  lang,
  searchTerm,
  setSearchTerm,
  selectedTag,
  setSelectedTag,
  selectedCategory,
  setSelectedCategory,
}: SearchBarProps) {
  const isEs = lang === 'ES';

  // Acceso directo a las categorías más frecuentes
  const quickCategories = ['main_dish', 'salad', 'pasta_rice', 'dessert', 'appetizer'];

  return (
    <section className="mb-8 space-y-3">
      {/* Campo de búsqueda principal */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3 text-[#5C6650]" />
        <input
          type="text"
          placeholder={isEs ? 'Buscar por nombre, ingrediente o categoría...' : 'Search by name, ingredient, or category...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#EFECE1] border border-[#D8D3C4] pl-11 pr-4 py-2.5 rounded-xl text-sm font-medium text-[#2C3523] placeholder-[#8C987E] outline-none focus:border-[#2C3523] focus:ring-1 focus:ring-[#2C3523] transition-all shadow-xs"
        />
      </div>

      {/* Filtro por Categorías Estandarizadas */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-[#5C6650] uppercase tracking-wider mr-1">
          {isEs ? 'Categoría:' : 'Category:'}
        </span>
        <button
          onClick={() => setSelectedCategory?.(null)}
          className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
            !selectedCategory
              ? 'bg-[#2C3523] text-[#F7F5EC] shadow-xs'
              : 'bg-[#EFECE1] text-[#5C6650] hover:text-[#2C3523] border border-[#D8D3C4]'
          }`}
        >
          {isEs ? 'Todas' : 'All'}
        </button>

        {quickCategories.map((catId) => {
          const cat = RECIPE_CATEGORIES.find((c) => c.id === catId);
          if (!cat) return null;
          const isSelected = selectedCategory === catId;
          return (
            <button
              key={catId}
              onClick={() => setSelectedCategory?.(isSelected ? null : catId)}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                isSelected
                  ? 'bg-[#2C3523] text-[#F7F5EC] shadow-xs'
                  : 'bg-[#EFECE1] text-[#5C6650] hover:text-[#2C3523] border border-[#D8D3C4]'
              }`}
            >
              {isEs ? cat.label_es : cat.label_en}
            </button>
          );
        })}

        {/* Combobox desplegable para acceder a cualquiera de las 13 categorías */}
        <div className="relative inline-flex items-center">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory?.(e.target.value ? e.target.value : null)}
            aria-label={isEs ? 'Más categorías gastronómicas' : 'More recipe categories'}
            className={`text-xs pl-2.5 pr-6 py-1 rounded-full font-semibold border transition-all appearance-none cursor-pointer outline-none ${
              selectedCategory && !quickCategories.includes(selectedCategory)
                ? 'bg-[#2C3523] text-[#F7F5EC] border-[#2C3523]'
                : 'bg-[#EFECE1] text-[#5C6650] border-[#D8D3C4] hover:text-[#2C3523]'
            }`}
          >
            <option value="" className="bg-[#FAF8F2] text-[#2C3523]">
              {isEs ? 'Más categorías...' : 'More categories...'}
            </option>
            {RECIPE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-[#FAF8F2] text-[#2C3523]">
                {isEs ? cat.label_es : cat.label_en}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 pointer-events-none absolute right-1.5 text-current opacity-70" />
        </div>
      </div>

      {/* Filtro por Dietas / Preferencias */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-bold text-[#5C6650] uppercase tracking-wider mr-1">
          {isEs ? 'Dieta:' : 'Diet:'}
        </span>
        {Object.keys(TAG_TRANSLATIONS).slice(0, 5).map((tagKey) => (
          <button
            key={tagKey}
            onClick={() => setSelectedTag(selectedTag === tagKey ? null : tagKey)}
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-all ${
              selectedTag === tagKey
                ? 'bg-[#5C6650] text-[#F7F5EC]'
                : 'bg-[#EFECE1]/70 text-[#5C6650] hover:text-[#2C3523] border border-[#D8D3C4]/80'
            }`}
          >
            {TAG_TRANSLATIONS[tagKey][lang]}
          </button>
        ))}
        {selectedTag && (
          <button
            onClick={() => setSelectedTag(null)}
            className="text-[11px] text-[#8C987E] hover:text-[#2C3523] underline ml-1 font-medium"
          >
            {isEs ? 'Limpiar dieta' : 'Clear diet'}
          </button>
        )}
      </div>
    </section>
  );
}

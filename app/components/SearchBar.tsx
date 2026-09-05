'use client';

/**
 * @file SearchBar.tsx
 * @description Barra de búsqueda y sistema de filtros desplegable tipo Combobox para Pulse&Cook.
 *
 * Características:
 * 1. Búsqueda en tiempo real por nombre de receta, ingrediente o categoría.
 * 2. Combobox desplegable (`SlidersHorizontal`) que oculta los filtros por defecto para una UI limpia.
 * 3. Selección múltiple e independiente de Categorías (OR) y Dietas/Preferencias (AND).
 * 4. Chips activos en pantalla con eliminación rápida individual (`✕`) y botón "Borrar todos".
 * 5. Cierre automático al hacer clic fuera (`click-outside`) y soporte bilingüe (ES/EN).
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Check, ChevronDown, RotateCcw } from 'lucide-react';
import { RECIPE_CATEGORIES } from '@/lib/categories';

export const DIET_TAG_TRANSLATIONS: Record<string, { ES: string; EN: string }> = {
  'glutenfree': { ES: 'Sin Gluten', EN: 'Gluten Free' },
  'dairyfree': { ES: 'Sin Lácteos', EN: 'Dairy Free' },
  'vegetarian': { ES: 'Vegetariano', EN: 'Vegetarian' },
  'vegan': { ES: 'Vegano', EN: 'Vegan' },
  'nutfree': { ES: 'Sin Frutos Secos', EN: 'Nut Free' },
  'lowcarb': { ES: 'Bajo en Carbohidratos', EN: 'Low Carb' },
  'quick': { ES: 'Rápido (<20 min)', EN: 'Quick (<20 min)' },
};

interface SearchBarProps {
  lang: 'ES' | 'EN';
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  // Soporte de selección múltiple (nuevos)
  selectedCategories?: string[];
  setSelectedCategories?: (categories: string[]) => void;
  selectedTags?: string[];
  setSelectedTags?: (tags: string[]) => void;
  // Compatibilidad hacia atrás (por si algún componente llama con single)
  selectedTag?: string | null;
  setSelectedTag?: (tag: string | null) => void;
  selectedCategory?: string | null;
  setSelectedCategory?: (category: string | null) => void;
}

export function SearchBar({
  lang,
  searchTerm,
  setSearchTerm,
  selectedCategories = [],
  setSelectedCategories,
  selectedTags = [],
  setSelectedTags,
  selectedTag,
  setSelectedTag,
  selectedCategory,
  setSelectedCategory,
}: SearchBarProps) {
  const isEs = lang === 'ES';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalización de categorías activas (arrays)
  const activeCategories: string[] =
    selectedCategories && selectedCategories.length > 0
      ? selectedCategories
      : selectedCategory
      ? [selectedCategory]
      : [];

  // Normalización de etiquetas de dieta activas (arrays)
  const activeTags: string[] =
    selectedTags && selectedTags.length > 0
      ? selectedTags
      : selectedTag
      ? [selectedTag]
      : [];

  const totalActiveFilters = activeCategories.length + activeTags.length;

  // Manejador toggle de categorías
  const toggleCategory = (catId: string) => {
    let next: string[];
    if (activeCategories.includes(catId)) {
      next = activeCategories.filter((c) => c !== catId);
    } else {
      next = [...activeCategories, catId];
    }

    if (setSelectedCategories) {
      setSelectedCategories(next);
    } else if (setSelectedCategory) {
      setSelectedCategory(next.length > 0 ? next[0] : null);
    }
  };

  // Manejador toggle de dietas
  const toggleTag = (tagKey: string) => {
    let next: string[];
    if (activeTags.includes(tagKey)) {
      next = activeTags.filter((t) => t !== tagKey);
    } else {
      next = [...activeTags, tagKey];
    }

    if (setSelectedTags) {
      setSelectedTags(next);
    } else if (setSelectedTag) {
      setSelectedTag(next.length > 0 ? next[0] : null);
    }
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    if (setSelectedCategories) setSelectedCategories([]);
    if (setSelectedCategory) setSelectedCategory(null);
    if (setSelectedTags) setSelectedTags([]);
    if (setSelectedTag) setSelectedTag(null);
  };

  // Cerrar combobox al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Obtener etiqueta legible de categoría
  const getCatLabel = (catId: string) => {
    const found = RECIPE_CATEGORIES.find((c) => c.id === catId);
    if (!found) return catId;
    return isEs ? found.label_es : found.label_en;
  };

  // Obtener etiqueta legible de dieta
  const getDietLabel = (tagKey: string) => {
    const found = DIET_TAG_TRANSLATIONS[tagKey];
    if (!found) return tagKey;
    return isEs ? found.ES : found.EN;
  };

  return (
    <section className="mb-6 relative" ref={dropdownRef}>
      {/* Barra superior de Búsqueda y Botón de Filtros Combobox */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#5C6650]" />
          <input
            type="text"
            placeholder={
              isEs
                ? 'Buscar por nombre, ingrediente o categoría...'
                : 'Search by name, ingredient, or category...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#EFECE1] border border-[#D8D3C4] pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-[#2C3523] placeholder-[#8C987E] outline-none focus:border-[#2C3523] focus:ring-1 focus:ring-[#2C3523] transition-all shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 p-1 rounded-full text-[#737D67] hover:text-[#2C3523] hover:bg-[#D8D3C4]/50 transition-colors"
              title={isEs ? 'Limpiar búsqueda' : 'Clear search'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botón Combobox Desplegable de Filtros */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border select-none ${
            isOpen || totalActiveFilters > 0
              ? 'bg-[#2C3523] text-[#F7F5EC] border-[#2C3523] shadow-xs'
              : 'bg-[#EFECE1] text-[#2C3523] border-[#D8D3C4] hover:bg-[#E2DEC2]'
          }`}
          title={isEs ? 'Mostrar u ocultar filtros de categorías y dietas' : 'Show or hide category and diet filters'}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden xs:inline">{isEs ? 'Filtros' : 'Filters'}</span>
          {totalActiveFilters > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isOpen || totalActiveFilters > 0
                  ? 'bg-[#F7F5EC] text-[#2C3523]'
                  : 'bg-[#2C3523] text-white'
              }`}
            >
              {totalActiveFilters}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Menú Desplegable Combobox */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-[#FDFBF7] border border-[#D8D3C4] rounded-2xl shadow-xl p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-150">
          {/* Cabecera del Combobox */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EAE5D6]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#2C3523]" />
              <h3 className="font-serif font-bold text-[#2C3523] text-sm sm:text-base">
                {isEs ? 'Filtros de búsqueda' : 'Search filters'}
              </h3>
              {totalActiveFilters > 0 && (
                <span className="text-xs text-[#5C6650] font-medium">
                  ({totalActiveFilters} {isEs ? 'activos' : 'active'})
                </span>
              )}
            </div>

            {totalActiveFilters > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-amber-900 hover:text-amber-950 font-semibold flex items-center gap-1 hover:underline cursor-pointer bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isEs ? 'Limpiar todo' : 'Clear all'}</span>
              </button>
            )}
          </div>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Sección Categorías (Múltiple) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#5C6650] uppercase tracking-wider">
                  {isEs ? 'Categoría' : 'Category'}
                </span>
                <span className="text-[10px] text-[#8C987E] italic">
                  {isEs ? '(puedes elegir varias)' : '(select multiple)'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {RECIPE_CATEGORIES.map((cat) => {
                  const isSelected = activeCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                        isSelected
                          ? 'bg-[#2C3523] text-[#F7F5EC] shadow-xs ring-1 ring-[#2C3523]'
                          : 'bg-[#EFECE1] text-[#4A553D] hover:text-[#2C3523] hover:bg-[#E5E0D0] border border-[#D8D3C4]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-amber-300" />}
                      <span>{isEs ? cat.label_es : cat.label_en}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sección Dietas y Preferencias (Múltiple) */}
            <div className="pt-2 border-t border-[#EAE5D6]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#5C6650] uppercase tracking-wider">
                  {isEs ? 'Dieta y Preferencias' : 'Diet & Preferences'}
                </span>
                <span className="text-[10px] text-[#8C987E] italic">
                  {isEs ? '(puedes elegir varias)' : '(select multiple)'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {Object.keys(DIET_TAG_TRANSLATIONS).map((tagKey) => {
                  const isSelected = activeTags.includes(tagKey);
                  return (
                    <button
                      key={tagKey}
                      type="button"
                      onClick={() => toggleTag(tagKey)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                        isSelected
                          ? 'bg-[#435235] text-[#F7F5EC] shadow-xs ring-1 ring-[#435235]'
                          : 'bg-[#EFECE1]/80 text-[#5C6650] hover:text-[#2C3523] hover:bg-[#E5E0D0] border border-[#D8D3C4]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-emerald-300" />}
                      <span>{DIET_TAG_TRANSLATIONS[tagKey][lang]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pie del Combobox: Botón Aplicar / Cerrar */}
          <div className="mt-4 pt-3 border-t border-[#EAE5D6] flex items-center justify-between">
            <span className="text-xs text-[#5C6650]">
              {totalActiveFilters === 0
                ? isEs ? 'Mostrando todas las recetas' : 'Showing all recipes'
                : `${totalActiveFilters} ${isEs ? (totalActiveFilters === 1 ? 'filtro seleccionado' : 'filtros seleccionados') : (totalActiveFilters === 1 ? 'filter selected' : 'filters selected')}`}
            </span>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 bg-[#2C3523] hover:bg-[#3D4932] text-[#FDFBF7] text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {isEs ? 'Aplicar / Cerrar' : 'Apply / Close'}
            </button>
          </div>
        </div>
      )}

      {/* Chips de Filtros Activos en Pantalla:
          SÓLO se muestran si hay filtros seleccionados.
          Por defecto, si no hay ninguno, esta fila NO existe, manteniendo la interfaz totalmente limpia. */}
      {totalActiveFilters > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 text-xs animate-in fade-in duration-200">
          <span className="text-[11px] font-semibold text-[#5C6650] mr-0.5">
            {isEs ? 'Filtros activos:' : 'Active filters:'}
          </span>

          {/* Chips de Categorías */}
          {activeCategories.map((catId) => (
            <span
              key={catId}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2C3523] text-[#F7F5EC] text-xs font-medium shadow-2xs"
            >
              <span>{getCatLabel(catId)}</span>
              <button
                type="button"
                onClick={() => toggleCategory(catId)}
                className="hover:opacity-75 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                title={isEs ? `Quitar categoría ${getCatLabel(catId)}` : `Remove category ${getCatLabel(catId)}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Chips de Dietas */}
          {activeTags.map((tagKey) => (
            <span
              key={tagKey}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#435235] text-[#F7F5EC] text-xs font-medium shadow-2xs"
            >
              <span>{getDietLabel(tagKey)}</span>
              <button
                type="button"
                onClick={() => toggleTag(tagKey)}
                className="hover:opacity-75 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                title={isEs ? `Quitar dieta ${getDietLabel(tagKey)}` : `Remove diet ${getDietLabel(tagKey)}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Botón Limpiar Todo */}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[11px] text-[#737D67] hover:text-[#2C3523] underline font-medium ml-1 cursor-pointer transition-colors"
          >
            {isEs ? 'Borrar todos' : 'Clear all'}
          </button>
        </div>
      )}
    </section>
  );
}


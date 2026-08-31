'use client';

import React from 'react';
import { Recipe, Ingredient } from '../types';
import { RemyIcon } from './RemyIcon';

interface RecipePrintViewProps {
  recipe: Recipe;
  lang: 'ES' | 'EN';
  servings: number;
  ingredients: Ingredient[];
  currentImage?: string | null;
}

export function RecipePrintView({
  recipe,
  lang,
  servings,
  ingredients,
  currentImage,
}: RecipePrintViewProps) {
  const isEs = lang === 'ES';
  const title = isEs ? recipe.title_es : recipe.title_en || recipe.title_es;
  const description = isEs ? recipe.description_es : recipe.description_en || recipe.description_es;
  const instructions = isEs ? recipe.instructions_es : recipe.instructions_en || recipe.instructions_es;
  const authorName = recipe.profiles?.username || 'leanBorsini';

  // Escalar cantidades de ingredientes según porciones si difiere
  const baseServings = recipe.servings || 1;
  const ratio = servings / baseServings;

  return (
    <div id="recipe-print-area" className="hidden print:block text-[#2C3523] bg-white p-8 max-w-[800px] mx-auto">
      {/* Encabezado con Marca Pulse&Cook y Remy */}
      <div className="flex items-center justify-between border-b-2 border-[#2C3523] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#2C3523] flex items-center justify-center text-amber-200">
            <RemyIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#2C3523]">Pulse & Cook</h1>
            <p className="text-xs text-[#5C6650] font-medium tracking-wide">
              {isEs ? 'Recetario Gourmet Digital • «Cualquiera puede cocinar»' : 'Gourmet Cookbook • «Anyone can cook»'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-[#F4F0E8] text-[#2C3523] text-xs font-bold rounded-lg border border-[#D8D3C4]">
            {recipe.category || 'General'}
          </span>
          <p className="text-[10px] text-[#7C886E] mt-1">
            {new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Título de la Receta y Metadata */}
      <div className="mb-6">
        <h2 className="text-3xl font-serif font-bold text-[#2C3523] mb-1">{title}</h2>
        <p className="text-xs text-[#7C886E] font-medium mb-3">by @{authorName}</p>
        {description && <p className="text-sm text-[#5C6650] italic leading-relaxed bg-[#FAF8F5] p-3 rounded-lg border border-[#D8D3C4]">{description}</p>}

        {/* Fila de Métricas */}
        <div className="grid grid-cols-4 gap-3 bg-[#FAF8F5] border border-[#D8D3C4] rounded-xl p-3 mt-4 text-center">
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#7C886E]">
              {isEs ? 'Tiempo Prep.' : 'Prep Time'}
            </span>
            <span className="text-sm font-black text-[#2C3523]">{recipe.prep_time || 15} min</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#7C886E]">
              {isEs ? 'Porciones' : 'Servings'}
            </span>
            <span className="text-sm font-black text-[#2C3523]">{servings}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#7C886E]">
              {isEs ? 'Categoría' : 'Category'}
            </span>
            <span className="text-sm font-black text-[#2C3523] capitalize">
              {recipe.category || 'General'}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#7C886E]">
              {isEs ? 'Ingredientes' : 'Ingredients'}
            </span>
            <span className="text-sm font-black text-[#2C3523]">{ingredients.length}</span>
          </div>
        </div>

        {/* Etiquetas Dietéticas */}
        {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {recipe.dietary_tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-[#F2EDE2] text-[#425035] text-[10px] font-bold rounded-md border border-[#D8D3C4]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Imagen Principal (si existe) */}
      {currentImage && (
        <div className="mb-6 rounded-xl overflow-hidden border border-[#D8D3C4] max-h-64 flex items-center justify-center bg-[#F4F0E8]">
          <img src={currentImage} alt={title} className="w-full h-64 object-cover" />
        </div>
      )}

      {/* Dos Columnas: Ingredientes e Instrucciones */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Columna Izquierda: Ingredientes (2 de 5) */}
        <div className="md:col-span-2 bg-[#FAF8F5] border border-[#D8D3C4] rounded-xl p-4 self-start">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#2C3523] border-b border-[#D8D3C4] pb-2 mb-3 flex items-center justify-between">
            <span>{isEs ? 'Ingredientes' : 'Ingredients'}</span>
            <span className="text-[11px] font-normal text-[#7C886E]">({servings} porc.)</span>
          </h3>
          <ul className="space-y-2">
            {ingredients.map((ing, idx) => {
              const ingName = isEs ? ing.name_es : ing.name_en || ing.name_es;
              const scaledAmount = Number((ing.amount * ratio).toFixed(2));
              return (
                <li key={idx} className="flex items-start gap-2 text-xs text-[#2C3523] leading-snug">
                  <span className="w-3.5 h-3.5 border border-[#8C987E] rounded-xs inline-block shrink-0 mt-0.5 bg-white" />
                  <span>
                    <strong className="font-bold text-[#1E2517]">
                      {scaledAmount > 0 ? scaledAmount : ''} {ing.unit}{' '}
                    </strong>
                    {ingName}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Columna Derecha: Instrucciones (3 de 5) */}
        <div className="md:col-span-3 space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#2C3523] border-b border-[#D8D3C4] pb-2 mb-3">
            {isEs ? 'Instrucciones de Preparación' : 'Preparation Instructions'}
          </h3>
          {instructions ? (
            <div className="text-xs leading-relaxed text-[#2C3523] whitespace-pre-line bg-[#FAF8F5] p-3.5 rounded-xl border border-[#D8D3C4]">
              {instructions}
            </div>
          ) : (
            <p className="text-xs text-[#7C886E] italic">
              {isEs ? 'Sin instrucciones escritas.' : 'No instructions.'}
            </p>
          )}
        </div>
      </div>

      {/* Pie de Página de Impresión */}
      <div className="mt-8 pt-4 border-t border-[#D8D3C4] flex items-center justify-between text-[10px] text-[#7C886E]">
        <span>Pulse & Cook • Receta personalizada e impresa</span>
        <span>¡Buen provecho! / Bon appétit! 👨‍🍳</span>
      </div>
    </div>
  );
}

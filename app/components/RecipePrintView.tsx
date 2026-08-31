'use client';

import React from 'react';
import { Recipe, Ingredient } from '../types';
import { RemyIcon } from './RemyIcon';
import { translateTag, translateIngredientName } from '../../lib/culinaryDictionary';

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
    <div id="recipe-print-area" className="hidden print:block text-[#2C3523] bg-white p-4 max-w-[800px] mx-auto">
      {/* Encabezado con Marca Pulse&Cook y Remy */}
      <div className="flex items-center justify-between border-b-2 border-[#2C3523] pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2C3523] flex items-center justify-center text-amber-200 shrink-0">
            <RemyIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#2C3523]">Pulse & Cook</h1>
            <p className="text-[11px] text-[#5C6650] font-medium tracking-wide">
              {isEs ? 'Recetario Gourmet Digital • «Cualquiera puede cocinar»' : 'Gourmet Cookbook • «Anyone can cook»'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-2.5 py-0.5 bg-[#F4F0E8] text-[#2C3523] text-xs font-bold rounded-lg border border-[#D8D3C4]">
            {recipe.category || 'General'}
          </span>
          <p className="text-[10px] text-[#7C886E] mt-0.5">
            {new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Título de la Receta y Metadata */}
      <div className="mb-4">
        <h2 className="text-2xl font-serif font-bold text-[#2C3523] mb-0.5">{title}</h2>
        <p className="text-[11px] text-[#7C886E] font-medium mb-2">by @{authorName}</p>
        {description && <p className="text-xs text-[#5C6650] italic leading-relaxed bg-[#FAF8F5] p-2.5 rounded-lg border border-[#D8D3C4] mb-2">{description}</p>}

        {/* Fila de Métricas */}
        <div className="grid grid-cols-4 gap-2 bg-[#FAF8F5] border border-[#D8D3C4] rounded-xl p-2 text-center">
          <div>
            <span className="block text-[9px] uppercase font-bold text-[#7C886E]">
              {isEs ? 'Tiempo Prep.' : 'Prep Time'}
            </span>
            <span className="text-xs font-black text-[#2C3523]">{recipe.prep_time || 15} min</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase font-bold text-[#7C886E]">
              {isEs ? 'Porciones' : 'Servings'}
            </span>
            <span className="text-xs font-black text-[#2C3523]">{servings}</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase font-bold text-[#7C886E]">
              {isEs ? 'Categoría' : 'Category'}
            </span>
            <span className="text-xs font-black text-[#2C3523] capitalize">
              {recipe.category || 'General'}
            </span>
          </div>
          <div>
            <span className="block text-[9px] uppercase font-bold text-[#7C886E]">
              {isEs ? 'Ingredientes' : 'Ingredients'}
            </span>
            <span className="text-xs font-black text-[#2C3523]">{ingredients.length}</span>
          </div>
        </div>

        {/* Etiquetas Dietéticas */}
        {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.dietary_tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-[#F2EDE2] text-[#425035] text-[9px] font-bold rounded-md border border-[#D8D3C4]"
              >
                {translateTag(tag, lang)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Imagen Principal (si existe) */}
      {currentImage && (
        <div className="mb-4 rounded-xl overflow-hidden border border-[#D8D3C4] max-h-48 flex items-center justify-center bg-[#F4F0E8]">
          <img src={currentImage} alt={title} className="w-full h-48 object-cover" />
        </div>
      )}

      {/* Dos Columnas: Ingredientes e Instrucciones */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Columna Izquierda: Ingredientes (2 de 5) */}
        <div className="md:col-span-2 bg-[#FAF8F5] border border-[#D8D3C4] rounded-xl p-3 self-start">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#2C3523] border-b border-[#D8D3C4] pb-1.5 mb-2 flex items-center justify-between">
            <span>{isEs ? 'Ingredientes' : 'Ingredients'}</span>
            <span className="text-[10px] font-normal text-[#7C886E]">({servings} porc.)</span>
          </h3>
          <ul className="space-y-1.5">
            {ingredients.map((ing, idx) => {
              const ingName = translateIngredientName(ing.name_es, ing.name_en, lang);
              const scaledAmount = Number((ing.amount * ratio).toFixed(2));
              return (
                <li key={idx} className="flex items-start gap-1.5 text-[11px] text-[#2C3523] leading-tight">
                  <span className="w-3 h-3 border border-[#8C987E] rounded-xs inline-block shrink-0 mt-0.5 bg-white" />
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
        <div className="md:col-span-3 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#2C3523] border-b border-[#D8D3C4] pb-1.5 mb-2">
            {isEs ? 'Instrucciones de Preparación' : 'Preparation Instructions'}
          </h3>
          {instructions ? (
            <div className="text-[11px] leading-relaxed text-[#2C3523] whitespace-pre-line bg-[#FAF8F5] p-3 rounded-xl border border-[#D8D3C4]">
              {instructions}
            </div>
          ) : (
            <p className="text-[11px] text-[#7C886E] italic">
              {isEs ? 'Sin instrucciones escritas.' : 'No instructions.'}
            </p>
          )}
        </div>
      </div>

      {/* Pie de Página de Impresión */}
      <div className="mt-4 pt-2 border-t border-[#D8D3C4] flex items-center justify-between text-[9px] text-[#7C886E]">
        <span>Pulse & Cook • Receta personalizada e impresa</span>
        <span>¡Buen provecho! / Bon appétit! 👨‍🍳</span>
      </div>
    </div>
  );
}

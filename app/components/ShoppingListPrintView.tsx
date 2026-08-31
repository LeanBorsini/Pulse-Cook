'use client';

import React from 'react';
import { Recipe, Ingredient } from '../types';
import { RemyIcon } from './RemyIcon';
import { translateIngredientName } from '../../lib/culinaryDictionary';
import { consolidateIngredients, CATEGORY_NAMES } from '../../lib/groceryConsolidator';

interface ShoppingListPrintViewProps {
  selectedRecipes: Recipe[];
  items: Ingredient[];
  lang: 'ES' | 'EN';
}

export function ShoppingListPrintView({
  selectedRecipes,
  items,
  lang,
}: ShoppingListPrintViewProps) {
  const isEs = lang === 'ES';

  // Consolidar usando el motor inteligente
  const consolidated = consolidateIngredients(items, selectedRecipes, lang);
  
  // Aplanar las categorías para la vista de cuadrícula en impresión, pero manteniendo un orden lógico
  const ingredientsList = [
    ...consolidated.produce,
    ...consolidated.meat,
    ...consolidated.dairy,
    ...consolidated.pantry,
    ...consolidated.other,
  ];

  return (
    <div id="shopping-list-print-area" className="hidden print:block text-[#2C3523] bg-white p-6 max-w-[800px] mx-auto">
      {/* Encabezado con Marca Pulse&Cook y Remy */}
      <div className="flex items-center justify-between border-b-2 border-[#2C3523] pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2C3523] flex items-center justify-center text-amber-200 shrink-0">
            <RemyIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#2C3523]">Pulse & Cook</h1>
            <p className="text-[11px] text-[#5C6650] font-medium tracking-wide">
              {isEs ? 'Lista de Compras Consolidada • «Cualquiera puede cocinar»' : 'Consolidated Grocery List • «Anyone can cook»'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-2.5 py-0.5 bg-[#F4F0E8] text-[#2C3523] text-xs font-bold rounded-lg border border-[#D8D3C4]">
            {isEs ? 'Supermercado' : 'Grocery List'}
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

      {/* Recetas Seleccionadas */}
      {selectedRecipes.length > 0 && (
        <div className="mb-4 bg-[#FAF8F5] border border-[#D8D3C4] rounded-xl p-3">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-[#2C3523] mb-1.5">
            {isEs ? 'Recetas Seleccionadas en el Menú:' : 'Selected Menu Recipes:'}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {selectedRecipes.map((r) => (
              <span
                key={r.id}
                className="px-2 py-0.5 bg-white border border-[#D8D3C4] rounded-md text-[11px] font-semibold text-[#2C3523]"
              >
                🍽️ {isEs ? r.title_es : r.title_en || r.title_es}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cuadrícula de Ingredientes Consolidados */}
      <div className="mb-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#2C3523] border-b border-[#D8D3C4] pb-1.5 mb-3 flex items-center justify-between">
          <span>{isEs ? 'Ingredientes y Artículos Necesarios' : 'Required Ingredients & Items'}</span>
          <span className="text-[11px] font-semibold text-[#7C886E]">
            {ingredientsList.length} {isEs ? 'artículos' : 'items'}
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          {ingredientsList.map((item, idx) => {
            const ingName = translateIngredientName(item.name_es, item.name_en, lang);
            const amountStr = item.amount > 0 ? `${Number(item.amount.toFixed(2))} ${item.unit} ` : '';
            return (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-[#2C3523] pb-1.5 border-b border-[#EAE5D9]"
              >
                <span className="w-3.5 h-3.5 border-2 border-[#8C987E] rounded-xs inline-block shrink-0 mt-0.5 bg-white" />
                <div className="flex-1 leading-snug">
                  <strong className="font-bold text-[#1E2517]">{amountStr}</strong>
                  <span className="font-medium text-[#2C3523]">{ingName}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pie de Página */}
      <div className="mt-6 pt-3 border-t border-[#D8D3C4] flex items-center justify-between text-[10px] text-[#7C886E]">
        <span>Pulse & Cook • Lista de compras inteligente</span>
        <span>¡Buen provecho y feliz cocina! 🛒👨‍🍳</span>
      </div>
    </div>
  );
}

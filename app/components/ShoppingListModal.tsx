'use client';

/**
 * @file ShoppingListModal.tsx
 * @description Modal del Planificador de Menú y Lista de Compras Inteligente.
 *
 * Características:
 * - Recupera los ingredientes de todas las recetas seleccionadas en el menú (local o Supabase).
 * - Aplica el motor de consolidación (`groceryConsolidator.ts`) para sumar cantidades y agrupar por pasillo.
 * - Permite marcar artículos comprados con persistencia durante la sesión.
 * - Compartir la lista vía WhatsApp formateada con viñetas.
 * - Vista optimizada para impresión física o PDF (`ShoppingListPrintView`).
 */

import { useState, useEffect } from 'react';
import { X, Check, ShoppingCart, Loader2, Printer, MessageCircle, Trash2 } from 'lucide-react';
import { Ingredient, Recipe } from '../types';
import { supabase } from '../../lib/supabase';
import { getLocalIngredients } from '../../lib/recipeStore';
import { translateIngredientName } from '../../lib/culinaryDictionary';
import { consolidateIngredients, CATEGORY_NAMES } from '../../lib/groceryConsolidator';
import { ShoppingListPrintView } from './ShoppingListPrintView';

interface ShoppingListModalProps {
  lang: 'ES' | 'EN';
  shoppingList?: Ingredient[];
  selectedRecipeIds?: string[];
  recipes?: Recipe[];
  onClose: () => void;
  onClearMenu?: () => void;
  onRemoveRecipe?: (recipeId: string) => void;
}

export function ShoppingListModal({
  lang,
  shoppingList: initialShoppingList,
  selectedRecipeIds = [],
  recipes = [],
  onClose,
  onClearMenu,
  onRemoveRecipe,
}: ShoppingListModalProps) {
  const [fetchedItems, setFetchedItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pulse_shopping_list_checks');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  const items = initialShoppingList || (selectedRecipeIds.length > 0 ? fetchedItems : []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pulse_shopping_list_checks', JSON.stringify(checkedMap));
      } catch {
        // ignore
      }
    }
  }, [checkedMap]);

  const handleClear = () => {
    setCheckedMap({});
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('pulse_shopping_list_checks');
      } catch {
        // ignore
      }
    }
    onClearMenu?.();
  };

  useEffect(() => {
    if (initialShoppingList || selectedRecipeIds.length === 0) {
      return;
    }

    let isMounted = true;
    const loadIngredients = async () => {
      setLoading(true);
      const consolidated: Ingredient[] = [];
      const pendingRemoteIds: string[] = [];

      for (const id of selectedRecipeIds) {
        const localList = getLocalIngredients(id);
        if (localList && localList.length > 0) {
          consolidated.push(...localList);
        } else {
          pendingRemoteIds.push(id);
        }
      }

      if (pendingRemoteIds.length > 0) {
        try {
          const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .in('recipe_id', pendingRemoteIds);

          if (!error && data && data.length > 0) {
            consolidated.push(...data);
          }
        } catch {
          // ignore
        }
      }

      if (isMounted) {
        setFetchedItems(consolidated);
        setLoading(false);
      }
    };

    loadIngredients();
    return () => {
      isMounted = false;
    };
  }, [initialShoppingList, selectedRecipeIds]);

  const toggleCheck = (key: string) => {
    setCheckedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Group ingredients by aisle using the intelligent consolidator
  const consolidated = consolidateIngredients(items, recipes, lang);
  
  // Transform the new consolidated structure into the expected format for rendering
  const groupedByAisle: Record<string, { amount: number; unit: string; name_es: string; name_en: string; aisle: string; recipes?: string[] }[]> = {};
  
  Object.entries(consolidated).forEach(([catKey, catItems]) => {
    if (catItems.length > 0) {
      const categoryName = CATEGORY_NAMES[catKey as keyof typeof CATEGORY_NAMES][lang.toLowerCase() as 'es' | 'en'];
      groupedByAisle[categoryName] = catItems.map(item => ({
        amount: item.amount,
        unit: item.unit,
        name_es: item.name_es,
        name_en: item.name_en,
        aisle: categoryName,
        recipes: item.recipes
      }));
    }
  });

  const selectedRecipes = recipes.filter((r) => selectedRecipeIds.includes(r.id));
  const selectedRecipesNames = selectedRecipes.map((r) =>
    lang === 'ES' ? r.title_es : r.title_en || r.title_es
  );

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const isEs = lang === 'ES';
    let message = isEs
      ? `🛒 *LISTA DE COMPRAS - Pulse & Cook*\n\n`
      : `🛒 *GROCERY SHOPPING LIST - Pulse & Cook*\n\n`;

    if (selectedRecipesNames.length > 0) {
      message += isEs ? `📋 *Recetas Seleccionadas:*\n` : `📋 *Selected Recipes:*\n`;
      selectedRecipesNames.forEach((name) => {
        message += `• ${name}\n`;
      });
      message += `\n`;
    }

    message += isEs ? `🥬 *Ingredientes Necesarios:*\n` : `🥬 *Required Ingredients:*\n`;
    
    Object.entries(groupedByAisle).forEach(([aisleName, aisleItems]) => {
      message += `\n*${aisleName}*\n`;
      aisleItems.forEach((item) => {
        const ingName = translateIngredientName(item.name_es, item.name_en, lang);
        const amountStr = item.amount > 0 ? `${Number(item.amount.toFixed(2))} ${item.unit || ''} ` : '';
        message += `▫️ ${amountStr}${ingName}\n`;
      });
    });

    message += `\n👨‍🍳 *Pulse & Cook* • _«Cualquiera puede cocinar»_`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, '_blank');
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 print:block print:static print:bg-transparent print:p-0"
    >
      {/* Vista Exclusiva de Impresión */}
      <ShoppingListPrintView
        selectedRecipes={selectedRecipes}
        items={items}
        lang={lang}
      />

      <div className="bg-[#F7F5EC] border border-[#D8D3C4]/80 rounded-2xl max-w-lg w-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative max-h-[92vh] flex flex-col text-[#2C3523] overflow-hidden print:hidden">
        {/* Barra Superior Fija (Sticky Header): Botón Cerrar SIEMPRE VISIBLE */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#F7F5EC]/95 backdrop-blur-md border-b border-[#D8D3C4] shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#2C3523]" />
            <h2 className="text-lg font-serif font-bold text-[#2C3523]">
              {lang === 'ES' ? 'Lista de Compras' : 'Shopping List'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EAE5D6] hover:bg-[#DED8C6] active:scale-90 text-[#2C3523] flex items-center justify-center border border-[#D8D3C4] transition-all cursor-pointer shadow-xs"
            title={lang === 'ES' ? 'Cerrar' : 'Close'}
            aria-label={lang === 'ES' ? 'Cerrar' : 'Close'}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <p className="text-xs text-[#5C6650] mb-4">
            {lang === 'ES'
              ? 'Ingredientes consolidados para tus recetas seleccionadas'
              : 'Consolidated ingredients for your selected recipes'}
          </p>

        {/* Botones de acción rápida: WhatsApp y PDF */}
        {items.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleWhatsAppShare}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              title={lang === 'ES' ? 'Enviar por WhatsApp' : 'Send via WhatsApp'}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{lang === 'ES' ? 'WhatsApp' : 'WhatsApp'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#EFECE1] hover:bg-[#E2DEC2] text-[#2C3523] border border-[#D8D3C4] rounded-xl text-xs font-bold transition-all shadow-xs"
              title={lang === 'ES' ? 'Imprimir o Guardar en PDF' : 'Print or Save as PDF'}
            >
              <Printer className="w-4 h-4 text-[#425035]" />
              <span>{lang === 'ES' ? 'Imprimir / PDF' : 'Print / PDF'}</span>
            </button>
          </div>
        )}

        {selectedRecipes.length > 0 && (
          <div className="mb-4 p-3 bg-[#EFECE1] rounded-xl border border-[#D8D3C4] text-xs text-[#5C6650]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-[#2C3523]">
                {lang === 'ES' ? 'Recetas en el menú semanal:' : 'Recipes in weekly menu:'}
              </span>
              <span className="text-[11px] text-[#5C6650] font-medium bg-[#E2DEC2] px-2 py-0.5 rounded-full">
                {selectedRecipes.length} {lang === 'ES' ? (selectedRecipes.length === 1 ? 'receta' : 'recetas') : (selectedRecipes.length === 1 ? 'recipe' : 'recipes')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedRecipes.map((r) => {
                const title = lang === 'ES' ? r.title_es : r.title_en || r.title_es;
                return (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FDFBF7] text-[#2C3523] rounded-lg border border-[#D8D3C4] font-medium text-xs shadow-2xs"
                  >
                    <span>{title}</span>
                    {onRemoveRecipe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveRecipe(r.id);
                        }}
                        className="text-[#5C6650] hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                        title={lang === 'ES' ? `Quitar "${title}" del menú` : `Remove "${title}" from menu`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-[#5C6650] gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#2C3523]" />
            <p className="text-xs">
              {lang === 'ES' ? 'Generando lista de compras...' : 'Generating shopping list...'}
            </p>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-[#5C6650] py-8 text-center">
            {lang === 'ES'
              ? 'No has añadido ninguna receta al menú aún.'
              : 'No recipes added to the menu yet.'}
          </p>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedByAisle).map(([aisle, aisleItems]) => (
              <div key={aisle} className="bg-[#EFECE1] border border-[#D8D3C4] rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C6650] mb-3 pb-1 border-b border-[#D8D3C4]">
                  {aisle}
                </h3>
                <ul className="space-y-2">
                  {aisleItems.map((item, idx) => {
                    const itemKey = `${aisle}-${idx}-${item.name_es}`;
                    const isChecked = !!checkedMap[itemKey];
                    const ingName = translateIngredientName(item.name_es, item.name_en, lang);

                    return (
                      <li
                        key={itemKey}
                        onClick={() => toggleCheck(itemKey)}
                        className={`flex justify-between items-center text-sm p-1.5 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'bg-stone-200/60 line-through text-stone-400 opacity-70' : 'hover:bg-[#E8E4D8]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-[#2C3523] border-[#2C3523] text-white'
                                : 'border-[#A8A29E] bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span className={`font-medium ${isChecked ? 'text-stone-500' : 'text-[#2C3523]'}`}>
                            {ingName}
                          </span>
                        </div>
                        <span className="text-xs font-bold bg-[#D8D3C4] text-[#2C3523] px-2.5 py-0.5 rounded-md ml-2 shrink-0">
                          {item.amount > 0 ? `${Number(item.amount.toFixed(2))} ${item.unit || ''}`.trim() : item.unit || ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {onClearMenu && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{lang === 'ES' ? 'Vaciar / Limpiar Menú' : 'Clear Weekly Menu'}</span>
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

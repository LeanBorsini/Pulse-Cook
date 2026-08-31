'use client';

import { useState, useEffect } from 'react';
import { X, Check, ShoppingCart, Loader2, Printer, MessageCircle } from 'lucide-react';
import { Ingredient, Recipe } from '../types';
import { supabase } from '../../lib/supabase';
import { SAMPLE_INGREDIENTS } from '../../lib/sampleData';
import { translateIngredientName } from '../../lib/culinaryDictionary';
import { consolidateIngredients, CATEGORY_NAMES, ConsolidatedItem } from '../../lib/groceryConsolidator';
import { ShoppingListPrintView } from './ShoppingListPrintView';

interface ShoppingListModalProps {
  lang: 'ES' | 'EN';
  shoppingList?: Ingredient[];
  selectedRecipeIds?: string[];
  recipes?: Recipe[];
  onClose: () => void;
  onClearMenu?: () => void;
}

export function ShoppingListModal({
  lang,
  shoppingList: initialShoppingList,
  selectedRecipeIds = [],
  recipes = [],
  onClose,
  onClearMenu,
}: ShoppingListModalProps) {
  const [fetchedItems, setFetchedItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  const items = initialShoppingList || (selectedRecipeIds.length > 0 ? fetchedItems : []);

  useEffect(() => {
    if (initialShoppingList || selectedRecipeIds.length === 0) {
      return;
    }

    let isMounted = true;
    const loadIngredients = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('ingredients')
          .select('*')
          .in('recipe_id', selectedRecipeIds);

        if (!isMounted) return;

        if (!error && data && data.length > 0) {
          setFetchedItems(data);
        } else {
          // Fallback to sample data for each selected recipe
          const consolidated: Ingredient[] = [];
          for (const id of selectedRecipeIds) {
            const sampleList = SAMPLE_INGREDIENTS[id] || [];
            consolidated.push(...sampleList);
          }
          setFetchedItems(consolidated);
        }
      } catch {
        if (!isMounted) return;
        const consolidated: Ingredient[] = [];
        for (const id of selectedRecipeIds) {
          const sampleList = SAMPLE_INGREDIENTS[id] || [];
          consolidated.push(...sampleList);
        }
        setFetchedItems(consolidated);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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
    items.forEach((item) => {
      const ingName = translateIngredientName(item.name_es, item.name_en, lang);
      const amountStr = item.amount > 0 ? `${Number(item.amount)} ${item.unit || ''} ` : '';
      message += `▫️ ${amountStr}${ingName}\n`;
    });

    message += `\n👨‍🍳 *Pulse & Cook* • _«Cualquiera puede cocinar»_`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:block print:static print:bg-transparent print:p-0">
      {/* Vista Exclusiva de Impresión */}
      <ShoppingListPrintView
        selectedRecipes={selectedRecipes}
        items={items}
        lang={lang}
      />

      <div className="bg-[#F7F5EC] border border-[#D8D3C4]/80 rounded-2xl max-w-lg w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative max-h-[90vh] overflow-y-auto print:hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-[#2C3523] hover:bg-[#EFECE1] transition-colors"
          title={lang === 'ES' ? 'Cerrar' : 'Close'}
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-between mb-1 pr-8">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#2C3523]" />
            <h2 className="text-2xl font-serif font-bold text-[#2C3523]">
              {lang === 'ES' ? 'Lista de Compras' : 'Shopping List'}
            </h2>
          </div>
        </div>
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

        {selectedRecipesNames.length > 0 && (
          <div className="mb-4 p-2.5 bg-[#EFECE1] rounded-xl border border-[#D8D3C4] text-xs text-[#5C6650]">
            <span className="font-semibold text-[#2C3523]">
              {lang === 'ES' ? 'Recetas en el menú: ' : 'Menu recipes: '}
            </span>
            {selectedRecipesNames.join(', ')}
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
                            {lang === 'ES' ? item.name_es : item.name_en || item.name_es}
                          </span>
                        </div>
                        <span className="text-xs font-mono bg-[#D8D3C4] text-[#2C3523] px-2 py-0.5 rounded ml-2">
                          {item.amount} {item.unit}
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
                  onClick={onClearMenu}
                  className="w-full bg-red-100 text-red-700 hover:bg-red-200 py-2.5 rounded-xl text-sm font-semibold transition-all"
                >
                  {lang === 'ES' ? 'Vaciar Menú' : 'Clear Menu'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X, Check, ShoppingCart, Loader2 } from 'lucide-react';
import { Ingredient, Recipe } from '../types';
import { supabase } from '../../lib/supabase';
import { SAMPLE_INGREDIENTS } from '../../lib/sampleData';

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

  // Group ingredients by aisle
  const groupedByAisle = items.reduce<Record<string, Ingredient[]>>((acc, item) => {
    const aisle = item.aisle || (lang === 'ES' ? 'General' : 'General');
    if (!acc[aisle]) acc[aisle] = [];
    acc[aisle].push(item);
    return acc;
  }, {});

  const selectedRecipesNames = recipes
    .filter((r) => selectedRecipeIds.includes(r.id))
    .map((r) => (lang === 'ES' ? r.title_es : r.title_en || r.title_es));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#F7F5EC] border border-[#D8D3C4]/80 rounded-2xl max-w-lg w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-[#2C3523] hover:bg-[#EFECE1] transition-colors"
          title={lang === 'ES' ? 'Cerrar' : 'Close'}
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart className="w-6 h-6 text-[#2C3523]" />
          <h2 className="text-2xl font-serif font-bold text-[#2C3523]">
            {lang === 'ES' ? 'Lista de Compras' : 'Shopping List'}
          </h2>
        </div>
        <p className="text-xs text-[#5C6650] mb-4">
          {lang === 'ES'
            ? 'Ingredientes consolidados para tus recetas seleccionadas'
            : 'Consolidated ingredients for your selected recipes'}
        </p>

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

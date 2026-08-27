'use client';

import { X, Check } from 'lucide-react';
import { Ingredient } from '../types';

interface ShoppingListModalProps {
  lang: 'ES' | 'EN';
  shoppingList: Ingredient[];
  onClose: () => void;
  onClearMenu: () => void;
}

export function ShoppingListModal({
  lang,
  shoppingList,
  onClose,
  onClearMenu,
}: ShoppingListModalProps) {
  // Agrupar los ingredientes por pasillo/sección
  const groupedByAisle = shoppingList.reduce<Record<string, Ingredient[]>>((acc, item) => {
    const aisle = item.aisle || (lang === 'ES' ? 'General' : 'General');
    if (!acc[aisle]) acc[aisle] = [];
    acc[aisle].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#F7F5EC] border border-[#D8D3C4]/80 rounded-2xl max-w-lg w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-[#2C3523] hover:bg-[#EFECE1]"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-serif font-bold text-[#2C3523] mb-1">
          {lang === 'ES' ? 'Lista de Compras' : 'Shopping List'}
        </h2>
        <p className="text-xs text-[#5C6650] mb-6">
          {lang === 'ES'
            ? 'Ingredientes acumulados para tu menú semanal'
            : 'Consolidated ingredients for your weekly menu'}
        </p>

        {shoppingList.length === 0 ? (
          <p className="text-sm text-[#5C6650] py-8 text-center">
            {lang === 'ES'
              ? 'No has añadido ninguna receta al menú.'
              : 'No recipes added to the menu.'}
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByAisle).map(([aisle, items]) => (
              <div key={aisle} className="bg-[#EFECE1] border border-[#D8D3C4] rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C6650] mb-3 pb-1 border-b border-[#D8D3C4]">
                  {aisle}
                </h3>
                <ul className="space-y-2">
                  {items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-[#2C3523]">
                        {lang === 'ES' ? item.name_es : (item.name_en || item.name_es)}
                      </span>
                      <span className="text-xs font-mono bg-[#D8D3C4] text-[#2C3523] px-2 py-0.5 rounded">
                        {item.amount} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClearMenu}
                className="w-full bg-red-100 text-red-700 hover:bg-red-200 py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                {lang === 'ES' ? 'Vaciar Menú' : 'Clear Menu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
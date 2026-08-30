'use client';

import { User } from '@supabase/supabase-js';

interface HeaderProps {
  lang: 'ES' | 'EN';
  setLang: (lang: 'ES' | 'EN') => void;
  user: User | null;
  profileUsername: string | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenNewRecipe: () => void;
  selectedCount: number;
  onOpenShoppingList: () => void;
}

export function Header({
  lang,
  setLang,
  user,
  profileUsername,
  onOpenAuth,
  onSignOut,
  onOpenNewRecipe,
  selectedCount,
  onOpenShoppingList,
}: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-stone-800">Pulse&Cook</h1>
        <p className="text-stone-500 text-sm">Personal & Family Recipe Book</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Selector de Idioma */}
        <button
          onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')}
          className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
        >
          {lang === 'ES' ? 'EN | ES' : 'ES | EN'}
        </button>

        {/* Lista de compras */}
        {selectedCount > 0 && (
          <button
            onClick={onOpenShoppingList}
            className="px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold hover:bg-amber-200"
          >
            🛒 Menu ({selectedCount})
          </button>
        )}

        {/* Botón Crear Receta (solo si está autenticado) */}
        {user && (
          <button
            onClick={onOpenNewRecipe}
            className="px-4 py-2 bg-[#2b382b] text-white rounded-lg text-sm font-semibold hover:bg-[#1e271e] transition-colors shadow-sm"
          >
            + {lang === 'ES' ? 'Añadir Receta' : 'Add Recipe'}
          </button>
        )}

        {/* Estado del Usuario */}
        {user ? (
          <div className="flex items-center gap-2 bg-stone-200/70 pl-3 pr-1 py-1 rounded-lg">
            <span className="text-xs font-bold text-stone-700">
              @{profileUsername || user.email?.split('@')[0]}
            </span>
            <button
              onClick={onSignOut}
              className="text-xs text-stone-500 hover:text-red-600 font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 bg-stone-200 text-stone-800 rounded-lg text-sm font-semibold hover:bg-stone-300 transition-colors"
          >
            {lang === 'ES' ? 'Ingresar' : 'Sign In'}
          </button>
        )}
      </div>
    </header>
  );
}
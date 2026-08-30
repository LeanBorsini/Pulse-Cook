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
  const displayAlias =
    profileUsername || user?.user_metadata?.username || user?.email?.split('@')[0] || 'usuario';

  return (
    <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
      <div>
        <h1 className="text-5xl font-handwritten font-bold text-[#2C3523]">Pulse&Cook</h1>
        <p className="text-stone-500 text-sm italic mt-0.5">Personal & Family Recipe Book</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Selector de Idioma */}
        <button
          onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')}
          className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
        >
          {lang === 'ES' ? 'EN | ES' : 'ES | EN'}
        </button>

        {/* Menú de Compras */}
        {selectedCount > 0 && (
          <button
            onClick={onOpenShoppingList}
            className="px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold hover:bg-amber-200"
          >
            🛒 Menu ({selectedCount})
          </button>
        )}

        {/* Botón Crear Receta */}
        <button
          onClick={onOpenNewRecipe}
          className="px-4 py-2 bg-[#2b382b] text-white rounded-lg text-sm font-semibold hover:bg-[#1e271e] transition-colors shadow-sm"
        >
          + {lang === 'ES' ? 'Añadir Receta' : 'Add Recipe'}
        </button>

        {/* Estado de Autenticación */}
        {user ? (
          <div className="flex items-center gap-2 bg-stone-200/80 px-3 py-1.5 rounded-lg border border-stone-300">
            <span className="text-xs font-bold text-stone-800">
              @{displayAlias}
            </span>
            <button
              onClick={onSignOut}
              className="text-xs text-stone-400 hover:text-red-600 font-bold ml-1 transition-colors"
              title={lang === 'ES' ? 'Cerrar sesión' : 'Sign out'}
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
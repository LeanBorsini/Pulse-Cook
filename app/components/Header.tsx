'use client';

import { User } from '@supabase/supabase-js';
import { LogOut, Plus, ShoppingCart, Globe, UserCheck, HelpCircle } from 'lucide-react';
import { RemyIcon } from './RemyIcon';

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
  onOpenChefAI: () => void;
  onOpenWelcome?: () => void;
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
  onOpenChefAI,
  onOpenWelcome,
}: HeaderProps) {
  const displayAlias = profileUsername || (user?.email ? user.email.split('@')[0] : 'chef');

  return (
    <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b border-[#D8D3C4]/60">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-4xl sm:text-5xl font-handwritten font-bold text-[#2C3523] tracking-tight">
            Pulse&Cook
          </h1>
        </div>
        <p className="text-[#5C6650] text-xs sm:text-sm italic mt-0.5">
          {lang === 'ES' ? 'Recetario familiar & Planificador inteligente' : 'Family Recipe Book & Smart Meal Planner'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Botón de Ayuda / Info de la App */}
        {onOpenWelcome && (
          <button
            onClick={onOpenWelcome}
            className="flex items-center gap-1 px-2.5 py-2 border border-[#D8D3C4] rounded-xl text-xs font-semibold text-[#5C6650] bg-[#EFECE1] hover:bg-[#E2DEC2] transition-colors"
            title={lang === 'ES' ? '¿Cómo funciona Pulse & Cook?' : 'How Pulse & Cook works'}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ES' ? 'Guía' : 'Guide'}</span>
          </button>
        )}

        {/* Selector de Idioma */}
        <button
          onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')}
          className="flex items-center gap-1.5 px-3 py-2 border border-[#D8D3C4] rounded-xl text-xs font-bold text-[#2C3523] bg-[#EFECE1] hover:bg-[#E2DEC2] transition-colors"
          title={lang === 'ES' ? 'Cambiar idioma' : 'Change language'}
        >
          <Globe className="w-3.5 h-3.5 text-[#5C6650]" />
          <span>{lang === 'ES' ? 'ES' : 'EN'}</span>
        </button>

        {/* Botón Chef Remy IA */}
        <button
          onClick={onOpenChefAI}
          className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-[#2C3523] to-[#425035] text-amber-200 border border-[#2C3523] rounded-xl text-xs font-bold hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          title={lang === 'ES' ? '¿Qué cocino hoy? Asistente Chef Remy' : 'What to cook? Chef Remy AI Assistant'}
        >
          <RemyIcon className="w-5 h-5 -mt-0.5" />
          <span>Remy</span>
        </button>

        {/* Menú de Compras */}
        {selectedCount > 0 && (
          <button
            onClick={onOpenShoppingList}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2C3523]/10 text-[#2C3523] border border-[#2C3523]/30 rounded-xl text-xs font-bold hover:bg-[#2C3523]/20 transition-colors animate-pulse"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{lang === 'ES' ? 'Menú' : 'Menu'} ({selectedCount})</span>
          </button>
        )}

        {/* Botón Crear Receta */}
        <button
          onClick={onOpenNewRecipe}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#2C3523] text-[#F7F5EC] rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#3D4932] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ES' ? 'Añadir Receta' : 'Add Recipe'}</span>
        </button>

        {/* Estado de Autenticación */}
        {user ? (
          <div className="flex items-center gap-2 bg-[#EFECE1] px-3 py-1.5 rounded-xl border border-[#D8D3C4]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C3523]">
              <UserCheck className="w-3.5 h-3.5 text-[#5C6650]" />
              <span>@{displayAlias}</span>
            </div>
            <button
              onClick={onSignOut}
              className="p-1 text-[#5C6650] hover:text-red-700 hover:bg-red-100 rounded-md transition-colors ml-1"
              title={lang === 'ES' ? 'Cerrar sesión' : 'Sign out'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 bg-[#EFECE1] text-[#2C3523] border border-[#D8D3C4] rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#E2DEC2] transition-colors"
          >
            {lang === 'ES' ? 'Ingresar' : 'Sign In'}
          </button>
        )}
      </div>
    </header>
  );
}

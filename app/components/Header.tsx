'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Menu, ShoppingCart } from 'lucide-react';
import { NavMenuDrawer } from './NavMenuDrawer';

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
  onOpenShareApp?: () => void;
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
  onOpenShareApp,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const displayAlias = profileUsername || (user?.email ? user.email.split('@')[0] : 'chef');
  const isEs = lang === 'ES';

  return (
    <>
      <header className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#D8D3C4]/60">
        <div className="flex flex-col items-center justify-center text-center">
          <h1
            id="brand-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-handwritten font-bold text-[#2C3523] tracking-tight leading-tight text-center"
          >
            Pulse&Cook
          </h1>
          <h2
            id="brand-subheading"
            className="text-[#5C6650] text-xs sm:text-sm italic mt-0.5 font-normal text-center"
          >
            {isEs
              ? 'Recetario familiar & Planificador inteligente'
              : 'Family Recipe Book & Smart Meal Planner'}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Acceso rápido a Menú Semanal si hay recetas seleccionadas */}
          {selectedCount > 0 && (
            <button
              onClick={onOpenShoppingList}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2C3523] text-[#FAF8F2] hover:bg-[#3D4932] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 animate-pulse"
              title={isEs ? 'Ver Menú Semanal y Compras' : 'View Weekly Menu & Shopping'}
              id="header-quick-menu-btn"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEs ? 'Menú' : 'Menu'}</span>
              <span className="bg-[#FAF8F2] text-[#2C3523] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {selectedCount}
              </span>
            </button>
          )}

          {/* Botón Principal de Menú Desplegable */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 bg-[#EFECE1] hover:bg-[#E2DEC2] border border-[#D8D3C4] rounded-2xl text-xs sm:text-sm font-semibold text-[#2C3523] transition-all cursor-pointer active:scale-95 shadow-2xs group"
            aria-label={isEs ? 'Abrir menú principal' : 'Open main menu'}
            aria-expanded={isMenuOpen}
            id="header-menu-toggle-btn"
          >
            {user ? (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#2C3523] text-white flex items-center justify-center text-[10px] font-bold">
                  {displayAlias.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] sm:max-w-[140px] truncate font-bold">
                  @{displayAlias}
                </span>
              </div>
            ) : null}
            <Menu className="w-4 h-4 text-[#2C3523] group-hover:scale-110 transition-transform" />
            {!user && <span className="font-bold">{isEs ? 'Menú' : 'Menu'}</span>}
          </button>
        </div>
      </header>

      {/* Menú Desplegable Lateral / Drawer */}
      <NavMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        lang={lang}
        setLang={setLang}
        user={user}
        profileUsername={profileUsername}
        onOpenAuth={onOpenAuth}
        onSignOut={onSignOut}
        onOpenNewRecipe={onOpenNewRecipe}
        selectedCount={selectedCount}
        onOpenShoppingList={onOpenShoppingList}
        onOpenChefAI={onOpenChefAI}
        onOpenWelcome={onOpenWelcome}
        onOpenShareApp={onOpenShareApp}
      />
    </>
  );
}


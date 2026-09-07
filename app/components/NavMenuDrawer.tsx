'use client';

import { useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import {
  X,
  Plus,
  ShoppingCart,
  Globe,
  HelpCircle,
  QrCode,
  LogOut,
  LogIn,
  UserCheck,
  ChevronRight,
  Smartphone,
} from 'lucide-react';
import { RemyIcon } from './RemyIcon';
import { usePWAInstall } from './usePWAInstall';

interface NavMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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

export function NavMenuDrawer({
  isOpen,
  onClose,
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
}: NavMenuDrawerProps) {
  const isEs = lang === 'ES';
  const displayAlias = profileUsername || (user?.email ? user.email.split('@')[0] : 'chef');
  const { isInstallable, install } = usePWAInstall();

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloquear scroll de fondo cuando el menú está desplegado
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      id="nav-menu-drawer-backdrop"
    >
      <div
        className="w-full max-w-sm sm:max-w-md h-full bg-[#FDFBF7] border-l border-[#D8D3C4] shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-250"
        id="nav-menu-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={isEs ? 'Menú principal de Pulse&Cook' : 'Pulse&Cook main menu'}
      >
        {/* Cabecera del Menú */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#EFECE1] border-b border-[#D8D3C4]">
          <div className="flex items-center gap-2">
            <span className="text-xl font-handwritten font-bold text-[#2C3523] tracking-tight">
              Pulse&Cook
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#2C3523]/10 text-[#2C3523] rounded-md">
              {isEs ? 'Menú' : 'Menu'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-[#5C6650] hover:text-[#2C3523] hover:bg-[#D8D3C4]/40 rounded-xl transition-colors cursor-pointer active:scale-95"
            aria-label={isEs ? 'Cerrar menú' : 'Close menu'}
            id="close-nav-menu-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 px-5 py-5 space-y-6">
          {/* SECCIÓN 1: Perfil / Usuario */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5C6650]">
              {isEs ? 'Cuenta & Sesión' : 'Account & Session'}
            </h3>

            {user ? (
              <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2C3523] text-[#FAF8F2] flex items-center justify-center font-bold text-sm shadow-xs">
                    {displayAlias.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C3523]">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>@{displayAlias}</span>
                    </div>
                    {user.email && (
                      <span className="text-[11px] text-[#5C6650] truncate max-w-[160px] sm:max-w-[200px]">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer active:scale-95"
                  title={isEs ? 'Cerrar sesión' : 'Sign out'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isEs ? 'Salir' : 'Exit'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl p-4 flex flex-col gap-2.5">
                <p className="text-xs text-[#5C6650] leading-relaxed">
                  {isEs
                    ? 'Inicia sesión para crear tus recetas, editarlas y valorarlas.'
                    : 'Sign in to create your own recipes, edit and rate them.'}
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2C3523] text-[#FAF8F2] rounded-xl text-xs font-bold hover:bg-[#3D4932] transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isEs ? 'Iniciar Sesión / Registrarse' : 'Sign In / Register'}</span>
                </button>
              </div>
            )}
          </section>

          {/* SECCIÓN 2: Acciones Culinarias Principales */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5C6650]">
              {isEs ? 'Acciones Culinarias' : 'Culinary Actions'}
            </h3>

            {/* Añadir Nueva Receta */}
            <button
              onClick={() => {
                onClose();
                onOpenNewRecipe();
              }}
              className="w-full flex items-center justify-between p-3.5 bg-[#2C3523] text-[#FAF8F2] rounded-2xl hover:bg-[#3D4932] transition-all cursor-pointer shadow-xs active:scale-98 group text-left"
              id="menu-drawer-add-recipe-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-[#FAF8F2]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold leading-tight">
                    {isEs ? 'Añadir Nueva Receta' : 'Add New Recipe'}
                  </h4>
                  <p className="text-[11px] text-[#FAF8F2]/75 mt-0.5">
                    {isEs ? 'Crea o digitaliza un plato casero' : 'Create or digitize a home dish'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#FAF8F2]/60 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Chef Remy IA */}
            <button
              onClick={() => {
                onClose();
                onOpenChefAI();
              }}
              className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-[#2C3523]/10 to-[#425035]/15 border border-[#2C3523]/25 rounded-2xl hover:bg-[#2C3523]/15 transition-all cursor-pointer active:scale-98 group text-left"
              id="menu-drawer-chef-remy-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2C3523] flex items-center justify-center shrink-0 shadow-xs">
                  <RemyIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#2C3523] leading-tight flex items-center gap-1.5">
                    <span>Chef Remy (IA)</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-200 text-[#2C3523] rounded">
                      Smart
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#5C6650] mt-0.5">
                    {isEs ? '¿Qué cocino hoy? Asistente interactivo' : 'What to cook? Smart kitchen assistant'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#5C6650] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Planificador de Menú & Lista de Compras */}
            <button
              onClick={() => {
                onClose();
                onOpenShoppingList();
              }}
              className="w-full flex items-center justify-between p-3.5 bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl hover:bg-[#EFECE1] transition-all cursor-pointer active:scale-98 group text-left"
              id="menu-drawer-shopping-list-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4 text-[#2C3523]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-[#2C3523] leading-tight">
                      {isEs ? 'Menú Semanal & Compras' : 'Weekly Menu & Shopping'}
                    </h4>
                    {selectedCount > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-[#2C3523] text-white rounded-full">
                        {selectedCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5C6650] mt-0.5">
                    {selectedCount > 0
                      ? isEs
                        ? `${selectedCount} recetas planificadas`
                        : `${selectedCount} recipes selected`
                      : isEs
                      ? 'Organiza tus platos de la semana'
                      : 'Organize your weekly meal plan'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#5C6650] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </section>

          {/* SECCIÓN 3: Preferencias & Utilidades */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5C6650]">
              {isEs ? 'Configuración & Utilidades' : 'Settings & Tools'}
            </h3>

            {/* Selector de Idioma */}
            <div className="p-3.5 bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-[#5C6650]" />
                <span className="text-xs font-bold text-[#2C3523]">
                  {isEs ? 'Idioma' : 'Language'}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#EFECE1] p-1 rounded-xl border border-[#D8D3C4]">
                <button
                  onClick={() => setLang('ES')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    lang === 'ES'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'text-[#5C6650] hover:text-[#2C3523]'
                  }`}
                >
                  ES
                </button>
                <button
                  onClick={() => setLang('EN')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    lang === 'EN'
                      ? 'bg-[#2C3523] text-white shadow-2xs'
                      : 'text-[#5C6650] hover:text-[#2C3523]'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Compartir App */}
            {onOpenShareApp && (
              <button
                onClick={() => {
                  onClose();
                  onOpenShareApp();
                }}
                className="w-full flex items-center justify-between p-3.5 bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl hover:bg-[#EFECE1] transition-all cursor-pointer active:scale-98 group text-left"
                id="menu-drawer-share-app-btn"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] flex items-center justify-center shrink-0">
                    <QrCode className="w-4 h-4 text-[#2C3523]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#2C3523] leading-tight">
                      {isEs ? 'Compartir Pulse&Cook' : 'Share Pulse&Cook'}
                    </h4>
                    <p className="text-[11px] text-[#5C6650] mt-0.5">
                      {isEs ? 'Código QR y enlace directo' : 'QR code & instant link'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5C6650] group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Instalar App (PWA) si está disponible */}
            {isInstallable && (
              <button
                onClick={() => {
                  onClose();
                  install();
                }}
                className="w-full flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-300/60 rounded-2xl hover:bg-emerald-100/70 transition-all cursor-pointer active:scale-98 group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-200 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950 leading-tight">
                      {isEs ? 'Instalar Aplicación' : 'Install Application'}
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {isEs ? 'Uso a pantalla completa y sin conexión' : 'Full screen & offline mode'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-800 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Guía de Ayuda & Bienvenida */}
            {onOpenWelcome && (
              <button
                onClick={() => {
                  onClose();
                  onOpenWelcome();
                }}
                className="w-full flex items-center justify-between p-3.5 bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl hover:bg-[#EFECE1] transition-all cursor-pointer active:scale-98 group text-left"
                id="menu-drawer-welcome-guide-btn"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4 text-[#2C3523]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#2C3523] leading-tight">
                      {isEs ? 'Guía de la Aplicación' : 'Application Guide'}
                    </h4>
                    <p className="text-[11px] text-[#5C6650] mt-0.5">
                      {isEs ? '¿Cómo sacarle el máximo partido?' : 'How to get the most out of it?'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5C6650] group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </section>
        </div>

        {/* Pie del Menú */}
        <div className="px-5 py-4 bg-[#EFECE1]/70 border-t border-[#D8D3C4] text-center">
          <p className="text-[11px] text-[#5C6650]">
            Pulse&Cook • {isEs ? 'Recetario familiar inteligente' : 'Smart family recipe book'}
          </p>
        </div>
      </div>
    </div>
  );
}

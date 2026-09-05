'use client';

/**
 * @file WelcomeLandingModal.tsx
 * @description Modal editorial y guía de bienvenida interactiva de Pulse&Cook.
 *
 * Expone de forma visual y bilingüe (ES/EN) las 8 capacidades centrales del recetario:
 * 1. Filtros inteligentes en Combobox con selección múltiple y chips activos.
 * 2. Asistente Chef Remy (IA) para cocinar con lo que hay en el refrigerador.
 * 3. Traducción bilingüe pura con saneamiento automático de Spanglish.
 * 4. Modo cocina guiado a pantalla completa con temporizadores automáticos.
 * 5. Planificador de menú semanal y lista de compras agrupada por pasillos.
 * 6. Creación multimedia con hasta 5 fotos y videos de YouTube.
 * 7. Impresión profesional de fichas de cocina y exportación a PDF.
 * 8. Instalación como PWA móvil y compartir rápido por Código QR o WhatsApp.
 */

import React from 'react';
import {
  Sparkles,
  Utensils,
  ShoppingCart,
  Globe2,
  ChefHat,
  ArrowRight,
  X,
  CheckCircle2,
  QrCode,
  SlidersHorizontal,
  Printer,
  BookOpen,
} from 'lucide-react';
import { Language } from '../types';

interface WelcomeLandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const WelcomeLandingModal: React.FC<WelcomeLandingModalProps> = ({
  isOpen,
  onClose,
  lang,
  onLanguageChange,
}) => {
  if (!isOpen) return null;

  const currentLang = typeof lang === 'string' ? lang.toLowerCase() : 'es';
  const isEs = currentLang === 'es';

  const content = isEs
    ? {
        badge: 'Guía de uso & cocina inteligente',
        title: 'Pulse & Cook',
        tagline: 'Tu recetario vivo, planificador y asistente de cocina',
        description:
          'Pulse&Cook combina un cuaderno de recetas artesanal con inteligencia culinaria moderna. Aquí tienes todo lo que puedes hacer en la aplicación para aprovechar al máximo cada comida:',
        featuresTitle: 'Todo lo que puedes hacer en Pulse & Cook',
        features: [
          {
            icon: <SlidersHorizontal className="w-5 h-5 text-emerald-700" />,
            title: 'Filtros Inteligentes en Combobox',
            desc: 'La pantalla se mantiene limpia por defecto. Al tocar "Filtros", puedes seleccionar múltiples categorías (Desayuno, Postre...) y múltiples dietas (Sin Gluten, Vegano...), o solo una, o ninguna. Los filtros elegidos se muestran como chips con botón de quitar.',
          },
          {
            icon: <ChefHat className="w-5 h-5 text-amber-700" />,
            title: 'Chef Remy Asistente (IA)',
            desc: '¿No sabes qué cocinar? Dile a Remy qué ingredientes tienes en el refrigerador o despensa y creará recetas paso a paso personalizadas listas para guardar.',
          },
          {
            icon: <Sparkles className="w-5 h-5 text-indigo-600" />,
            title: 'Traducción 100% Automática y Limpia',
            desc: 'Al cambiar el idioma de la app a Español o Inglés, todo se traduce y muestra automáticamente en ese idioma: título, descripción, ingredientes, instrucciones y comentarios de la comunidad, sin botones redundantes ni interfaces confusas.',
          },
          {
            icon: <Utensils className="w-5 h-5 text-orange-600" />,
            title: 'Modo Cocina Guiado con Temporizadores',
            desc: 'Cocina paso a paso a pantalla completa. Incluye temporizadores con aviso acústico para hervir o hornear, tachado interactivo de ingredientes y escalador de porciones en tiempo real.',
          },
          {
            icon: <ShoppingCart className="w-5 h-5 text-blue-600" />,
            title: 'Menú Semanal & Lista de Compras',
            desc: 'Añade recetas a tu menú con el botón (+). La app genera tu lista de compras unificando cantidades compatibles y ordenándolas automáticamente por pasillos (Verdulería, Carnicería, Lácteos...). Exporta a WhatsApp o PDF.',
          },
          {
            icon: <BookOpen className="w-5 h-5 text-teal-700" />,
            title: 'Creación Completa & Multimedia',
            desc: 'Guarda recetas con tiempos de preparación, porciones, notas de autor, hasta 5 fotografías de alta calidad y enlaces a videos instructivos de YouTube que se reproducen dentro de la app.',
          },
          {
            icon: <Printer className="w-5 h-5 text-stone-700" />,
            title: 'Impresión Profesional de Fichas',
            desc: 'Imprime fácilmente tus recetas en tarjetas de cocina en papel o expórtalas en formato PDF limpio para archivar en tu recetario físico.',
          },
          {
            icon: <QrCode className="w-5 h-5 text-rose-600" />,
            title: 'Compartir PWA & Código QR',
            desc: 'Comparte la app por WhatsApp o muestra un código QR en pantalla para instalarla instantáneamente en tu teléfono Android o iPhone como aplicación nativa, funcionando también sin conexión a internet.',
          },
        ],
        cta: 'Explorar el recetario',
      }
    : {
        badge: 'User Guide & Smart Kitchen',
        title: 'Pulse & Cook',
        tagline: 'Your living cookbook, meal planner & culinary assistant',
        description:
          'Pulse&Cook combines the warmth of a family cookbook with modern culinary intelligence. Here is everything you can do in the app to elevate your cooking routine:',
        featuresTitle: 'Everything you can do in Pulse & Cook',
        features: [
          {
            icon: <SlidersHorizontal className="w-5 h-5 text-emerald-700" />,
            title: 'Smart Combobox Filters',
            desc: 'The home screen stays clean by default. Click "Filters" to select multiple categories (Breakfast, Dessert...) and multiple diets (Gluten Free, Vegan...), or just one, or none. Active filters appear as removable chips.',
          },
          {
            icon: <ChefHat className="w-5 h-5 text-amber-700" />,
            title: 'Chef Remy AI Assistant',
            desc: 'Wondering what to make? Tell Remy what ingredients you have in your fridge or pantry, and he will generate custom step-by-step recipes ready to save.',
          },
          {
            icon: <Sparkles className="w-5 h-5 text-indigo-600" />,
            title: '100% Automatic & Clean Translation',
            desc: 'When you switch between Spanish and English, everything automatically updates to match: title, description, ingredients, step-by-step instructions, and community comments, without redundant buttons or cluttered screens.',
          },
          {
            icon: <Utensils className="w-5 h-5 text-orange-600" />,
            title: 'Guided Cooking Mode & Timers',
            desc: 'Cook step-by-step in a focused full-screen view. Includes hands-free sound timers for boiling or baking, interactive ingredient checklists, and live serving scalers.',
          },
          {
            icon: <ShoppingCart className="w-5 h-5 text-blue-600" />,
            title: 'Weekly Menu & Grocery List',
            desc: 'Add recipes to your weekly menu with the (+) button. The app builds your consolidated shopping list sorted by supermarket aisle (Produce, Meat, Dairy...). Export to WhatsApp or PDF.',
          },
          {
            icon: <BookOpen className="w-5 h-5 text-teal-700" />,
            title: 'Rich Recipes & Multimedia',
            desc: 'Create recipes with prep times, servings, chef notes, up to 5 photos, and embedded YouTube videos that play seamlessly right inside the recipe modal.',
          },
          {
            icon: <Printer className="w-5 h-5 text-stone-700" />,
            title: 'Printable Recipe Cards',
            desc: 'Print formatted cards on paper or export to clean PDF documents with scaled quantities for your physical kitchen binder.',
          },
          {
            icon: <QrCode className="w-5 h-5 text-rose-600" />,
            title: 'PWA Sharing & QR Code',
            desc: 'Share via WhatsApp or generate an instant QR code so anyone can install it on Android or iPhone as a native app, complete with offline support.',
          },
        ],
        cta: 'Start exploring recipes',
      };

  const handleStart = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      localStorage.setItem('pulse_cook_welcome_seen', 'true');
    } catch {
      // Ignore localStorage errors
    }
    onClose();
  };

  const toggleLang = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLanguageChange(isEs ? 'en' : 'es');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={handleStart}
    >
      <div
        className="relative w-full max-w-3xl bg-[#FDFBF7] text-[#2C3523] rounded-2xl shadow-2xl border border-[#D8D3C4] overflow-hidden my-6 select-none flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior con selector de idioma y cerrar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EFECE1] bg-[#FAF8F2] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#5C6650] bg-[#EFECE1] hover:bg-[#E5E0D0] rounded-full transition-colors cursor-pointer"
              title={isEs ? 'Cambiar a Inglés' : 'Switch to Spanish'}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>{isEs ? 'ES (Español) ➔ EN' : 'EN (English) ➔ ES'}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleStart}
            className="p-1.5 text-[#737D67] hover:text-[#2C3523] rounded-lg hover:bg-[#EFECE1] transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto px-5 sm:px-8 py-5 space-y-6">
          {/* Hero Content */}
          <div className="text-center pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EAE5D6] text-[#4A5340] text-xs font-semibold uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              {content.badge}
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2C3523] tracking-tight">
              {content.title}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-[#66725A] mt-1">
              {content.tagline}
            </p>

            <p className="mt-2 text-xs sm:text-sm text-[#4A5340] leading-relaxed max-w-xl mx-auto">
              {content.description}
            </p>
          </div>

          {/* Grid de Todas las Funcionalidades de la App */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#737D67] mb-3 text-center">
              {content.featuresTitle}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {content.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F4F1EA] border border-[#E5DFD0] hover:border-[#D8D3C4] transition-colors"
                >
                  <div className="p-2 rounded-lg bg-white shadow-2xs shrink-0 mt-0.5">
                    {feat.icon}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#2C3523]">
                      {feat.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#5C6650] mt-1 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 sm:px-8 py-3.5 bg-[#FAF8F2] border-t border-[#EFECE1] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#737D67]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{isEs ? 'Recetario familiar listo para cocinar' : 'Cookbook ready to cook'}</span>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-[#2C3523] hover:bg-[#3D4932] text-[#FDFBF7] font-semibold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>{content.cta}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};


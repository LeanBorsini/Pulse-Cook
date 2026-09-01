'use client';

import React from 'react';
import { Sparkles, Utensils, ShoppingCart, Globe2, ChefHat, ArrowRight, X, CheckCircle2 } from 'lucide-react';
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
        badge: 'Bienvenido a tu cocina inteligente',
        title: 'Pulse & Cook',
        tagline: 'Tu cuaderno culinario inteligente y recetario vivo',
        description:
          'Creado para transformar la forma en que guardas, cocinas y compartes tus recetas. Olvídate de los cuadernos desordenados: captura recetas de notas o fotos, cocina con temporizadores automáticos y consulta al Chef Remy con lo que tienes en tu nevera.',
        featuresTitle: '¿Qué puedes hacer en Pulse & Cook?',
        features: [
          {
            icon: <Sparkles className="w-5 h-5 text-amber-600" />,
            title: 'IA y Auto-Traducción',
            desc: 'Escribe tu receta en español o inglés; el sistema la traducirá y organizará automáticamente con ingredientes y tiempos claros.',
          },
          {
            icon: <ChefHat className="w-5 h-5 text-emerald-600" />,
            title: 'Chef Remy Asistente',
            desc: 'Pregúntale qué cocinar con los ingredientes que tienes a mano o pídele sugerencias y sustitutos culinarios en tiempo real.',
          },
          {
            icon: <Utensils className="w-5 h-5 text-orange-600" />,
            title: 'Modo Cocina Guiado',
            desc: 'Visualiza la receta paso a paso a pantalla completa con temporizadores integrados y ajuste instantáneo de porciones.',
          },
          {
            icon: <ShoppingCart className="w-5 h-5 text-blue-600" />,
            title: 'Lista de Compras Inteligente',
            desc: 'Agrega los ingredientes que te faltan con un solo clic, organizados por pasillos y listos para exportar a WhatsApp o PDF.',
          },
        ],
        cta: 'Comenzar a explorar recetas',
      }
    : {
        badge: 'Welcome to your smart kitchen',
        title: 'Pulse & Cook',
        tagline: 'Your smart culinary notebook & living cookbook',
        description:
          'Designed to transform how you save, cook, and share your favorite dishes. Say goodbye to messy notebooks: capture recipes from raw notes or photos, cook with hands-free step timers, and ask Chef Remy what to make with ingredients in your fridge.',
        featuresTitle: 'What can you do with Pulse & Cook?',
        features: [
          {
            icon: <Sparkles className="w-5 h-5 text-amber-600" />,
            title: 'AI & Auto-Translation',
            desc: 'Write your recipe once in any language; the system automatically translates and formats it with clear steps and times.',
          },
          {
            icon: <ChefHat className="w-5 h-5 text-emerald-600" />,
            title: 'Chef Remy Assistant',
            desc: 'Ask him what to cook with whatever you have in your pantry or get real-time culinary suggestions and smart swaps.',
          },
          {
            icon: <Utensils className="w-5 h-5 text-orange-600" />,
            title: 'Guided Cooking Mode',
            desc: 'Cook step-by-step in an immersive full-screen view with interactive sound timers and dynamic serving scalers.',
          },
          {
            icon: <ShoppingCart className="w-5 h-5 text-blue-600" />,
            title: 'Smart Grocery List',
            desc: 'Add missing ingredients with a single tap, sorted by supermarket aisle and ready to share via WhatsApp or printable PDF.',
          },
        ],
        cta: 'Start exploring recipes',
      };

  const handleStart = () => {
    try {
      localStorage.setItem('pulse_cook_welcome_seen', 'true');
    } catch {
      // Ignore localStorage errors
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#FDFBF7] text-[#2C3523] rounded-2xl shadow-2xl border border-[#D8D3C4] overflow-hidden my-6">
        
        {/* Barra superior con selector de idioma y cerrar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFECE1] bg-[#FAF8F2]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onLanguageChange(isEs ? 'en' : 'es')}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#5C6650] bg-[#EFECE1] hover:bg-[#E5E0D0] rounded-full transition-colors cursor-pointer"
              title={isEs ? 'Switch to English' : 'Cambiar a Español'}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>{isEs ? 'EN (English)' : 'ES (Español)'}</span>
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

        {/* Hero Content */}
        <div className="px-6 md:px-8 pt-6 pb-3 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EAE5D6] text-[#4A5340] text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            {content.badge}
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold text-[#2C3523] tracking-tight">
            {content.title}
          </h2>
          <p className="text-sm md:text-base font-semibold text-[#66725A] mt-1">
            {content.tagline}
          </p>

          <p className="mt-3 text-xs md:text-sm text-[#4A5340] leading-relaxed max-w-lg mx-auto">
            {content.description}
          </p>
        </div>

        {/* 4 Funcionalidades Destacadas */}
        <div className="px-6 md:px-8 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#737D67] mb-3 text-center">
            {content.featuresTitle}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {content.features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F4F1EA] border border-[#E5DFD0]"
              >
                <div className="p-2 rounded-lg bg-white shadow-2xs shrink-0">
                  {feat.icon}
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-[#2C3523]">
                    {feat.title}
                  </h4>
                  <p className="text-[11px] md:text-xs text-[#5C6650] mt-0.5 leading-normal">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 md:px-8 py-4 bg-[#FAF8F2] border-t border-[#EFECE1] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#737D67]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{isEs ? 'Recetario sincronizado y listo' : 'Cookbook synced & ready'}</span>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2C3523] hover:bg-[#3D4932] text-[#FDFBF7] font-semibold text-xs md:text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>{content.cta}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

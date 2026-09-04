'use client';

import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Smartphone, Share, PlusSquare, X } from 'lucide-react';

interface PWAInstallButtonProps {
  lang: 'ES' | 'EN';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const isEs = lang === 'ES';

  // If already running inside standalone PWA mode, hide the install UI
  if (isInstalled) {
    return null;
  }

  // Neither installable prompt nor iOS device detected yet
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800 text-amber-100 hover:bg-emerald-900 border border-emerald-700/50 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
          title={isEs ? 'Instalar Pulse&Cook en tu dispositivo' : 'Install Pulse&Cook on your device'}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-300" />
          <span>{isEs ? 'Instalar App' : 'Install App'}</span>
        </button>
      )}

      {isIOS && !isInstallable && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#EFECE1] text-[#2C3523] border border-[#D8D3C4] hover:bg-[#E2DEC2] rounded-xl text-xs font-semibold transition-all active:scale-95"
          title={isEs ? 'Instalar en iPhone / iPad' : 'Install on iPhone / iPad'}
        >
          <Smartphone className="w-3.5 h-3.5 text-[#5C6650]" />
          <span>{isEs ? 'Instalar en iOS' : 'Install on iOS'}</span>
        </button>
      )}

      {/* Modal explicativo paso a paso para iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#FDFBF7] border border-[#D8D3C4] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DFD0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2C3523] flex items-center justify-center text-amber-300">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#2C3523]">
                  {isEs ? 'Instalar en iPhone / iPad' : 'Install on iPhone / iPad'}
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-[#737D67] hover:text-[#2C3523] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5C6650] leading-relaxed">
              {isEs
                ? 'Agrega Pulse&Cook a tu pantalla de inicio para usarla a pantalla completa, sin barras del navegador y con acceso instantáneo en tu cocina:'
                : 'Add Pulse&Cook to your Home Screen to use it full-screen with no browser bars and instant access in your kitchen:'}
            </p>

            <div className="space-y-3 bg-[#FAF8F2] p-3.5 rounded-xl border border-[#E5DFD0] text-xs text-[#2C3523]">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#EAE5D6] flex items-center justify-center shrink-0 font-bold text-[11px] text-[#2C3523]">
                  1
                </div>
                <div>
                  <span className="font-semibold">{isEs ? 'Toca el botón Compartir' : 'Tap the Share button'}</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#737D67] mt-0.5">
                    <Share className="w-3.5 h-3.5 text-blue-600 inline" />
                    <span>{isEs ? '(Ícono en la barra inferior de Safari)' : '(Icon in Safari bottom toolbar)'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#EAE5D6] flex items-center justify-center shrink-0 font-bold text-[11px] text-[#2C3523]">
                  2
                </div>
                <div>
                  <span className="font-semibold">{isEs ? 'Desliza y selecciona' : 'Scroll and select'}</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#737D67] mt-0.5">
                    <PlusSquare className="w-3.5 h-3.5 text-[#2C3523] inline" />
                    <span className="font-medium text-[#2C3523]">
                      {isEs ? '"Agregar al inicio"' : '"Add to Home Screen"'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-[#2C3523] text-[#FDFBF7] rounded-xl text-xs font-bold hover:bg-[#3D4932] transition-colors"
            >
              {isEs ? '¡Entendido!' : 'Got it!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

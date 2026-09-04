'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Download, Smartphone, QrCode, Sparkles } from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ES' | 'EN';
}

export function ShareAppModal({ isOpen, onClose, lang }: ShareAppModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [appUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );
  const [activeTab, setActiveTab] = useState<'qr' | 'install'>('qr');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = window.location.origin;

    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#2C3523',
        light: '#FDFBF7',
      },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Error generating QR Code:', err);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const isEs = lang === 'ES';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = isEs
      ? `🍽️ ¡Te comparto *Pulse & Cook*!\nTu recetario inteligente con Chef IA, escalador de porciones y modo cocina paso a paso.\n\nPruébala o instálala directamente en tu celular aquí:\n${appUrl}`
      : `🍽️ Check out *Pulse & Cook*!\nYour smart recipe book with Chef AI, portion scaler, and step-by-step cooking mode.\n\nOpen or install it directly on your phone here:\n${appUrl}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'PulseAndCook-QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn"
      id="share-app-modal-overlay"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#F7F5EC] border border-[#D8D3C4] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        id="share-app-modal-content"
      >
        {/* Header del Modal */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#EFECE1] border-b border-[#D8D3C4]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#2C3523] text-amber-200 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-sm text-[#2C3523]">
                {isEs ? 'Compartir Pulse & Cook' : 'Share Pulse & Cook'}
              </h2>
              <p className="text-[11px] text-[#5C6650]">
                {isEs ? 'Acceso rápido con Código QR y WhatsApp' : 'Quick access via QR code & WhatsApp'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EAE5D6] hover:bg-[#DED8C6] active:scale-95 text-[#2C3523] flex items-center justify-center border border-[#D8D3C4] transition-all cursor-pointer"
            id="share-app-close-button"
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Selector de pestañas */}
        <div className="flex border-b border-[#D8D3C4] bg-[#EFECE1]/50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'qr'
                ? 'border-[#2C3523] text-[#2C3523]'
                : 'border-transparent text-[#5C6650] hover:text-[#2C3523]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{isEs ? 'Código QR & Compartir' : 'QR Code & Share'}</span>
          </button>
          <button
            onClick={() => setActiveTab('install')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'install'
                ? 'border-[#2C3523] text-[#2C3523]'
                : 'border-transparent text-[#5C6650] hover:text-[#2C3523]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isEs ? 'Guía de Instalación PWA' : 'PWA Install Guide'}</span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[#2C3523]">
          {activeTab === 'qr' ? (
            <>
              {/* Contenedor del Código QR */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-white rounded-2xl border-2 border-[#2C3523]/20 shadow-md mb-3 relative group">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code Pulse & Cook"
                      className="w-52 h-52 object-contain"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center bg-stone-100 text-stone-400">
                      <span>{isEs ? 'Generando QR...' : 'Generating QR...'}</span>
                    </div>
                  )}
                  <div className="text-[10px] font-bold text-[#2C3523] tracking-wider uppercase mt-1">
                    Pulse & Cook PWA
                  </div>
                </div>

                <p className="text-[11px] text-[#5C6650] max-w-xs leading-relaxed">
                  {isEs
                    ? 'Apunta con la cámara de cualquier teléfono para abrir o instalar la app al instante.'
                    : 'Point with any phone camera to instantly open or install the app.'}
                </p>
              </div>

              {/* Botón Principal WhatsApp */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                  id="share-whatsapp-button"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.974.531 1.83.813 2.796.814 3.183 0 5.769-2.588 5.77-5.768 0-3.181-2.587-5.768-5.77-5.768zm3.364 8.163c-.141.398-.711.758-1.034.792-.324.034-.737.154-2.433-.553-1.472-.614-2.42-2.115-2.493-2.213-.074-.098-.598-.796-.598-1.518 0-.722.378-1.076.513-1.223.134-.147.294-.184.392-.184.098 0 .196 0 .282.006.09.006.211-.034.33.251.123.294.417 1.018.454 1.092.037.074.062.16.012.257-.049.098-.074.16-.147.245-.074.086-.156.192-.223.257-.074.074-.151.155-.065.302.086.147.383.633.823 1.025.566.505 1.043.662 1.19.736.147.074.233.061.32-.037.086-.098.368-.429.466-.576.098-.147.196-.123.331-.074.135.049.859.405 1.006.478.147.074.245.11.282.172.037.061.037.356-.104.754z" />
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.95.56 3.77 1.53 5.32L2.05 22l4.82-1.44C8.36 21.49 10.13 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18.2c-1.68 0-3.25-.49-4.58-1.33l-.33-.21-2.86.85.86-2.77-.22-.35A8.16 8.16 0 013.8 12c0-4.52 3.68-8.2 8.2-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.52-3.68 8.2-8.2 8.2z" />
                  </svg>
                  <span>{isEs ? 'Enviar por WhatsApp' : 'Send via WhatsApp'}</span>
                </button>

                <div className="flex gap-2">
                  {/* Copiar enlace */}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#EFECE1] hover:bg-[#E2DEC2] border border-[#D8D3C4] text-[#2C3523] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    id="share-copy-link-button"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (isEs ? '¡Enlace Copiado!' : 'Link Copied!') : (isEs ? 'Copiar Enlace' : 'Copy Link')}</span>
                  </button>

                  {/* Descargar QR */}
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="py-2.5 px-3 rounded-xl bg-[#EFECE1] hover:bg-[#E2DEC2] border border-[#D8D3C4] text-[#2C3523] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title={isEs ? 'Descargar imagen QR' : 'Download QR Image'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Guardar QR' : 'Save QR'}</span>
                  </button>
                </div>
              </div>

              {/* URL directa visible */}
              <div className="bg-[#EFECE1]/60 p-2.5 rounded-xl border border-[#D8D3C4] flex items-center justify-between text-[11px] text-[#5C6650]">
                <span className="truncate pr-2 select-all font-mono">{appUrl}</span>
                <span className="shrink-0 text-[10px] font-bold text-[#2C3523] uppercase">PWA</span>
              </div>
            </>
          ) : (
            /* Pestaña de Guía de Instalación */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {isEs
                    ? 'Pulse & Cook es una Progressive Web App (PWA). No ocupa espacio de la Play Store ni App Store y funciona con o sin internet.'
                    : 'Pulse & Cook is a Progressive Web App (PWA). It does not take App Store space and works seamlessly offline.'}
                </p>
              </div>

              {/* Instrucciones Android */}
              <div className="p-3.5 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#2C3523] text-xs">
                  <span className="w-5 h-5 rounded-md bg-[#2C3523] text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>{isEs ? 'En Celulares Android (Chrome)' : 'On Android Phones (Chrome)'}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#5C6650] pl-1">
                  <li>{isEs ? 'Escanea el QR o abre el enlace en Google Chrome.' : 'Scan QR or open the link in Google Chrome.'}</li>
                  <li>
                    {isEs ? (
                      <>Toca el menú de tres puntos (<strong>⋮</strong>) arriba a la derecha.</>
                    ) : (
                      <>Tap the three dots menu (<strong>⋮</strong>) top right.</>
                    )}
                  </li>
                  <li>
                    {isEs ? (
                      <>Selecciona <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</>
                    ) : (
                      <>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>
                    )}
                  </li>
                </ol>
              </div>

              {/* Instrucciones iPhone */}
              <div className="p-3.5 rounded-xl bg-[#EFECE1] border border-[#D8D3C4] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#2C3523] text-xs">
                  <span className="w-5 h-5 rounded-md bg-[#2C3523] text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>{isEs ? 'En iPhone / iPad (Safari)' : 'On iPhone / iPad (Safari)'}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#5C6650] pl-1">
                  <li>{isEs ? 'Apunta con la cámara al QR y ábrelo en Safari.' : 'Point the camera at the QR and open in Safari.'}</li>
                  <li>
                    {isEs ? (
                      <>Toca el botón Compartir (el ícono del cuadrado con la flecha hacia arriba <strong>⎋</strong>).</>
                    ) : (
                      <>Tap the Share button (square with arrow pointing up <strong>⎋</strong>).</>
                    )}
                  </li>
                  <li>
                    {isEs ? (
                      <>Desliza hacia abajo y elige <strong>Agregar a la pantalla de inicio</strong>.</>
                    ) : (
                      <>Scroll down and tap <strong>Add to Home Screen</strong>.</>
                    )}
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#EFECE1] border-t border-[#D8D3C4] flex items-center justify-between">
          <span className="text-[11px] text-[#5C6650] italic">
            {isEs ? 'Pulse & Cook PWA v2.0' : 'Pulse & Cook PWA v2.0'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2C3523] text-[#F7F5EC] rounded-xl text-xs font-bold hover:bg-[#3D4932] transition-colors cursor-pointer shadow-xs"
          >
            {isEs ? 'Entendido' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}

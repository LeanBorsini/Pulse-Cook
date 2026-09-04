'use client';

import React from 'react';
import { useOnlineStatus } from './usePWAInstall';
import { WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
  lang: 'ES' | 'EN';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang }) => {
  const isOnline = useOnlineStatus();
  const isEs = lang === 'ES';

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#2C3523] border border-amber-600/40 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-xl backdrop-blur-xs animate-in slide-in-from-bottom-2">
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>
        {isEs
          ? 'Modo sin conexión — Usando recetas guardadas en tu dispositivo.'
          : 'Offline mode — Using local recipe cache.'}
      </span>
    </div>
  );
};

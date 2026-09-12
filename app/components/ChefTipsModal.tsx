'use client';

import { ChefTip } from '@/app/types';
import { ChefTipsFeed } from './ChefTipsFeed';
import { User } from '@supabase/supabase-js';
import { Lightbulb, X } from 'lucide-react';

interface ChefTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tips: ChefTip[];
  lang: 'ES' | 'EN';
  user: User | null;
  profileUsername: string | null;
  onOpenNewTip: () => void;
  onOpenTipDetail: (tip: ChefTip) => void;
  onEditTip: (tip: ChefTip) => void;
  onDeleteTip: (tipId: string) => void;
  onTipUpdated?: (updatedTip: ChefTip) => void;
  onOpenAuth: () => void;
  onReportTip?: (tip: ChefTip) => void;
}

export function ChefTipsModal({
  isOpen,
  onClose,
  tips,
  lang,
  user,
  profileUsername,
  onOpenNewTip,
  onOpenTipDetail,
  onEditTip,
  onDeleteTip,
  onTipUpdated,
  onOpenAuth,
  onReportTip,
}: ChefTipsModalProps) {
  const isEs = lang === 'ES';

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn"
      id="chef-tips-modal-backdrop"
    >
      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto text-[#2C3523] flex flex-col">
        {/* Encabezado Fijo del Modal */}
        <div className="sticky -top-4 sm:-top-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#F7F5EC]/95 backdrop-blur-md border-b border-[#D8D3C4] flex items-center justify-between z-20 mb-4">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#2C3523] flex items-center justify-center shadow-xs shrink-0">
              <Lightbulb className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#2C3523] flex items-center gap-2 truncate">
                <span>{isEs ? 'Tips & Hacks de Chef' : 'Chef Tips & Hacks'}</span>
                <span className="text-[10px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {tips.length} {isEs ? 'tips' : 'tips'}
                </span>
              </h2>
              <p className="text-xs text-[#5C6650] truncate">
                {isEs
                  ? 'Trucos relámpago, ciencia culinaria y atajos para cocinar mejor en casa'
                  : 'Flash hacks, culinary science, and shortcuts to cook better at home'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EAE5D6] hover:bg-[#DED8C6] active:scale-90 text-[#2C3523] flex items-center justify-center border border-[#D8D3C4] transition-all cursor-pointer shadow-xs shrink-0"
            title={isEs ? 'Cerrar' : 'Close'}
            aria-label={isEs ? 'Cerrar' : 'Close'}
            id="chef-tips-modal-close-btn"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Contenido Principal: Feed de Tips */}
        <div className="flex-1">
          <ChefTipsFeed
            tips={tips}
            lang={lang}
            user={user}
            profileUsername={profileUsername}
            onOpenNewTip={onOpenNewTip}
            onOpenTipDetail={onOpenTipDetail}
            onEditTip={onEditTip}
            onDeleteTip={onDeleteTip}
            onTipUpdated={onTipUpdated}
            onOpenAuth={onOpenAuth}
            onReportTip={onReportTip}
          />
        </div>
      </div>
    </div>
  );
}

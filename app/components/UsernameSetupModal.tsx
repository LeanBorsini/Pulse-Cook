'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface UsernameSetupModalProps {
  isOpen: boolean;
  userId: string;
  suggestedUsername?: string;
  lang: 'ES' | 'EN';
  onSuccess: (newUsername: string) => void;
}

export function UsernameSetupModal({
  isOpen,
  userId,
  suggestedUsername = '',
  lang,
  onSuccess,
}: UsernameSetupModalProps) {
  const [alias, setAlias] = useState(suggestedUsername);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const cleanAlias = alias.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const isTooShort = cleanAlias.length > 0 && cleanAlias.length < 3;

  // Validar y chequear disponibilidad con debounce
  useEffect(() => {
    if (cleanAlias.length < 3) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', cleanAlias)
          .neq('id', userId)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          setIsAvailable(true);
          setErrorMsg('');
        } else if (data) {
          setIsAvailable(false);
          setErrorMsg(lang === 'ES' ? 'Este alias ya está en uso' : 'This username is already taken');
        } else {
          setIsAvailable(true);
          setErrorMsg('');
        }
      } catch {
        if (isMounted) {
          setIsAvailable(true);
          setErrorMsg('');
        }
      } finally {
        if (isMounted) setChecking(false);
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cleanAlias, userId, lang]);

  if (!isOpen) return null;

  const handleInputChange = (val: string) => {
    const formatted = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setAlias(formatted);
    setIsAvailable(null);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cleanAlias.length < 3 || isAvailable === false) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        username: cleanAlias,
      });

      if (error) {
        setErrorMsg(error.message);
        setSaving(false);
        return;
      }

      onSuccess(cleanAlias);
    } catch {
      onSuccess(cleanAlias);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-[#2C3523]">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-[#2C3523] text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[#2C3523]">
            {lang === 'ES' ? 'Elige tu Alias de Chef' : 'Choose your Chef Alias'}
          </h2>
        </div>

        <p className="text-xs text-[#5C6650] mb-5 leading-relaxed">
          {lang === 'ES'
            ? 'Tu alias será tu firma pública en todas tus recetas y comentarios (ej. @leanBorsini). Tu correo nunca será visible.'
            : 'Your alias will be your public signature on all recipes and comments (e.g. @leanBorsini). Your email will never be exposed.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C6650] mb-1.5">
              {lang === 'ES' ? 'Nombre de usuario (@alias)' : 'Username (@alias)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-stone-400 font-bold">@</span>
              <input
                type="text"
                autoFocus
                placeholder="tu_alias"
                value={alias}
                onChange={(e) => handleInputChange(e.target.value)}
                maxLength={20}
                className="w-full bg-[#EFECE1] border border-[#D8D3C4] rounded-xl py-2.5 pl-8 pr-10 text-sm font-semibold text-[#2C3523] outline-none focus:border-[#2C3523] transition-all"
                required
              />
              <div className="absolute right-3 top-3">
                {checking ? (
                  <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
                ) : isAvailable === true ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isAvailable === false ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>

            {isTooShort ? (
              <p className="text-stone-500 text-xs mt-1.5 font-medium">
                {lang === 'ES' ? 'Mínimo 3 caracteres' : 'Minimum 3 characters'}
              </p>
            ) : errorMsg ? (
              <p className="text-red-600 text-xs mt-1.5 font-medium">{errorMsg}</p>
            ) : isAvailable === true ? (
              <p className="text-emerald-700 text-xs mt-1.5 font-medium">
                {lang === 'ES' ? '¡Alias disponible!' : 'Alias available!'}
              </p>
            ) : (
              <p className="text-stone-400 text-[11px] mt-1.5">
                {lang === 'ES' ? 'De 3 a 20 caracteres (letras, números y guión bajo)' : '3 to 20 characters (letters, numbers and underscore)'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || checking || isAvailable === false || cleanAlias.length < 3}
            className="w-full py-3 bg-[#2C3523] text-[#F7F5EC] rounded-xl font-semibold text-sm hover:bg-[#3D4932] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {lang === 'ES' ? 'Guardando alias...' : 'Saving alias...'}
              </>
            ) : (
              lang === 'ES' ? 'Confirmar y Comenzar' : 'Confirm & Get Started'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

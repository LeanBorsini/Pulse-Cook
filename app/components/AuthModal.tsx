'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg('');

    const formattedUsername = username.trim().toLowerCase().replace(/\s+/g, '_');

    // Enviamos signInWithOtp registrando metadatos por si el usuario es nuevo
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        data: {
          display_name: username.trim() || email.split('@')[0],
          username: formattedUsername || email.split('@')[0],
        },
      },
    });

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Verificamos el OTP enviado
    let { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpToken.trim(),
      type: 'email',
    });

    if (error) {
      // Intento de fallback por si Supabase etiquetó la verificación como signup
      const fallback = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpToken.trim(),
        type: 'signup',
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data.user) {
      setLoading(false);
      setErrorMsg(error?.message || 'Código incorrecto o expirado.');
      return;
    }

    // Registrar o actualizar la tabla profiles
    const userAlias =
      username.trim().toLowerCase().replace(/\s+/g, '_') ||
      data.user.user_metadata?.username ||
      email.split('@')[0];

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', data.user.id)
      .single();

    if (!existingProfile?.username) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: userAlias,
      });
    }

    setLoading(false);
    setStep('success');
    setTimeout(() => {
      onClose();
      setStep('email');
      setUsername('');
      setOtpToken('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#f2efe9] p-6 rounded-2xl max-w-md w-full shadow-xl border border-stone-200 text-stone-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Ingresar a Pulse&Cook</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800 font-bold text-lg">✕</button>
        </div>

        {errorMsg && <p className="text-red-600 text-sm mb-3 bg-red-100 p-2 rounded">{errorMsg}</p>}

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Tu Correo Electrónico</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-stone-300 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Tu Alias (solo si es tu primera vez)</label>
              <input
                type="text"
                placeholder="ej. leanborsini"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-stone-300 bg-white"
              />
              <p className="text-[11px] text-stone-500 mt-1">Si ya te has registrado antes, tu alias guardado se usará automáticamente.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2b382b] text-white rounded-lg font-semibold hover:bg-[#1e271e] transition-colors"
            >
              {loading ? 'Enviando código...' : 'Continuar con Email'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-stone-600">Enviamos un código a <strong>{email}</strong>.</p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Código de verificación</label>
              <input
                type="text"
                placeholder="123456"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-stone-300 bg-white text-center text-xl tracking-widest font-mono"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2b382b] text-white rounded-lg font-semibold hover:bg-[#1e271e] transition-colors"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <span className="text-4xl">🎉</span>
            <p className="text-lg font-semibold mt-2">¡Sesión iniciada con éxito!</p>
          </div>
        )}
      </div>
    </div>
  );
}
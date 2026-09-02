'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, KeyRound, ArrowRight, Loader2, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  lang?: 'ES' | 'EN';
  onClose: () => void;
  onAuthenticated?: (user: User) => void;
}

export function AuthModal({ isOpen, lang = 'ES', onClose, onAuthenticated }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'waiting' | 'success'>('email');
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSendAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setStep('waiting');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar el acceso');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpToken.trim();
    if (!cleanCode) return;

    setLoading(true);
    setErrorMsg('');

    try {
      let { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanCode,
        type: 'email',
      });

      if (error) {
        // Fallback para usuarios nuevos con type 'signup'
        const fallback = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: cleanCode,
          type: 'signup',
        });
        data = fallback.data;
        error = fallback.error;
      }

      if (error || !data.user) {
        setErrorMsg(
          lang === 'ES'
            ? 'Código no válido o expirado. Si tu correo solo tiene un botón "Sign in", haz clic en él.'
            : 'Invalid or expired code. If your email only has a "Sign in" button, click it.'
        );
        setLoading(false);
        return;
      }

      setStep('success');
      const verifiedUser = data.user;
      setTimeout(() => {
        onClose();
        setStep('email');
        setEmail('');
        setOtpToken('');
        if (onAuthenticated) {
          onAuthenticated(verifiedUser);
        }
      }, 900);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al validar el código');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep('email');
    setErrorMsg('');
    setEmail('');
    setOtpToken('');
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) resetModal();
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn"
    >
      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative text-[#2C3523]">
        <button
          type="button"
          onClick={resetModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#EAE5D6] hover:bg-[#DED8C6] active:scale-90 text-[#2C3523] flex items-center justify-center border border-[#D8D3C4] transition-all cursor-pointer shadow-xs"
          title={lang === 'ES' ? 'Cerrar' : 'Close'}
          aria-label={lang === 'ES' ? 'Cerrar' : 'Close'}
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-[#2C3523] text-white">
            {step === 'waiting' ? <KeyRound className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
          </div>
          <h2 className="text-xl font-serif font-bold text-[#2C3523]">
            {step === 'waiting'
              ? lang === 'ES' ? 'Acceso Enviado a tu Correo' : 'Access Sent to your Email'
              : lang === 'ES' ? 'Ingresar a Pulse&Cook' : 'Sign in to Pulse&Cook'}
          </h2>
        </div>

        <p className="text-xs text-[#5C6650] mb-5 leading-relaxed">
          {step === 'waiting'
            ? lang === 'ES'
              ? `Revisa tu correo ${email} (también en spam). Puedes ingresar de dos maneras:`
              : `Check your inbox at ${email} (and spam). You can sign in in two ways:`
            : lang === 'ES'
              ? 'Acceso 100% seguro sin contraseñas. Funciona en el mismo dispositivo o entre dispositivos distintos.'
              : '100% secure passwordless access. Works seamlessly on this device or across different devices.'}
        </p>

        {errorMsg && (
          <div className="text-red-700 bg-red-100/90 border border-red-200 text-xs p-3 rounded-xl mb-4 font-medium">
            {errorMsg}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleSendAccess} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C6650] mb-1.5">
                {lang === 'ES' ? 'Tu Correo Electrónico' : 'Your Email Address'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  autoFocus
                  placeholder="chef@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#EFECE1] border border-[#D8D3C4] rounded-xl py-2.5 px-3.5 text-sm font-medium text-[#2C3523] outline-none focus:border-[#2C3523] transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-[#2C3523] text-[#F7F5EC] rounded-xl font-semibold text-sm hover:bg-[#3D4932] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {lang === 'ES' ? 'Enviando acceso...' : 'Sending access...'}
                </>
              ) : (
                <>
                  {lang === 'ES' ? 'Enviar Acceso por Correo' : 'Send Access by Email'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {step === 'waiting' && (
          <div className="space-y-4">
            {/* Opción 1: Magic Link (mismo dispositivo) */}
            <div className="bg-[#EFECE1] p-3.5 rounded-xl border border-[#D8D3C4]">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#2C3523] text-white shrink-0 mt-0.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2C3523]">
                    {lang === 'ES' ? 'Opción 1: Clic en el enlace' : 'Option 1: Click the link'}
                  </h4>
                  <p className="text-[11px] text-[#5C6650] mt-0.5 leading-normal">
                    {lang === 'ES'
                      ? 'Abre el correo en este dispositivo y pulsa "Sign In". ¡Iniciarás sesión automáticamente!'
                      : 'Open the email on this device and click "Sign In". You will be logged in automatically!'}
                  </p>
                </div>
              </div>
            </div>

            {/* Separador */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#D8D3C4]"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold tracking-wider text-[#5C6650] uppercase">
                {lang === 'ES' ? 'O si estás en otro dispositivo' : 'Or if on another device'}
              </span>
              <div className="flex-grow border-t border-[#D8D3C4]"></div>
            </div>

            {/* Opción 2: Código OTP */}
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-center text-[#2C3523] mb-1">
                  {lang === 'ES' ? 'Opción 2: Ingresa el código de 6 dígitos' : 'Option 2: Enter 6-digit code'}
                </label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="123456"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-[#EFECE1] border border-[#D8D3C4] rounded-xl py-2.5 px-3 text-center text-xl tracking-[0.25em] font-mono font-bold text-[#2C3523] outline-none focus:border-[#2C3523] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpToken.trim().length < 6}
                className="w-full py-2.5 bg-[#2C3523] text-[#F7F5EC] rounded-xl font-semibold text-xs hover:bg-[#3D4932] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {lang === 'ES' ? 'Validando código...' : 'Verifying code...'}
                  </>
                ) : (
                  lang === 'ES' ? 'Validar Código' : 'Verify Code'
                )}
              </button>
            </form>

            <div className="flex justify-between items-center pt-2 text-xs border-t border-[#D8D3C4]/60">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtpToken('');
                  setErrorMsg('');
                }}
                className="text-[#5C6650] hover:text-[#2C3523] underline font-medium"
              >
                {lang === 'ES' ? 'Cambiar correo' : 'Change email'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSendAccess}
                className="text-[#2C3523] hover:underline font-bold"
              >
                {lang === 'ES' ? 'Reenviar correo' : 'Resend email'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-lg font-serif font-bold text-[#2C3523]">
              {lang === 'ES' ? '¡Acceso Confirmado!' : 'Access Confirmed!'}
            </p>
            <p className="text-xs text-[#5C6650] mt-1">
              {lang === 'ES' ? 'Iniciando tu recetario...' : 'Starting your recipe book...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

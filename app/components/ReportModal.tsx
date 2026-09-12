'use client';

import { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Send,
  Flag,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { ReportTargetType, ReportReasonCategory } from '../types';
import { submitContentReport } from '@/lib/reportStore';

export interface ReportModalTarget {
  type: ReportTargetType;
  id: string;
  title?: string;
  snippet?: string;
  reportedUserId?: string;
  reportedUsername?: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ES' | 'EN';
  user: User | null;
  profileUsername?: string | null;
  target: ReportModalTarget | null;
  onOpenAuth: () => void;
  onReportSubmitted?: () => void;
}

export function ReportModal({
  isOpen,
  onClose,
  lang,
  user,
  profileUsername,
  target,
  onOpenAuth,
  onReportSubmitted,
}: ReportModalProps) {
  const isEs = lang === 'ES';

  const [reasonCategory, setReasonCategory] = useState<ReportReasonCategory>('spam_scam');
  const [reasonText, setReasonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !target) return null;

  const categories: { key: ReportReasonCategory; labelEs: string; labelEn: string; descEs: string; descEn: string; icon: string }[] = [
    {
      key: 'spam_scam',
      labelEs: 'Spam o Enlaces Sospechosos',
      labelEn: 'Spam or Suspicious Links',
      descEs: 'Publicidad no autorizada, links extraños, estafas o contenido promocional fuera de lugar.',
      descEn: 'Unauthorized ads, scam links, phishing or off-topic commercial spam.',
      icon: '🚨',
    },
    {
      key: 'inappropriate_nudity',
      labelEs: 'Contenido Inapropiado o Desnudez',
      labelEn: 'Inappropriate or Explicit Content',
      descEs: 'Imágenes o textos explícitos, desnudos, violencia o temática que desvirtúe el propósito de cocina.',
      descEn: 'Explicit images, nudity, violence or content inappropriate for a family cooking app.',
      icon: '⚠️',
    },
    {
      key: 'offensive_harassment',
      labelEs: 'Falta de Respeto o Acoso',
      labelEn: 'Disrespect, Bullying or Harassment',
      descEs: 'Insultos, provocaciones, lenguaje discriminatorio o ataques hacia otros cocineros.',
      descEn: 'Insults, hostility, discriminatory remarks, or personal harassment toward cooks.',
      icon: '🛑',
    },
    {
      key: 'dangerous_misleading',
      labelEs: 'Información Engañosa o Peligrosa',
      labelEn: 'Dangerous or Misleading Info',
      descEs: 'Instrucciones culinarias peligrosas, tóxicas, falsas o que comprometan la salud.',
      descEn: 'Dangerous preparation advice, unsafe consumption, or toxic culinary practices.',
      icon: '🧪',
    },
    {
      key: 'other',
      labelEs: 'Otro Motivo',
      labelEn: 'Other Reason',
      descEs: 'Cualquier otra vulneración de las directrices de convivencia de Pulse&Cook.',
      descEn: 'Any other violation of community guidelines and app integrity.',
      icon: '💬',
    },
  ];

  const getTargetTypeBadge = () => {
    switch (target.type) {
      case 'recipe':
        return isEs ? 'Receta' : 'Recipe';
      case 'tip':
        return isEs ? 'Tip de Chef' : 'Chef Tip';
      case 'comment':
        return isEs ? 'Comentario de Receta' : 'Recipe Comment';
      case 'tip_experience':
        return isEs ? 'Experiencia de Tip' : 'Tip Experience';
      default:
        return isEs ? 'Publicación' : 'Post';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      onClose();
      onOpenAuth();
      return;
    }

    if (reasonText.trim().length < 10) {
      setErrorMessage(
        isEs
          ? 'Por favor, detalla al menos 10 caracteres para que los moderadores puedan evaluar la denuncia.'
          : 'Please provide at least 10 characters explaining why you are reporting this.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitContentReport({
        reporter: user,
        reporterUsername: profileUsername || user.email?.split('@')[0],
        targetType: target.type,
        targetId: target.id,
        targetTitle: target.title,
        targetSnippet: target.snippet,
        reportedUserId: target.reportedUserId,
        reportedUsername: target.reportedUsername,
        reasonCategory,
        reasonText,
      });

      if (res.success) {
        setIsSuccess(true);
        onReportSubmitted?.();
        setTimeout(() => {
          setIsSuccess(false);
          setReasonText('');
          onClose();
        }, 2200);
      } else {
        setErrorMessage(res.error || (isEs ? 'No se pudo enviar el reporte.' : 'Could not submit report.'));
      }
    } catch {
      setErrorMessage(isEs ? 'Ocurrió un error al enviar la denuncia.' : 'An error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F2] border border-[#D8D3C4] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-5 border-b border-[#D8D3C4] flex items-center justify-between bg-[#F2EFE9]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#2C3523]">
                {isEs ? 'Denunciar Contenido' : 'Report Content'}
              </h2>
              <p className="text-xs text-[#5C6650]">
                {isEs
                  ? 'Ayúdanos a mantener la comunidad limpia y segura'
                  : 'Help us maintain a safe and quality community'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#5C6650] hover:text-[#2C3523] hover:bg-[#EAE6DB] transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido / Formulario */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Si no ha iniciado sesión */}
          {!user && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
              <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="font-semibold">
                  {isEs
                    ? 'Se requiere iniciar sesión para denunciar.'
                    : 'Sign-in required to submit reports.'}
                </p>
                <p className="text-amber-800">
                  {isEs
                    ? 'Para evitar spam y denuncias anónimas maliciosas, solo usuarios autenticados con su correo y código OTP pueden reportar contenido.'
                    : 'To prevent malicious false reports, only authenticated users can flag content.'}
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="px-4 py-2 bg-[#2C3523] text-white rounded-xl font-bold hover:bg-[#3D4932] transition-colors cursor-pointer inline-flex items-center gap-2 text-xs"
                >
                  {isEs ? 'Iniciar sesión ahora' : 'Sign in now'}
                </button>
              </div>
            </div>
          )}

          {/* Tarjeta resumen del objetivo denunciado */}
          <div className="p-3.5 bg-white border border-[#D8D3C4] rounded-2xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-[#EFECE1] text-[#2C3523]">
                {getTargetTypeBadge()}
              </span>
              {target.reportedUsername && (
                <span className="text-xs text-[#5C6650]">
                  {isEs ? 'Publicado por' : 'By'}:{' '}
                  <strong className="text-[#2C3523]">@{target.reportedUsername}</strong>
                </span>
              )}
            </div>
            {target.title && (
              <p className="font-bold text-sm text-[#2C3523] truncate">
                {target.title}
              </p>
            )}
            {target.snippet && (
              <p className="text-xs text-[#5C6650] italic line-clamp-2 bg-[#F7F5EC] p-2 rounded-xl border border-[#E5E0D0]">
                &ldquo;{target.snippet}&rdquo;
              </p>
            )}
          </div>

          {/* Pantalla de Éxito */}
          {isSuccess ? (
            <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#2C3523]">
                {isEs ? 'Denuncia Enviada Correctamente' : 'Report Submitted'}
              </h3>
              <p className="text-xs sm:text-sm text-[#5C6650] max-w-sm mx-auto">
                {isEs
                  ? 'Gracias por cuidar la comunidad de Pulse&Cook. Nuestro equipo de moderadores revisará el caso de inmediato.'
                  : 'Thank you for protecting our community. Our moderation team has received your report.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selección del motivo */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2C3523] uppercase tracking-wider block">
                  {isEs ? 'Motivo de la denuncia:' : 'Reason for report:'}
                </label>
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const isSelected = reasonCategory === cat.key;
                    return (
                      <div
                        key={cat.key}
                        onClick={() => setReasonCategory(cat.key)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-[#EFECE1] border-[#2C3523] shadow-xs'
                            : 'bg-white border-[#D8D3C4] hover:bg-[#F7F5EC]'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#2C3523]">
                            {isEs ? cat.labelEs : cat.labelEn}
                          </p>
                          <p className="text-[11px] text-[#5C6650] leading-snug">
                            {isEs ? cat.descEs : cat.descEn}
                          </p>
                        </div>
                        <input
                          type="radio"
                          name="reason_category"
                          checked={isSelected}
                          onChange={() => setReasonCategory(cat.key)}
                          className="mt-1 accent-[#2C3523] shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Justificación obligatoria */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2C3523] flex items-center justify-between">
                  <span>
                    {isEs ? 'Detalles de la denuncia (obligatorio):' : 'Additional details (required):'}
                  </span>
                  <span className="text-[10px] text-[#5C6650] font-normal">
                    {reasonText.length} {isEs ? 'caracteres' : 'chars'} (min. 10)
                  </span>
                </label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Explica con tus palabras por qué consideras que infringe las normas (ej. link malicioso, spam, ofensas)...'
                      : 'Provide details on why this content should be reviewed or taken down...'
                  }
                  rows={3}
                  disabled={!user || isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8D3C4] rounded-2xl text-xs sm:text-sm text-[#2C3523] focus:outline-hidden focus:ring-2 focus:ring-[#2C3523]/30 resize-none disabled:bg-[#F2EFE9] disabled:opacity-60"
                  required
                />
              </div>

              {/* Nota sobre protección de umbral */}
              <div className="p-3 bg-[#EFECE1]/60 border border-[#D8D3C4]/70 rounded-2xl flex items-start gap-2.5 text-[11px] text-[#5C6650]">
                <ShieldCheck className="w-4 h-4 text-[#2C3523] shrink-0 mt-0.5" />
                <p>
                  {isEs
                    ? 'Protección preventiva: si una publicación acumula 3 denuncias de usuarios distintos, queda retirada automáticamente de la vista pública hasta que un moderador la revise.'
                    : 'Automatic protection: content receiving 3 distinct user reports is automatically quarantined under review until verified by a moderator.'}
                </p>
              </div>

              {/* Error si existe */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-[#D8D3C4] text-[#5C6650] hover:text-[#2C3523] text-xs font-bold transition-colors cursor-pointer"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!user || isSubmitting || reasonText.trim().length < 10}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting
                      ? isEs
                        ? 'Enviando...'
                        : 'Submitting...'
                      : isEs
                      ? 'Enviar Denuncia'
                      : 'Submit Report'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

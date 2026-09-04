'use client';

/**
 * @file CameraCaptureModal.tsx
 * @description Modal de captura de fotos en vivo mediante la cámara del dispositivo (móvil o PC).
 *
 * Características:
 * - Acceso a cámara en vivo mediante `navigator.mediaDevices.getUserMedia`.
 * - Cambio de cámara frontal / trasera (`facingMode`).
 * - Captura en alta resolución sobre un canvas y conversión inmediata a archivo JPEG.
 * - Manejo robusto de errores de permisos y cierre seguro de streams de video.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, RotateCcw, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  lang: 'ES' | 'EN';
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  lang,
}: CameraCaptureModalProps) {
  const isEs = lang === 'ES';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraError, setHasCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [flash, setFlash] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Stop active video stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Effect to initiate camera when modal opens or facingMode changes
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    let active = true;

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            isEs
              ? 'Tu navegador o dispositivo no soporta acceso directo a la cámara web.'
              : 'Your browser or device does not support direct camera access.'
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsInitializing(false);
      } catch (err: unknown) {
        if (!active) return;
        console.warn('Camera access error:', err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : isEs
            ? 'No se pudo acceder a la cámara. Revisa los permisos de tu navegador.'
            : 'Could not access the camera. Please check your browser permissions.';
        setHasCameraError(errorMsg);
        setIsInitializing(false);
      }
    }

    initCamera();

    return () => {
      active = false;
      stopStream();
    };
  }, [isOpen, facingMode, isEs, reloadKey, stopStream]);

  // Toggle front / back camera
  const toggleFacingMode = () => {
    setIsInitializing(true);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleRetry = () => {
    setIsInitializing(true);
    setHasCameraError(null);
    setReloadKey((k) => k + 1);
  };

  // Capture frame from video to canvas
  const handleSnap = () => {
    if (!videoRef.current || isInitializing || hasCameraError) return;

    // Visual flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If using front camera, mirror image for natural reflection
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const filename = `photo-pulse-cook-${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#1A1F16] border border-[#3E4A35] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2C3523] bg-[#1F251A] text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-wide uppercase">
              {isEs ? 'Tomar Foto de la Receta' : 'Take Recipe Photo'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
          {flash && (
            <div className="absolute inset-0 bg-white z-20 pointer-events-none animate-out fade-out" />
          )}

          {/* Video Stream */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            } ${isInitializing || hasCameraError ? 'opacity-0' : 'opacity-100'}`}
          />

          {/* Guide Overlay Corners */}
          {!isInitializing && !hasCameraError && (
            <div className="absolute inset-6 pointer-events-none border-2 border-white/25 rounded-2xl flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-amber-400" />
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-amber-400" />
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isInitializing && !hasCameraError && (
            <div className="absolute flex flex-col items-center gap-2 text-amber-200">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">
                {isEs ? 'Iniciando cámara...' : 'Starting camera...'}
              </span>
            </div>
          )}

          {/* Error Message */}
          {hasCameraError && (
            <div className="absolute inset-6 flex flex-col items-center justify-center p-4 text-center bg-black/60 rounded-2xl space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-amber-100 max-w-xs">{hasCameraError}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-1.5 bg-[#2C3523] text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-[#3E4A35]"
              >
                {isEs ? 'Reintentar' : 'Retry'}
              </button>
            </div>
          )}
        </div>

        {/* Shutter & Controls Footer */}
        <div className="flex items-center justify-between px-8 py-5 bg-[#1F251A] border-t border-[#2C3523]">
          {/* Switch Camera Button */}
          <button
            type="button"
            onClick={toggleFacingMode}
            disabled={isInitializing || !!hasCameraError}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-white disabled:opacity-40 transition-colors"
            title={isEs ? 'Cambiar cámara' : 'Switch camera'}
          >
            <div className="w-10 h-10 rounded-full bg-[#2C3523] flex items-center justify-center border border-[#3E4A35]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-gray-400">
              {isEs ? 'Girar' : 'Flip'}
            </span>
          </button>

          {/* Shutter Button */}
          <button
            type="button"
            onClick={handleSnap}
            disabled={isInitializing || !!hasCameraError}
            className="w-16 h-16 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
            title={isEs ? 'Tomar foto' : 'Take photo'}
          >
            <div className="w-full h-full rounded-full bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg" />
          </button>

          {/* Cancel button */}
          <button
            type="button"
            onClick={onClose}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#2C3523] flex items-center justify-center border border-[#3E4A35]">
              <X className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium text-gray-400">
              {isEs ? 'Cerrar' : 'Close'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Ingredient } from '../types';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Users,
  CheckCircle2,
  List,
  Mic,
  MicOff,
} from 'lucide-react';
import { translateIngredientName } from '@/lib/culinaryDictionary';

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

interface ISpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognitionInstance;
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: ISpeechRecognitionConstructor;
  webkitSpeechRecognition?: ISpeechRecognitionConstructor;
}

interface CookingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  ingredients: Ingredient[];
  lang: 'ES' | 'EN';
  displayedTitle: string;
  displayedInstructions: string;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = ({
  isOpen,
  onClose,
  recipe,
  ingredients,
  lang,
  displayedTitle,
  displayedInstructions,
}) => {
  const isEs = lang === 'ES';

  // Parse instructions into individual steps
  const steps = React.useMemo(() => {
    if (!displayedInstructions) return [];
    const lines = displayedInstructions
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Remove leading numbering if present (e.g. "1. ", "Paso 1: ")
    return lines.map((line) => line.replace(/^(\d+[\.\)]\s*|paso\s*\d+[:\s]*|step\s*\d+[:\s]*)/i, '').trim());
  }, [displayedInstructions]);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(1);
  const [baseServings] = useState<number>(recipe.servings || 2);
  const [currentServings, setCurrentServings] = useState<number>(recipe.servings || 2);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showIngredientsList, setShowIngredientsList] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  
  // Control por Voz Manos Libres
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);
  const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);

  // Referencias para que el callback del recognition acceda al estado actual sin stale closures
  const currentStepRef = useRef(currentStepIndex);
  const stepsCountRef = useRef(steps.length);
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    currentStepRef.current = currentStepIndex;
    stepsCountRef.current = steps.length;
    isSpeakingRef.current = isSpeaking;
  }, [currentStepIndex, steps.length, isSpeaking]);

  useEffect(() => {
    // Cancel any ongoing speech and recognition on unmount or close
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  // Manejo de Comandos de Voz
  const handleVoiceCommand = (rawTranscript: string) => {
    const text = rawTranscript.toLowerCase().trim();
    setLastVoiceCommand(text);
    setTimeout(() => setLastVoiceCommand(null), 3000);

    // Siguiente paso
    if (
      text.includes('siguiente') ||
      text.includes('avanzar') ||
      text.includes('adelante') ||
      text.includes('continua') ||
      text.includes('next') ||
      text.includes('forward')
    ) {
      if (currentStepRef.current < stepsCountRef.current - 1) {
        if (isSpeakingRef.current && typeof window !== 'undefined') window.speechSynthesis.cancel();
        setCompletedSteps((prev) => ({ ...prev, [currentStepRef.current]: true }));
        setCurrentStepIndex((prev) => prev + 1);
      }
      return;
    }

    // Paso anterior
    if (
      text.includes('anterior') ||
      text.includes('atrás') ||
      text.includes('atras') ||
      text.includes('volver') ||
      text.includes('previous') ||
      text.includes('back')
    ) {
      if (currentStepRef.current > 0) {
        if (isSpeakingRef.current && typeof window !== 'undefined') window.speechSynthesis.cancel();
        setCurrentStepIndex((prev) => prev - 1);
      }
      return;
    }

    // Leer / Repetir
    if (
      text.includes('leer') ||
      text.includes('repetir') ||
      text.includes('escuchar') ||
      text.includes('repite') ||
      text.includes('read') ||
      text.includes('repeat') ||
      text.includes('listen')
    ) {
      handleToggleSpeech();
      return;
    }

    // Ver ingredientes
    if (
      text.includes('ingrediente') ||
      text.includes('ingredientes') ||
      text.includes('ingredient')
    ) {
      setShowIngredientsList((prev) => !prev);
      return;
    }

    // Marcar como hecho
    if (
      text.includes('listo') ||
      text.includes('hecho') ||
      text.includes('completado') ||
      text.includes('done')
    ) {
      setCompletedSteps((prev) => ({ ...prev, [currentStepRef.current]: true }));
      if (currentStepRef.current < stepsCountRef.current - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      }
      return;
    }
  };

  // Alternar Reconocimiento de Voz
  const toggleVoiceRecognition = () => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindowWithSpeech;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert(
        isEs
          ? 'Tu navegador actual no soporta reconocimiento de voz nativo. Te recomendamos usar Google Chrome, Microsoft Edge o Safari.'
          : 'Your browser does not support native speech recognition. Chrome, Edge, or Safari recommended.'
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = isEs ? 'es-ES' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult[0]) {
          const transcript = lastResult[0].transcript;
          handleVoiceCommand(transcript);
        }
      };

      recognition.onerror = (err: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition notice:', err.error);
        if (err.error === 'not-allowed') {
          alert(
            isEs
              ? 'Por favor permite el acceso al micrófono en tu navegador para activar los comandos por voz.'
              : 'Please allow microphone access to use voice commands.'
          );
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Auto-reconnect if still intended to listen and modal is open
        if (recognitionRef.current && isListening) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      setIsListening(false);
    }
  };

  if (!isOpen) return null;

  const currentStepText = steps[currentStepIndex] || '';
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 100;

  // Servings multiplier adjustment
  const handleIncreaseServings = () => {
    const next = currentServings + 1;
    setCurrentServings(next);
    setServingsMultiplier(next / (baseServings || 1));
  };

  const handleDecreaseServings = () => {
    if (currentServings <= 1) return;
    const next = currentServings - 1;
    setCurrentServings(next);
    setServingsMultiplier(next / (baseServings || 1));
  };

  // Text-To-Speech
  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert(isEs ? 'Tu navegador no soporta lectura por voz.' : 'Voice speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(currentStepText);
    utterance.lang = isEs ? 'es-ES' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleStepCompleted = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAF8F2] text-[#2C3523] select-none animate-fadeIn">
      
      {/* Barra Superior */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D3C4] bg-[#F4F1EA]/80 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-handwritten text-xl font-bold text-[#2C3523]">Pulse&Cook</span>
            <span className="text-[#8C987E]">•</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6650]">
              {isEs ? 'Modo Cocina' : 'Cooking Mode'}
            </span>
          </div>
          <span className="hidden sm:inline-block text-xs font-serif font-bold text-[#2C3523] truncate max-w-xs">
            ({displayedTitle})
          </span>
        </div>

        {/* Controles de Porciones, Micrófono e Ingredientes */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botón Control por Voz */}
          <button
            onClick={toggleVoiceRecognition}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isListening
                ? 'bg-red-700 text-white border-red-800 animate-pulse shadow-xs'
                : 'bg-[#EAE5D6] hover:bg-[#DED8C6] text-[#2C3523] border-[#D8D3C4]'
            }`}
            title={
              isListening
                ? isEs ? 'Control por voz ACTIVO (Clic para pausar)' : 'Voice control ACTIVE (Click to pause)'
                : isEs ? 'Activar comandos por voz (Manos libres)' : 'Enable voice commands (Hands-free)'
            }
          >
            {isListening ? <Mic className="w-3.5 h-3.5 text-white animate-bounce" /> : <MicOff className="w-3.5 h-3.5 text-[#737D67]" />}
            <span className="hidden sm:inline">
              {isListening ? (isEs ? 'Escuchando...' : 'Listening...') : (isEs ? 'Control Voz' : 'Voice Control')}
            </span>
          </button>

          {/* Ajuste de Porciones */}
          <div className="flex items-center gap-1.5 bg-[#EAE5D6] px-2.5 py-1 rounded-xl border border-[#D8D3C4] text-xs font-semibold">
            <Users className="w-3.5 h-3.5 text-[#5C6650]" />
            <button
              onClick={handleDecreaseServings}
              className="w-5 h-5 flex items-center justify-center bg-white rounded-md text-[#2C3523] hover:bg-[#FAF8F5] cursor-pointer"
            >
              -
            </button>
            <span className="px-1 text-[#2C3523] min-w-[20px] text-center font-bold">
              {currentServings}
            </span>
            <button
              onClick={handleIncreaseServings}
              className="w-5 h-5 flex items-center justify-center bg-white rounded-md text-[#2C3523] hover:bg-[#FAF8F5] cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Ver lista de ingredientes */}
          <button
            onClick={() => setShowIngredientsList(!showIngredientsList)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EAE5D6] hover:bg-[#DED8C6] rounded-xl text-xs font-bold text-[#2C3523] border border-[#D8D3C4] transition-colors cursor-pointer"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEs ? 'Ingredientes' : 'Ingredients'}</span>
          </button>

          {/* Botón Salir */}
          <button
            onClick={onClose}
            className="p-2 text-[#5C6650] hover:text-[#2C3523] rounded-xl hover:bg-[#EAE5D6] transition-colors cursor-pointer"
            title={isEs ? 'Salir del Modo Cocina' : 'Exit Cooking Mode'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Barra de Progreso */}
      <div className="w-full bg-[#E5DFD0] h-1.5">
        <div
          className="bg-[#2C3523] h-1.5 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Panel Desplegable de Ingredientes (Lateral o Modal) */}
        {showIngredientsList && (
          <div className="w-full md:w-80 bg-[#F4F1EA] border-b md:border-b-0 md:border-r border-[#D8D3C4] p-5 overflow-y-auto shrink-0 shadow-lg md:shadow-none animate-fadeIn">
            <div className="flex items-center justify-between mb-3 border-b border-[#D8D3C4] pb-2">
              <h3 className="font-serif font-bold text-sm text-[#2C3523]">
                {isEs ? 'Ingredientes para' : 'Ingredients for'} {currentServings} {isEs ? 'porciones' : 'servings'}
              </h3>
              <button
                onClick={() => setShowIngredientsList(false)}
                className="text-[#737D67] hover:text-[#2C3523] md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="space-y-2 text-xs">
              {ingredients.map((ing, idx) => {
                const scaledAmount = ing.amount ? Number((ing.amount * servingsMultiplier).toFixed(1)) : null;
                return (
                  <li key={idx} className="flex justify-between py-1.5 border-b border-[#E5DFD0]/60">
                    <span className="font-medium text-[#2C3523]">
                      {translateIngredientName(ing.name_es, ing.name_en, lang)}
                    </span>
                    <span className="font-bold text-[#5C6650]">
                      {scaledAmount !== null ? `${scaledAmount} ${ing.unit || ''}` : '-'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Visualizador Central del Paso Actual */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 max-w-4xl mx-auto w-full overflow-y-auto">
          
          {/* Indicador de Paso */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-widest text-[#737D67]">
                {isEs ? `Paso ${currentStepIndex + 1} de ${totalSteps}` : `Step ${currentStepIndex + 1} of ${totalSteps}`}
              </span>
              <button
                onClick={() => toggleStepCompleted(currentStepIndex)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  completedSteps[currentStepIndex]
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[#EAE5D6] text-[#5C6650] hover:bg-[#DED8C6]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{completedSteps[currentStepIndex] ? (isEs ? 'Completado ✓' : 'Done ✓') : (isEs ? 'Marcar hecho' : 'Mark done')}</span>
              </button>
            </div>

            {/* Lector de Voz (TTS) */}
            <button
              onClick={handleToggleSpeech}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-[#EAE5D6] text-[#2C3523] hover:bg-[#DED8C6]'
              }`}
              title={isEs ? 'Leer paso en voz alta' : 'Read step aloud'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-800" />}
              <span>{isSpeaking ? (isEs ? 'Detener Voz' : 'Stop Voice') : (isEs ? 'Escuchar' : 'Listen')}</span>
            </button>
          </div>

          {/* Banner / Ayuda de Comandos de Voz Manos Libres */}
          {isListening && (
            <div className="flex items-center justify-between gap-2 p-2.5 px-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 mb-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <span className="font-semibold">
                  {isEs
                    ? 'Manos libres activo. Di: "Siguiente", "Anterior", "Leer" o "Ingredientes"'
                    : 'Hands-free active. Say: "Next", "Back", "Read" or "Ingredients"'}
                </span>
              </div>
              {lastVoiceCommand && (
                <span className="font-mono bg-emerald-200/80 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-950">
                  «{lastVoiceCommand}»
                </span>
              )}
            </div>
          )}

          {/* Texto Gigante del Paso */}
          <div className="my-auto py-8">
            <p className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#2C3523] leading-relaxed tracking-normal font-medium">
              {currentStepText || (isEs ? 'No hay instrucciones detalladas para este paso.' : 'No instructions for this step.')}
            </p>
          </div>

          {/* Barra de Navegación Inferior */}
          <div className="flex items-center justify-between pt-6 border-t border-[#D8D3C4] gap-4 mt-6">
            <button
              onClick={() => {
                if (currentStepIndex > 0) {
                  if (isSpeaking) window.speechSynthesis.cancel();
                  setCurrentStepIndex(currentStepIndex - 1);
                }
              }}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#EAE5D6] text-[#2C3523] font-bold text-sm hover:bg-[#DED8C6] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>{isEs ? 'Paso Anterior' : 'Previous Step'}</span>
            </button>

            {currentStepIndex < totalSteps - 1 ? (
              <button
                onClick={() => {
                  if (isSpeaking) window.speechSynthesis.cancel();
                  setCompletedSteps((prev) => ({ ...prev, [currentStepIndex]: true }));
                  setCurrentStepIndex(currentStepIndex + 1);
                }}
                className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-[#2C3523] text-white font-bold text-sm hover:bg-[#3D4932] shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>{isEs ? 'Siguiente Paso' : 'Next Step'}</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-800 text-white font-bold text-sm hover:bg-emerald-900 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isEs ? '¡Plato Terminado!' : 'Dish Completed!'}</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

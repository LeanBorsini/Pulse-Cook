'use client';

import { useState } from 'react';
import { NutritionInfo } from '../types';
import { Flame, Dumbbell, Wheat, Droplet, Info, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface NutritionBadgeProps {
  nutrition: NutritionInfo | null;
  loading?: boolean;
  lang?: 'ES' | 'EN';
  servings?: number;
}

/**
 * Componente visual para mostrar los valores nutricionales orientativos por porción.
 * Diseño sobrio, artesanal y respetuoso con la estética cálida de Pulse&Cook.
 */
export function NutritionBadge({
  nutrition,
  loading = false,
  lang = 'ES',
  servings = 1,
}: NutritionBadgeProps) {
  const isEs = lang === 'ES';
  const [isExpanded, setIsExpanded] = useState(false);

  if (!nutrition && !loading) {
    return null;
  }

  return (
    <div
      id="recipe-nutrition-box"
      className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-xl p-2.5 sm:p-3 transition-all text-[#2C3523]"
    >
      {/* Cabecera compacta con opción de desplegar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-emerald-700" />
          </div>
          <div>
            <span className="text-xs font-bold font-serif text-[#2C3523] block leading-none">
              {isEs ? 'Valores nutricionales orientativos' : 'Estimated nutritional values'}
            </span>
            <span className="text-[10px] text-[#737D67]">
              {isEs ? `Por ración (base ${servings} ${servings === 1 ? 'porción' : 'porciones'})` : `Per serving (based on ${servings} ${servings === 1 ? 'serving' : 'servings'})`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#5C6650] hover:text-[#2C3523] bg-[#EFECE1] px-2 py-1 rounded-lg border border-[#D8D3C4] transition-colors cursor-pointer"
          title={isEs ? 'Ver detalles o cerrar' : 'Toggle details'}
        >
          <span>{isExpanded ? (isEs ? 'Menos' : 'Less') : (isEs ? 'Detalles' : 'Details')}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Tira compacta de macronutrientes principales */}
      {loading ? (
        <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-[#E5DFD0] animate-pulse">
          <div className="h-9 bg-[#EFECE1] rounded-lg" />
          <div className="h-9 bg-[#EFECE1] rounded-lg" />
          <div className="h-9 bg-[#EFECE1] rounded-lg" />
          <div className="h-9 bg-[#EFECE1] rounded-lg" />
        </div>
      ) : nutrition ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-[#E5DFD0]">
          {/* Calorías */}
          <div className="bg-[#FAF8F2] border border-[#E2DDD0] rounded-lg p-1.5 px-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-100/80 flex items-center justify-center shrink-0">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#737D67] block uppercase tracking-wider font-semibold">
                {isEs ? 'Energía' : 'Energy'}
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-[#2C3523]">
                ~{nutrition.calories} <span className="text-[10px] font-normal text-[#5C6650]">kcal</span>
              </span>
            </div>
          </div>

          {/* Proteínas */}
          <div className="bg-[#FAF8F2] border border-[#E2DDD0] rounded-lg p-1.5 px-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-100/80 flex items-center justify-center shrink-0">
              <Dumbbell className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#737D67] block uppercase tracking-wider font-semibold">
                {isEs ? 'Proteínas' : 'Protein'}
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-[#2C3523]">
                ~{nutrition.protein} <span className="text-[10px] font-normal text-[#5C6650]">g</span>
              </span>
            </div>
          </div>

          {/* Carbohidratos */}
          <div className="bg-[#FAF8F2] border border-[#E2DDD0] rounded-lg p-1.5 px-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-100/80 flex items-center justify-center shrink-0">
              <Wheat className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#737D67] block uppercase tracking-wider font-semibold">
                {isEs ? 'Carbos' : 'Carbs'}
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-[#2C3523]">
                ~{nutrition.carbs} <span className="text-[10px] font-normal text-[#5C6650]">g</span>
              </span>
            </div>
          </div>

          {/* Grasas */}
          <div className="bg-[#FAF8F2] border border-[#E2DDD0] rounded-lg p-1.5 px-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-100/80 flex items-center justify-center shrink-0">
              <Droplet className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#737D67] block uppercase tracking-wider font-semibold">
                {isEs ? 'Grasas' : 'Fat'}
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-[#2C3523]">
                ~{nutrition.fat} <span className="text-[10px] font-normal text-[#5C6650]">g</span>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Explicación expandida y honestidad gastronómica */}
      {isExpanded && nutrition && (
        <div className="mt-2.5 pt-2 border-t border-[#E5DFD0] space-y-1.5 animate-in fade-in duration-200">
          {nutrition.fiber !== undefined && nutrition.fiber > 0 && (
            <div className="flex items-center justify-between text-[11px] bg-[#FAF8F2] p-1.5 px-2.5 rounded-lg border border-[#E2DDD0]">
              <span className="text-[#5C6650] font-medium">{isEs ? 'Fibra dietética:' : 'Dietary fiber:'}</span>
              <span className="font-mono font-bold text-[#2C3523]">~{nutrition.fiber} g</span>
            </div>
          )}

          {nutrition.summary && (
            <p className="text-[11px] text-[#425035] italic bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/60">
              💡 {nutrition.summary}
            </p>
          )}

          <div className="flex items-start gap-1.5 text-[10px] text-[#737D67] pt-1">
            <Info className="w-3.5 h-3.5 text-[#8C987E] shrink-0 mt-0.5" />
            <p className="leading-tight">
              {isEs
                ? 'Cálculo orientativo basado en los ingredientes promedio. Las cifras reales pueden variar según el corte específico, la marca o la técnica de cocción empleada.'
                : 'Estimation based on standard ingredient averages. Actual numbers may vary depending on brand, specific cut, or cooking technique.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

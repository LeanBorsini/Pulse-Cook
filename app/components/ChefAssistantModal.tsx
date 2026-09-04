'use client';

/**
 * @file ChefAssistantModal.tsx
 * @description Interfaz interactiva del Asistente Culinario "Chef Remy".
 *
 * Características:
 * - Pestaña 1: "Nevera Inteligente" (Sugerir recetas según ingredientes disponibles, porciones, tiempo y dieta).
 * - Pestaña 2: "Sustituciones" (Buscar alternativas gastronómicas con equivalencias técnicas).
 * - Permite guardar las recetas generadas por Remy directamente en el recetario del usuario
 *   con un solo clic (vía `onSaveRecipe`).
 */

import { useState } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Clock,
  Flame,
  BookmarkPlus,
  Lightbulb,
  Repeat,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Recipe, Ingredient } from '../types';
import { User } from '@supabase/supabase-js';
import { RemyIcon } from './RemyIcon';
import { getCategoryLabel } from '@/lib/categories';

interface ChefGeneratedRecipe {
  title: string;
  description: string;
  prepTime: number;
  difficulty: string;
  usedIngredients: string[];
  extraPantryItems?: string[];
  ingredientsList: { name: string; amount: number; unit: string }[];
  steps: string[];
  dietaryTags: string[];
  chefAdvice?: string;
  safetyTip?: string;
}

interface SubstituteResult {
  substitutions: {
    name: string;
    ratio: string;
    notes: string;
    bestFor?: string;
  }[];
  chefTip: string;
}

interface ChefAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ES' | 'EN';
  user: User | null;
  onSaveRecipe: (newRecipe: Partial<Recipe> & { generatedIngredients?: Ingredient[] }) => void;
}

export default function ChefAssistantModal({
  isOpen,
  onClose,
  lang,
  user,
  onSaveRecipe,
}: ChefAssistantModalProps) {
  const isEs = lang === 'ES';

  // Tabs de modo: 'fridge' (¿Qué cocino hoy?) vs 'substitute' (Reemplazos)
  const [activeTab, setActiveTab] = useState<'fridge' | 'substitute'>('fridge');

  // Estado para Modo Nevera
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredientsList, setIngredientsList] = useState<string[]>([
    isEs ? 'Huevos' : 'Eggs',
    isEs ? 'Queso' : 'Cheese',
    isEs ? 'Tomate' : 'Tomato',
    isEs ? 'Arroz' : 'Rice',
  ]);
  const [servings, setServings] = useState<number>(2);
  const [timeLimit, setTimeLimit] = useState<string>('30');
  const [dietary, setDietary] = useState<string>('Sin restricciones');

  // Estado para Modo Sustituto
  const [missingItem, setMissingItem] = useState('');
  const [targetDish, setTargetDish] = useState('');
  const [substituteResults, setSubstituteResults] = useState<SubstituteResult | null>(null);

  // Estados de carga y respuestas
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestedRecipes, setSuggestedRecipes] = useState<ChefGeneratedRecipe[]>([]);
  const [savedRecipeIndex, setSavedRecipeIndex] = useState<number | null>(null);
  const [expandedRecipeIndex, setExpandedRecipeIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAddIngredient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = ingredientInput.trim();
    if (!clean) return;
    if (!ingredientsList.includes(clean)) {
      setIngredientsList((prev) => [...prev, clean]);
    }
    setIngredientInput('');
  };

  const handleRemoveIngredient = (indexToRemove: number) => {
    setIngredientsList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleQuickAdd = (item: string) => {
    if (!ingredientsList.includes(item)) {
      setIngredientsList((prev) => [...prev, item]);
    }
  };

  const handleGenerateRecipes = async () => {
    if (ingredientsList.length === 0) {
      setErrorMessage(
        isEs
          ? 'Por favor añade al menos 1 o 2 ingredientes que tengas a mano.'
          : 'Please add at least 1 or 2 ingredients you have on hand.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuggestedRecipes([]);
    setSavedRecipeIndex(null);

    try {
      const res = await fetch('/api/chef-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'fridge',
          ingredients: ingredientsList,
          servings,
          dietaryPreference: dietary,
          timeLimit: parseInt(timeLimit) || 30,
          lang,
          userId: user?.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error contacting Chef AI');
      }

      if (json.data?.recipes && json.data.recipes.length > 0) {
        setSuggestedRecipes(json.data.recipes);
      } else {
        setErrorMessage(
          isEs
            ? 'No se pudieron generar recetas con esos ingredientes. Intenta agregar más opciones.'
            : 'Could not generate recipes with these ingredients. Try adding more items.'
        );
      }
    } catch (err: unknown) {
      console.error('Error in Chef Assistant:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : isEs
          ? 'Error al consultar al Chef IA. Inténtalo de nuevo.'
          : 'Error consulting Chef AI. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFindSubstitutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missingItem.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    setSubstituteResults(null);

    try {
      const res = await fetch('/api/chef-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'substitute',
          missingIngredient: missingItem.trim(),
          targetDish: targetDish.trim(),
          lang,
          userId: user?.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error contacting Chef AI');
      }

      if (json.data) {
        setSubstituteResults(json.data);
      }
    } catch (err: unknown) {
      console.error('Error finding substitutes:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : isEs
          ? 'Error buscando sustitutos culinarios.'
          : 'Error finding culinary substitutes.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToBook = (recipeItem: ChefGeneratedRecipe, index: number) => {
    const formattedIngredients: Ingredient[] = recipeItem.ingredientsList.map((ing) => ({
      name_es: isEs ? ing.name : '',
      name_en: !isEs ? ing.name : ing.name,
      amount: ing.amount || 1,
      unit: ing.unit || (isEs ? 'unidad' : 'unit'),
    }));

    const safetyNote = recipeItem.safetyTip
      ? `\n\n🛡️ ${isEs ? 'Punto de Cocción y Seguridad para Principiantes' : 'Beginner Cooking Doneness & Safety'}:\n${recipeItem.safetyTip}`
      : '';
    const fullInstructions = recipeItem.steps.join('\n\n') + safetyNote;

    const newRecipeData: Partial<Recipe> & { generatedIngredients?: Ingredient[] } = {
      title_es: isEs ? recipeItem.title : '',
      title_en: !isEs ? recipeItem.title : '',
      description_es: isEs ? recipeItem.description : '',
      description_en: !isEs ? recipeItem.description : '',
      instructions_es: isEs ? fullInstructions : '',
      instructions_en: !isEs ? fullInstructions : '',
      category: getCategoryLabel('main_dish', 'ES'),
      prep_time: recipeItem.prepTime || 30,
      servings: servings || 2,
      dietary_tags: recipeItem.dietaryTags || [],
      user_id: user?.id,
      generatedIngredients: formattedIngredients,
    };

    onSaveRecipe(newRecipeData as Partial<Recipe> & { generatedIngredients?: Ingredient[] });
    setSavedRecipeIndex(index);
  };

  const quickPantrySuggestions = isEs
    ? ['Cebolla', 'Ajo', 'Papas', 'Pollo', 'Pasta', 'Zanahoria', 'Espinaca', 'Atún']
    : ['Onion', 'Garlic', 'Potatoes', 'Chicken', 'Pasta', 'Carrot', 'Spinach', 'Tuna'];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn"
    >
      <div className="bg-[#F7F5EC] border border-[#D8D3C4] rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto text-[#2C3523] flex flex-col">
        {/* Encabezado Fijo */}
        <div className="sticky -top-4 sm:-top-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-[#F7F5EC]/95 backdrop-blur-md border-b border-[#D8D3C4] flex items-center justify-between z-20 mb-3">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2C3523] to-[#455337] text-amber-300 flex items-center justify-center shadow-md text-2xl shrink-0">
              <RemyIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#2C3523] flex items-center gap-2 truncate">
                {isEs ? 'Chef Remy' : 'Chef Remy'}
                <span className="text-[10px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI • Ratatouille
                </span>
              </h2>
              <p className="text-xs text-[#5C6650] truncate">
                {isEs
                  ? '«Cualquiera puede cocinar»: inspírate con lo que tienes'
                  : '«Anyone can cook»: get inspired with whatever you have'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EAE5D6] hover:bg-[#DED8C6] active:scale-90 text-[#2C3523] flex items-center justify-center border border-[#D8D3C4] transition-all cursor-pointer shadow-xs shrink-0"
            title={isEs ? 'Cerrar' : 'Close'}
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex gap-2 mt-4 p-1 bg-[#EFECE1] rounded-xl border border-[#D8D3C4]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('fridge');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'fridge'
                ? 'bg-[#2C3523] text-[#F7F5EC] shadow-sm'
                : 'text-[#5C6650] hover:text-[#2C3523]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isEs ? '¿Qué cocino hoy? (Heladera)' : 'Fridge to Plate (Ideas)'}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('substitute');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'substitute'
                ? 'bg-[#2C3523] text-[#F7F5EC] shadow-sm'
                : 'text-[#5C6650] hover:text-[#2C3523]'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            {isEs ? 'Reemplazar Ingrediente' : 'Substitute Ingredient'}
          </button>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: ¿QUÉ COCINO HOY? */}
        {activeTab === 'fridge' && (
          <div className="mt-4 space-y-4">
            {/* Input de Ingredientes */}
            <div className="bg-[#EFECE1]/50 p-4 rounded-xl border border-[#D8D3C4] space-y-3">
              <label className="text-xs font-bold text-[#2C3523] block">
                {isEs ? '1. Ingredientes que tienes disponibles:' : '1. Available ingredients on hand:'}
              </label>

              <form onSubmit={handleAddIngredient} className="flex gap-2">
                <input
                  type="text"
                  value={ingredientInput}
                  onChange={(e) => setIngredientInput(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Ej. 2 huevos, tomate, pechuga, queso cremosa...'
                      : 'E.g. 2 eggs, tomato, chicken breast, cheese...'
                  }
                  className="flex-1 bg-[#F7F5EC] border border-[#D8D3C4] px-3 py-2 rounded-xl text-xs outline-none focus:border-[#2C3523] transition-all"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#2C3523] hover:bg-[#3D4932] text-[#F7F5EC] text-xs font-semibold rounded-xl flex items-center gap-1 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {isEs ? 'Agregar' : 'Add'}
                </button>
              </form>

              {/* Chips de Ingredientes añadidos */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ingredientsList.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F7F5EC] text-[#2C3523] rounded-lg border border-[#D8D3C4] text-xs font-medium shadow-2xs"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-[#5C6650] hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Sugerencias Rápidas */}
              <div className="pt-2 border-t border-[#D8D3C4]/60">
                <span className="text-[10px] font-semibold text-[#5C6650] mr-2">
                  {isEs ? '+ Agregar comunes:' : '+ Add common:'}
                </span>
                <div className="inline-flex flex-wrap gap-1 mt-1">
                  {quickPantrySuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickAdd(item)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#F7F5EC] border border-[#D8D3C4] hover:border-[#2C3523] text-[#5C6650] hover:text-[#2C3523] transition-all"
                    >
                      +{item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ajustes de Porciones, Tiempo y Dieta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#2C3523] block mb-1">
                  {isEs ? 'Porciones' : 'Servings'}
                </label>
                <select
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-xl text-xs outline-none focus:border-[#2C3523]"
                >
                  <option value={1}>1 {isEs ? 'persona' : 'serving'}</option>
                  <option value={2}>2 {isEs ? 'personas' : 'servings'}</option>
                  <option value={4}>4 {isEs ? 'personas' : 'servings'}</option>
                  <option value={6}>6+ {isEs ? 'personas' : 'servings'}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#2C3523] block mb-1">
                  {isEs ? 'Tiempo Máximo' : 'Max Prep Time'}
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-xl text-xs outline-none focus:border-[#2C3523]"
                >
                  <option value="15">⚡ 15 {isEs ? 'minutos (Ultra rápido)' : 'min (Fast)'}</option>
                  <option value="30">⏱️ 30 {isEs ? 'minutos (Estándar)' : 'min (Standard)'}</option>
                  <option value="45">🍳 45 {isEs ? 'minutos' : 'min'}</option>
                  <option value="60">🍲 60+ {isEs ? 'minutos (Sin apuro)' : 'min'}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#2C3523] block mb-1">
                  {isEs ? 'Preferencia / Dieta' : 'Dietary Goal'}
                </label>
                <select
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  className="w-full bg-[#EFECE1] border border-[#D8D3C4] p-2 rounded-xl text-xs outline-none focus:border-[#2C3523]"
                >
                  <option value="Sin restricciones">{isEs ? 'Sin restricciones' : 'No restrictions'}</option>
                  <option value="Vegetariano">{isEs ? 'Vegetariano' : 'Vegetarian'}</option>
                  <option value="Vegano">{isEs ? 'Vegano' : 'Vegan'}</option>
                  <option value="Sin Gluten">{isEs ? 'Sin Gluten (Celiaco)' : 'Gluten-Free'}</option>
                  <option value="Bajo en Calorías">{isEs ? 'Bajo en calorías / Saludable' : 'Low Calorie'}</option>
                  <option value="Alto en Proteína">{isEs ? 'Alto en Proteína' : 'High Protein'}</option>
                </select>
              </div>
            </div>

            {/* Botón de Generar */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerateRecipes}
              className="w-full py-3 bg-[#2C3523] hover:bg-[#3D4932] text-amber-200 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                  <span>{isEs ? 'Chef Remy creando tus recetas personalizadas...' : 'Chef Remy cooking up recipe ideas...'}</span>
                </>
              ) : (
                <>
                  <RemyIcon className="w-5 h-5 -mt-0.5" />
                  <span>{isEs ? 'Crear Recetas con Chef Remy' : 'Cook with Chef Remy'}</span>
                </>
              )}
            </button>

            {/* Resultados de Recetas Sugeridas */}
            {suggestedRecipes.length > 0 && (
              <div className="mt-6 space-y-4 border-t border-[#D8D3C4] pt-4">
                <h3 className="text-sm font-bold text-[#2C3523] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-600" />
                  {isEs ? 'Recetas Creadas para Ti' : 'Personalized AI Recipes'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedRecipes.map((rec, idx) => (
                    <div
                      key={idx}
                      className="bg-[#EFECE1]/70 border border-[#D8D3C4] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#2C3523] transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-[#2C3523] leading-snug">
                            {rec.title}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2C3523] text-[#F7F5EC] shrink-0">
                            {rec.difficulty}
                          </span>
                        </div>

                        <p className="text-xs text-[#5C6650] mt-1 line-clamp-2">
                          {rec.description}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-[#2C3523] font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            {rec.prepTime} min
                          </span>
                          <span className="text-[#5C6650]">
                            {rec.ingredientsList?.length || 0} {isEs ? 'ingredientes' : 'ingredients'}
                          </span>
                        </div>

                        {/* Ingredientes Usados */}
                        <div className="mt-3 bg-[#F7F5EC] p-2.5 rounded-lg border border-[#D8D3C4] text-[11px]">
                          <span className="font-bold text-[#2C3523] block mb-1">
                            {isEs ? '🛒 Ingredientes calculados:' : '🛒 Calculated items:'}
                          </span>
                          <ul className="space-y-0.5 text-[#5C6650]">
                            {rec.ingredientsList?.slice(0, 5).map((item, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                                <span>
                                  {item.amount} {item.unit} {item.name}
                                </span>
                              </li>
                            ))}
                            {rec.ingredientsList?.length > 5 && (
                              <li className="text-[10px] italic text-[#5C6650]">
                                +{rec.ingredientsList.length - 5} {isEs ? 'más...' : 'more...'}
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Consejo del Chef */}
                        {rec.chefAdvice && (
                          <div className="mt-2.5 p-2 bg-amber-50 rounded-lg border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>{isEs ? 'Tip del Chef: ' : "Chef's tip: "}</strong>
                              {rec.chefAdvice}
                            </span>
                          </div>
                        )}

                        {/* Guía de Seguridad Alimentaria y Punto de Cocción para Novatos */}
                        {rec.safetyTip && (
                          <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                            <span>
                              <strong>{isEs ? '🛡️ Seguridad y Cocción: ' : '🛡️ Safety & Doneness: '}</strong>
                              {rec.safetyTip}
                            </span>
                          </div>
                        )}

                        {/* Acordeón de Pasos e Indicadores Sensoriales */}
                        {rec.steps && rec.steps.length > 0 && (
                          <div className="mt-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRecipeIndex(expandedRecipeIndex === idx ? null : idx)
                              }
                              className="w-full flex items-center justify-between text-[11px] font-bold text-[#5C6650] hover:text-[#2C3523] py-1 border-t border-[#D8D3C4]/60 transition-colors"
                            >
                              <span>
                                {isEs ? 'Ver pasos e indicadores de cocción' : 'View cooking steps & sensory cues'} ({rec.steps.length})
                              </span>
                              {expandedRecipeIndex === idx ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[#5C6650]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[#5C6650]" />
                              )}
                            </button>
                            {expandedRecipeIndex === idx && (
                              <ol className="mt-1.5 space-y-1.5 pl-4 list-decimal text-[11px] text-[#2C3523] bg-[#F7F5EC] p-2.5 rounded-lg border border-[#D8D3C4] max-h-48 overflow-y-auto">
                                {rec.steps.map((step, sIdx) => (
                                  <li key={sIdx} className="leading-relaxed">
                                    {step.replace(/^\d+\.\s*/, '')}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Botón para guardar en el recetario */}
                      <button
                        type="button"
                        onClick={() => handleSaveToBook(rec, idx)}
                        disabled={savedRecipeIndex === idx}
                        className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          savedRecipeIndex === idx
                            ? 'bg-emerald-700 text-white cursor-default'
                            : 'bg-[#2C3523] hover:bg-[#3D4932] text-[#F7F5EC]'
                        }`}
                      >
                        {savedRecipeIndex === idx ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isEs ? '¡Guardada en tu Recetario!' : 'Saved to Recipe Book!'}</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>{isEs ? 'Guardar en mi Recetario' : 'Save to My Recipes'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUSTITUTOS CULINARIOS */}
        {activeTab === 'substitute' && (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleFindSubstitutes} className="bg-[#EFECE1]/50 p-4 rounded-xl border border-[#D8D3C4] space-y-3">
              <div>
                <label className="text-xs font-bold text-[#2C3523] block mb-1">
                  {isEs ? '¿Qué ingrediente te falta?' : 'What ingredient are you missing?'}
                </label>
                <input
                  type="text"
                  value={missingItem}
                  onChange={(e) => setMissingItem(e.target.value)}
                  placeholder={isEs ? 'Ej. Polvo de hornear, Vinagre de manzana, Crema de leche, Huevo...' : 'E.g. Baking powder, Buttermilk, Heavy cream, Egg...'}
                  className="w-full bg-[#F7F5EC] border border-[#D8D3C4] px-3 py-2 rounded-xl text-xs outline-none focus:border-[#2C3523]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#2C3523] block mb-1">
                  {isEs ? '¿Qué plato o preparación estás cocinando? (Opcional)' : 'What dish are you cooking? (Optional)'}
                </label>
                <input
                  type="text"
                  value={targetDish}
                  onChange={(e) => setTargetDish(e.target.value)}
                  placeholder={isEs ? 'Ej. Bizcochuelo, Salsa para pasta, Panqueques...' : 'E.g. Sponge cake, Pasta sauce, Pancakes...'}
                  className="w-full bg-[#F7F5EC] border border-[#D8D3C4] px-3 py-2 rounded-xl text-xs outline-none focus:border-[#2C3523]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !missingItem.trim()}
                className="w-full py-2.5 bg-[#2C3523] hover:bg-[#3D4932] text-amber-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isEs ? 'Consultando equivalencias culinarias...' : 'Finding kitchen substitutes...'}</span>
                  </>
                ) : (
                  <>
                    <Repeat className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Buscar Sustitutos Inteligentes' : 'Find Smart Substitutes'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Resultados de Sustitutos */}
            {substituteResults && (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{isEs ? 'Tip del Chef: ' : "Chef's Advice: "}</span>
                    <span>{substituteResults.chefTip}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {substituteResults.substitutions.map((sub, idx) => (
                    <div
                      key={idx}
                      className="bg-[#EFECE1] border border-[#D8D3C4] p-3 rounded-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-bold text-xs text-[#2C3523]">{sub.name}</h5>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {sub.ratio}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5C6650] mt-1">{sub.notes}</p>
                      </div>

                      {sub.bestFor && (
                        <div className="mt-2 pt-2 border-t border-[#D8D3C4]/60 text-[10px] text-[#2C3523] font-medium">
                          <strong>{isEs ? 'Ideal para: ' : 'Best for: '}</strong>
                          <span>{sub.bestFor}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

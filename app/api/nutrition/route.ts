/**
 * @file route.ts
 * @description Endpoint de cálculo nutricional estimativo por porción (/api/nutrition).
 *
 * Utiliza Gemini con esquema estructurado JSON estricto para interpretar ingredientes coloquiales
 * y calcular macronutrientes promedio (kcal, proteínas, carbohidratos, grasas, fibra) divididos
 * entre el número de porciones.
 *
 * Si la API de Gemini no está disponible o falla, utiliza el motor heurístico local como fallback seguro.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { Ingredient } from '@/app/types';
import { calculateLocalNutrition } from '@/lib/nutritionCalculator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ingredients: Ingredient[] = body.ingredients || [];
    const servings = Math.max(1, Number(body.servings) || 1);

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        is_estimated: true,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const localEstimate = calculateLocalNutrition(ingredients, servings);
      return NextResponse.json(localEstimate);
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const ingredientsText = ingredients
      .map((i) => `- ${i.amount || 1} ${i.unit || ''} ${i.name_es || i.name_en || ''}`)
      .join('\n');

    const prompt = `You are a culinary nutritional science expert.
Analyze the following recipe ingredients and calculate the ESTIMATED AVERAGE nutritional values PER SINGLE SERVING (divided among ${servings} servings).

Ingredients list:
${ingredientsText}

Number of servings: ${servings}

Instructions:
1. Estimate total raw/standard weight for each ingredient (e.g. 1 onion ~ 150g, 1 clove garlic ~ 4g, 1 tbsp oil ~ 14g, 1 chicken breast ~ 200g).
2. Sum up total calories (kcal), protein (g), carbohydrates (g), fat (g), and dietary fiber (g) for the ENTIRE recipe.
3. Divide each value by ${servings} (the number of servings) to get the values PER SERVING.
4. Round each value to a clean integer (e.g. 420, 28, 45, 12, 4).
5. Add a brief 1-sentence note in Spanish summarizing the nutritional balance (e.g. "Plato rico en proteínas magras y carbohidratos complejos").`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.INTEGER, description: 'Estimated calories per serving in kcal' },
            protein: { type: Type.INTEGER, description: 'Estimated protein per serving in grams' },
            carbs: { type: Type.INTEGER, description: 'Estimated carbohydrates per serving in grams' },
            fat: { type: Type.INTEGER, description: 'Estimated total fat per serving in grams' },
            fiber: { type: Type.INTEGER, description: 'Estimated dietary fiber per serving in grams' },
            summary: { type: Type.STRING, description: 'Short 1-sentence summary of the nutritional profile in Spanish' },
          },
          required: ['calories', 'protein', 'carbs', 'fat'],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return NextResponse.json({
        calories: Math.max(10, Math.round(Number(parsed.calories) || 0)),
        protein: Math.max(0, Math.round(Number(parsed.protein) || 0)),
        carbs: Math.max(0, Math.round(Number(parsed.carbs) || 0)),
        fat: Math.max(0, Math.round(Number(parsed.fat) || 0)),
        fiber: parsed.fiber ? Math.max(0, Math.round(Number(parsed.fiber) || 0)) : undefined,
        summary: parsed.summary,
        is_estimated: true,
      });
    }

    // Fallback si la respuesta está vacía
    const localEstimate = calculateLocalNutrition(ingredients, servings);
    return NextResponse.json(localEstimate);
  } catch (err) {
    console.warn('Error in nutrition API route, using heuristic fallback:', err);
    try {
      const body = await req.clone().json();
      const localEstimate = calculateLocalNutrition(body.ingredients || [], body.servings || 1);
      return NextResponse.json(localEstimate);
    } catch {
      return NextResponse.json({
        calories: 350,
        protein: 15,
        carbs: 40,
        fat: 12,
        is_estimated: true,
      });
    }
  }
}

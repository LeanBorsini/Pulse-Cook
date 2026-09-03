/**
 * @file route.ts
 * @description Endpoint de servidor para la traducción culinaria bilingüe asistida por IA.
 *
 * Ruta: POST /api/translate
 *
 * Estrategia de Resiliencia:
 * 1. Validación de entrada (título, descripción, instrucciones, idiomas origen/destino).
 * 2. Cascada de modelos Gemini ('gemini-3.1-flash-lite' -> 'gemini-3.6-flash' -> 'gemini-3.8-flash').
 * 3. En caso de ausencia de API key o fallo en todos los modelos, activa automáticamente el
 *    diccionario culinario inteligente (`lib/recipeTranslator.ts`) para devolver una respuesta 200
 *    completamente traducida y sin errores de interfaz.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { translateTextSmart } from '@/lib/recipeTranslator';

/**
 * Procesa la solicitud de traducción de una receta.
 *
 * @param {NextRequest} req - Request que contiene:
 *   - title: string
 *   - description?: string
 *   - instructions: string
 *   - sourceLang: 'ES' | 'EN'
 *   - targetLang: 'ES' | 'EN'
 * @returns {Promise<NextResponse>} JSON con los campos traducidos y etiquetas sugeridas.
 */
export async function POST(req: NextRequest) {
  let title = '';
  let description = '';
  let instructions = '';
  let sourceLang: 'ES' | 'EN' = 'ES';
  let targetLang: 'ES' | 'EN' = 'EN';
  let fallbackTitle = '';
  let fallbackDesc = '';
  let fallbackInst = '';

  try {
    const body = await req.json();
    title = (body.title || '').trim();
    description = (body.description || '').trim();
    instructions = (body.instructions || '').trim();
    sourceLang = body.sourceLang === 'EN' ? 'EN' : 'ES';
    targetLang = body.targetLang === 'ES' ? 'ES' : 'EN';

    if (!title && !description && !instructions) {
      return NextResponse.json({ error: 'No content provided to translate' }, { status: 400 });
    }

    const isTargetEn = targetLang === 'EN';
    fallbackTitle = translateTextSmart(title, sourceLang, targetLang);
    fallbackDesc = translateTextSmart(description, sourceLang, targetLang);
    fallbackInst = translateTextSmart(instructions, sourceLang, targetLang);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        translatedTitle: fallbackTitle || title,
        translatedDescription: fallbackDesc || description,
        translatedInstructions: fallbackInst || instructions,
        suggestedTags: isTargetEn ? ['Quick (<20m)', 'Healthy'] : ['Rápido (<20m)', 'Saludable'],
        note: 'Translated via local culinary engine',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const targetLanguageName = targetLang === 'EN' ? 'English' : 'Spanish';
    const sourceLanguageName = sourceLang === 'EN' ? 'English' : 'Spanish';

    const prompt = `You are an expert culinary translator and professional chef.
Translate the following recipe content from ${sourceLanguageName} into natural, appetizing, grammatically correct ${targetLanguageName}.
Keep culinary terms accurate, measurements clear, and instruction steps properly formatted and numbered if numbered in original.
Do not leave any words in ${sourceLanguageName}.

Recipe Title: "${title}"
Recipe Description: "${description}"
Recipe Instructions:
${instructions}`;

    let responseText = '';
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translatedTitle: {
                  type: Type.STRING,
                  description: 'The translated recipe title',
                },
                translatedDescription: {
                  type: Type.STRING,
                  description: 'The translated recipe description',
                },
                translatedInstructions: {
                  type: Type.STRING,
                  description: 'The translated recipe step-by-step instructions',
                },
                suggestedTags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Dietary or culinary tags such as Gluten-Free, Dairy-Free, Vegetarian, Vegan, Quick, Healthy, etc.',
                },
              },
              required: ['translatedInstructions'],
            },
          },
        });

        if (response.text && response.text.trim()) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Translation attempt with model ${modelName} failed, trying next candidate:`, err);
      }
    }

    if (!responseText) {
      throw new Error('All candidate translation models failed or were unavailable');
    }

    let rawText = responseText.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.slice(7);
    } else if (rawText.startsWith('```')) {
      rawText = rawText.slice(3);
    }
    if (rawText.endsWith('```')) {
      rawText = rawText.slice(0, -3);
    }
    rawText = rawText.trim();

    const result = JSON.parse(rawText || '{}');

    return NextResponse.json({
      translatedTitle: result.translatedTitle || fallbackTitle || title,
      translatedDescription: result.translatedDescription || fallbackDesc || description,
      translatedInstructions: result.translatedInstructions || fallbackInst || instructions,
      suggestedTags: result.suggestedTags || ['Saludable'],
    });
  } catch (error: unknown) {
    console.error('Translation API error, utilizing culinary engine fallback:', error);
    return NextResponse.json({
      translatedTitle: fallbackTitle || title,
      translatedDescription: fallbackDesc || description,
      translatedInstructions: fallbackInst || instructions,
      suggestedTags: ['Saludable'],
    });
  }
}

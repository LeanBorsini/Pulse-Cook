/**
 * @file route.ts
 * @description Endpoint de servidor para la traducción culinaria bilingüe asistida por IA.
 *
 * Ruta: POST /api/translate
 *
 * Estrategia de Resiliencia:
 * 1. Validación de entrada (título, descripción, instrucciones, comentarios, idiomas origen/destino).
 * 2. Cascada de modelos Gemini ('gemini-3.8-flash' -> 'gemini-3.1-flash-lite' -> 'gemini-flash-latest').
 * 3. Traduce de manera holística: Título, Descripción, Instrucciones y Comentarios comunitarios.
 * 4. En caso de ausencia de API key o fallo en todos los modelos, activa automáticamente el
 *    diccionario culinario inteligente (`lib/recipeTranslator.ts`) para devolver una respuesta 200
 *    completa y sin errores de interfaz.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { translateTextSmart } from '@/lib/recipeTranslator';

interface CommentInput {
  id: string;
  message: string;
}

interface CommentOutput {
  id: string;
  message: string;
}

/**
 * Procesa la solicitud de traducción de una receta y sus comentarios.
 */
export async function POST(req: NextRequest) {
  let title = '';
  let description = '';
  let instructions = '';
  let comments: CommentInput[] = [];
  let sourceLang: 'ES' | 'EN' = 'ES';
  let targetLang: 'ES' | 'EN' = 'EN';
  let fallbackTitle = '';
  let fallbackDesc = '';
  let fallbackInst = '';
  let fallbackComments: CommentOutput[] = [];

  try {
    const body = await req.json();
    title = (body.title || '').trim();
    description = (body.description || '').trim();
    instructions = (body.instructions || '').trim();
    comments = Array.isArray(body.comments) ? body.comments : [];
    sourceLang = body.sourceLang === 'EN' ? 'EN' : 'ES';
    targetLang = body.targetLang === 'ES' ? 'ES' : 'EN';

    if (!title && !description && !instructions && comments.length === 0) {
      return NextResponse.json({ error: 'No content provided to translate' }, { status: 400 });
    }

    const isTargetEn = targetLang === 'EN';
    fallbackTitle = translateTextSmart(title, sourceLang, targetLang);
    fallbackDesc = translateTextSmart(description, sourceLang, targetLang);
    fallbackInst = translateTextSmart(instructions, sourceLang, targetLang);
    fallbackComments = comments.map((c) => ({
      id: c.id,
      message: translateTextSmart(c.message, sourceLang, targetLang) || c.message,
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        translatedTitle: fallbackTitle || title,
        translatedDescription: fallbackDesc || description,
        translatedInstructions: fallbackInst || instructions,
        translatedComments: fallbackComments,
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

    const commentsSection = comments.length > 0
      ? `\n\nCommunity Comments to translate:\n${JSON.stringify(comments.map((c) => ({ id: c.id, text: c.message })))}`
      : '';

    const prompt = `You are a world-class professional culinary translator and bilingual chef.
Translate the following recipe content from ${sourceLanguageName} into natural, appetizing, fluent ${targetLanguageName}.
Requirements:
1. Translate the Title, Description, and Instructions completely into ${targetLanguageName}.
2. Ensure culinary terms, cooking techniques (e.g. sauté, simmer, boil, roast, brown, fold), and ingredients are natural.
3. Keep numbered step formats (1., 2., 3.) intact.
4. Translate each community comment accurately preserving the user's tone and culinary feedback.
5. NEVER leave sentences or words in the original language (${sourceLanguageName}) or mixed Spanglish.

Recipe Title: "${title}"
Recipe Description: "${description}"
Recipe Instructions:
${instructions}${commentsSection}`;

    let responseText = '';
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

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
                translatedComments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      message: { type: Type.STRING },
                    },
                    required: ['id', 'message'],
                  },
                  description: 'Translated community comments',
                },
                suggestedTags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Dietary or culinary tags',
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
      translatedComments: result.translatedComments || fallbackComments,
      suggestedTags: result.suggestedTags || ['Saludable'],
    });
  } catch (error: unknown) {
    console.error('Translation API error, utilizing culinary engine fallback:', error);
    return NextResponse.json({
      translatedTitle: fallbackTitle || title,
      translatedDescription: fallbackDesc || description,
      translatedInstructions: fallbackInst || instructions,
      translatedComments: fallbackComments,
      suggestedTags: ['Saludable'],
    });
  }
}

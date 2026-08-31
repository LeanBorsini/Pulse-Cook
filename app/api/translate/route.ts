import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { translateTextSmart } from '@/lib/recipeTranslator';

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
    title = body.title;
    description = body.description;
    instructions = body.instructions;
    sourceLang = body.sourceLang;
    targetLang = body.targetLang;

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

    const prompt = `You are a culinary translator and chef. Translate the following recipe text fields from ${sourceLanguageName} to natural, appetizing ${targetLanguageName}.
Keep culinary terms accurate and measurements clear.
Title to translate: "${title || ''}"
Description to translate: "${description || ''}"
Instructions to translate: "${instructions || ''}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
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
              description: 'Dietary or culinary tags such as Sin Gluten, Sin Lácteos, Vegetariano, Vegano, Rápido, Postre, etc.',
            },
          },
          required: ['translatedTitle', 'translatedDescription', 'translatedInstructions'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');

    return NextResponse.json(result);
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

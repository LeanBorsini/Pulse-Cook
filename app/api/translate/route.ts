import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { title, description, instructions, sourceLang, targetLang } = await req.json();

    if (!title && !description && !instructions) {
      return NextResponse.json({ error: 'No content provided to translate' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
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
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error translating recipe content' },
      { status: 500 }
    );
  }
}

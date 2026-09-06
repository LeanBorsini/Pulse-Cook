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
import { translateTextSmart, cleanToPureEnglish, cleanToPureSpanish } from '@/lib/recipeTranslator';

interface CommentInput {
  id: string;
  message: string;
}

interface CommentOutput {
  id: string;
  message: string;
}

/**
 * Fallback secundario con motor web público de traducción si Gemini no responde o se agota.
 * Maneja textos largos dividiéndolos en fragmentos <= 400 caracteres y rechaza errores de cuota.
 */
async function translateWithExternalFallback(text: string, sourceLang: 'ES' | 'EN', targetLang: 'ES' | 'EN'): Promise<string> {
  if (!text || !text.trim()) return '';

  const cleanPure = (val: string) => (targetLang === 'EN' ? cleanToPureEnglish(val) : cleanToPureSpanish(val));
  const fallback = cleanPure(translateTextSmart(text, sourceLang, targetLang));

  try {
    const langPair = sourceLang === 'ES' ? 'es|en' : 'en|es';

    // Función auxiliar para traducir un fragmento individual <= 400 caracteres
    const fetchChunk = async (chunk: string): Promise<string | null> => {
      if (!chunk.trim()) return chunk;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk.trim())}&langpair=${langPair}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.responseStatus !== 200 && data.responseStatus !== '200') return null;
      const translated = data.responseData?.translatedText;
      if (!translated || typeof translated !== 'string') return null;
      const upper = translated.toUpperCase();
      if (upper.includes('LIMIT EXCEEDED') || upper.includes('MYMEMORY') || upper.includes('QUERY LENGTH')) {
        return null;
      }
      return cleanPure(translated);
    };

    // Si el texto es corto (<= 400 chars), se traduce directamente
    if (text.length <= 400) {
      const translated = await fetchChunk(text);
      if (translated) return translated;
      return fallback;
    }

    // Para textos largos como instrucciones con múltiples pasos, dividimos por líneas o oraciones
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + '\n' + line).length > 380) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    const translatedChunks: string[] = [];
    for (const chunk of chunks) {
      if (chunk.length > 400) {
        // Subdividir por oraciones si una sola línea excede 400
        const sentences = chunk.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [chunk];
        const subParts: string[] = [];
        for (const s of sentences) {
          const trans = await fetchChunk(s.slice(0, 390));
          subParts.push(trans || cleanPure(translateTextSmart(s, sourceLang, targetLang)));
        }
        translatedChunks.push(subParts.join(' '));
      } else {
        const trans = await fetchChunk(chunk);
        translatedChunks.push(trans || cleanPure(translateTextSmart(chunk, sourceLang, targetLang)));
      }
    }

    const result = translatedChunks.join('\n');
    if (result && !result.toUpperCase().includes('LIMIT EXCEEDED')) {
      return result;
    }
  } catch {
    // En caso de fallo o timeout de red, utilizar el motor culinario
  }

  return fallback;
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
    const cleanPure = (val: string) => (isTargetEn ? cleanToPureEnglish(val) : cleanToPureSpanish(val));

    fallbackTitle = cleanPure(translateTextSmart(title, sourceLang, targetLang));
    fallbackDesc = cleanPure(translateTextSmart(description, sourceLang, targetLang));
    fallbackInst = cleanPure(translateTextSmart(instructions, sourceLang, targetLang));
    fallbackComments = comments.map((c) => ({
      id: c.id,
      message: cleanPure(translateTextSmart(c.message, sourceLang, targetLang) || c.message),
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Si no hay API key, intentamos el motor externo MyMemory
      const extInst = await translateWithExternalFallback(instructions, sourceLang, targetLang);
      const extTitle = await translateWithExternalFallback(title, sourceLang, targetLang);
      const extDesc = await translateWithExternalFallback(description, sourceLang, targetLang);
      return NextResponse.json({
        translatedTitle: cleanPure(extTitle || fallbackTitle || title),
        translatedDescription: cleanPure(extDesc || fallbackDesc || description),
        translatedInstructions: cleanPure(extInst || fallbackInst || instructions),
        translatedComments: fallbackComments,
        suggestedTags: isTargetEn ? ['Quick (<20m)', 'Healthy'] : ['Rápido (<20m)', 'Saludable'],
        note: 'Translated via enhanced multi-engine fallback',
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

    const prompt = `You are a world-class professional culinary translator and bilingual executive chef.
Translate the following recipe content from ${sourceLanguageName} into natural, appetizing, 100% fluent ${targetLanguageName}.

CRITICAL REQUIREMENTS:
1. Complete translation: Translate the Title, Description, and Instructions 100% into ${targetLanguageName}.
2. NO MIXED LANGUAGES OR SPANGLISH: Absolutely ZERO words, phrases, or ingredients may remain in ${sourceLanguageName}.
   - When translating to English: The input might be in Spanish OR may contain an existing corrupted mixture of Spanish and English (Spanglish). You must translate the ENTIRE text so that 100% of it is in natural, fluent English.
   - Specific terms that MUST be translated cleanly:
     * "pechuga" / "pechuga de pollo" -> "chicken breast"
     * "zapallo" / "calabaza" -> "butternut squash" (or "squash" / "pumpkin")
     * "harina de avena" -> "oat flour"
     * "cebolla" -> "onion"
     * "paprika" -> "paprika"
     * "orégano" -> "oregano"
     * "pimienta" -> "black pepper" (or "pepper")
     * "sal" -> "salt"
     * "procesador de alimentos" -> "food processor"
     * "trituramos hasta conseguir una masa homogénea" -> "blend until a smooth dough is formed"
     * "dar forma de nuggets" -> "shape into nuggets"
     * "fuente para horno" / "baking dish" -> "baking dish"
     * "cook por unos minutos" / "cocinar por unos minutos" -> "bake/cook for a few minutes"
     * "golden brown" / "dorados" -> "golden brown"
3. Culinary accuracy: Ensure cooking techniques, measurements, temperatures, and ingredients are natural in ${targetLanguageName}.
4. Keep numbered step formats (1., 2., 3.) intact.
5. Translate each community comment accurately preserving the user's tone in 100% ${targetLanguageName}.

Recipe Title: "${title}"
Recipe Description: "${description}"
Recipe Instructions:
${instructions}${commentsSection}`;

    let responseText = '';
    // gemini-3.1-flash-lite and gemini-3.8-flash provide fast, high-quality bilingual culinary translation
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

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
      translatedTitle: cleanPure(result.translatedTitle || fallbackTitle || title),
      translatedDescription: cleanPure(result.translatedDescription || fallbackDesc || description),
      translatedInstructions: cleanPure(result.translatedInstructions || fallbackInst || instructions),
      translatedComments: (result.translatedComments || fallbackComments).map((c: CommentOutput) => ({
        id: c.id,
        message: cleanPure(c.message),
      })),
      suggestedTags: result.suggestedTags || ['Saludable'],
    });
  } catch (error: unknown) {
    console.error('Translation API error, utilizing culinary engine fallback:', error);
    const extInst = await translateWithExternalFallback(instructions, sourceLang, targetLang);
    const extTitle = await translateWithExternalFallback(title, sourceLang, targetLang);
    const extDesc = await translateWithExternalFallback(description, sourceLang, targetLang);
    const cleanPure = (val: string) => (targetLang === 'EN' ? cleanToPureEnglish(val) : cleanToPureSpanish(val));

    return NextResponse.json({
      translatedTitle: cleanPure(extTitle || fallbackTitle || title),
      translatedDescription: cleanPure(extDesc || fallbackDesc || description),
      translatedInstructions: cleanPure(extInst || fallbackInst || instructions),
      translatedComments: fallbackComments,
      suggestedTags: ['Saludable'],
    });
  }
}

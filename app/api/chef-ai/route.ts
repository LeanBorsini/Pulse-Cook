import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting simple en memoria por IP/User (máx 10 peticiones cada 5 minutos)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userRate = rateLimitMap.get(identifier);

  if (!userRate || now > userRate.expiresAt) {
    rateLimitMap.set(identifier, { count: 1, expiresAt: now + 5 * 60 * 1000 });
    return true;
  }

  if (userRate.count >= 12) {
    return false;
  }

  userRate.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const {
      mode, // 'fridge' | 'substitute' | 'pairing'
      ingredients,
      servings,
      dietaryPreference,
      timeLimit,
      missingIngredient,
      targetDish,
      lang = 'ES',
      userId = 'guest',
    } = await req.json();

    // 1. Verificar Rate Limit para no saturar la cuota gratuita
    const clientIp = req.headers.get('x-forwarded-for') || userId || 'anon';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error:
            lang === 'ES'
              ? 'Has alcanzado el límite de consultas por ahora. Por favor espera unos minutos para continuar.'
              : 'You have reached the query limit for now. Please wait a few minutes before trying again.',
        },
        { status: 429 }
      );
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

    const isEs = lang === 'ES';
    const outputLanguage = isEs ? 'Spanish (Español)' : 'English';

    if (mode === 'substitute') {
      // Modo Sustitución de Ingredientes
      const prompt = `You are an expert culinary chef. The user wants to replace an ingredient in a dish.
Target Ingredient to Replace: "${missingIngredient || ''}"
Dish or Context: "${targetDish || 'General cooking'}"
Language of response: ${outputLanguage}

Provide 3 practical, accessible kitchen substitutions with clear conversion ratios and the culinary effect (taste/texture).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              substitutions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Name of the substitute ingredient' },
                    ratio: { type: Type.STRING, description: 'Ratio or conversion, e.g. 1:1, or 1 tsp instead of 1 tbsp' },
                    notes: { type: Type.STRING, description: 'Culinary notes on texture and flavor change' },
                    bestFor: { type: Type.STRING, description: 'Best suited for baking, frying, sauces, etc.' },
                  },
                  required: ['name', 'ratio', 'notes'],
                },
              },
              chefTip: { type: Type.STRING, description: 'One concise professional tip from the chef' },
            },
            required: ['substitutions', 'chefTip'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json({ type: 'substitute', data: parsed });
    }

    // Modo Por Defecto: "¿Qué cocino hoy?" (Fridge to Plate)
    const prompt = `You are Chef Remy, the legendary culinary master from Ratatouille ("Anyone can cook!"). You are the passionate, genius chef inside Pulse&Cook.
A home cook opens their fridge and pantry with these ingredients:
Available Ingredients: "${Array.isArray(ingredients) ? ingredients.join(', ') : ingredients || 'Cualquier ingrediente básico'}"
Target Servings: ${servings || 2}
Dietary Restrictions: "${dietaryPreference || 'Ninguna'}"
Max Preparation Time: "${timeLimit ? timeLimit + ' minutos' : 'Rápido y práctico'}"
Language: Respond strictly in ${outputLanguage}.

Create 2 distinct, highly creative, flavorful recipes that maximize the user's available ingredients while requiring minimal or standard pantry staples (salt, oil, pepper, water). Make the chefAdvice full of passionate French/culinary wisdom inspired by Remy's philosophy.
For each recipe, provide full details so the user could directly save it or cook it immediately.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Creative and appealing title for the recipe' },
                  description: { type: Type.STRING, description: 'Short summary describing the flavor and appeal' },
                  prepTime: { type: Type.INTEGER, description: 'Total prep and cooking time in minutes' },
                  difficulty: { type: Type.STRING, description: 'Fácil / Easy, Media / Medium, Avanzada / Hard' },
                  usedIngredients: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Ingredients from the user list that are utilized',
                  },
                  extraPantryItems: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Common basics needed (oil, salt, pepper, etc.)',
                  },
                  ingredientsList: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                      },
                      required: ['name', 'amount', 'unit'],
                    },
                  },
                  steps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Clear, concise step-by-step cooking instructions',
                  },
                  dietaryTags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Tags e.g. Rápido, Sin Gluten, Saludable',
                  },
                  chefAdvice: {
                    type: Type.STRING,
                    description: 'A brief secret chef advice to make it delicious',
                  },
                },
                required: [
                  'title',
                  'description',
                  'prepTime',
                  'difficulty',
                  'usedIngredients',
                  'ingredientsList',
                  'steps',
                  'dietaryTags',
                ],
              },
            },
          },
          required: ['recipes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return NextResponse.json({ type: 'fridge', data: parsed });
  } catch (error: unknown) {
    console.error('[Pulse&Cook] Chef AI API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error generating recipes from Chef AI' },
      { status: 500 }
    );
  }
}

# 🏛️ Arquitectura del Sistema — Pulse&Cook

Este documento describe la arquitectura técnica, los flujos de datos, las decisiones de diseño y los módulos principales de **Pulse&Cook**. Está pensado para desarrolladores o mantenedores que necesiten comprender, extender o depurar la aplicación.

---

## 1. Visión General del Sistema

Pulse&Cook está construida sobre **Next.js 15 (App Router)** y sigue un patrón de **arquitectura híbrida cliente-servidor con prioridad local (Offline-First)**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENTE (Navegador)                              │
│                                                                             │
│  ┌─────────────────────────┐         ┌───────────────────────────────────┐  │
│  │   UI & Modales React    │ ◄─────► │     Estado Central (app/page.tsx) │  │
│  │ (Detail, Form, Cook...) │         │ (Recetas, Filtros, Menú, Idioma)  │  │
│  └───────────┬─────────────┘         └─────────────────┬─────────────────┘  │
│              │                                         │                    │
│              ▼                                         ▼                    │
│  ┌─────────────────────────┐         ┌───────────────────────────────────┐  │
│  │   Módulos Auxiliares    │         │      Capa de Persistencia         │  │
│  │ - Consolidator          │         │ 1. LocalStorage (recipeStore.ts)  │  │
│  │ - Dictionary            │         │ 2. Supabase DB (supabase.ts)      │  │
│  │ - Canvas Image Compres. │         │    (optimistic fallback)          │  │
│  └─────────────────────────┘         └───────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Llamadas fetch() seguras
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVIDOR (Next.js API Routes)                    │
│                                                                             │
│      ┌──────────────────────────────┐     ┌─────────────────────────────┐   │
│      │     /api/chef-ai             │     │      /api/translate         │   │
│      │  - Rate Limiter en Memoria   │     │  - Cascada de Modelos       │   │
│      │  - Google GenAI (Gemini)     │     │  - Google GenAI (Gemini)    │   │
│      │  - Fallback Heurístico       │     │  - Fallback Diccionario     │   │
│      └──────────────┬───────────────┘     └──────────────┬──────────────┘   │
└─────────────────────┼────────────────────────────────────┼──────────────────┘
                      │                                    │
                      ▼                                    ▼
          ┌───────────────────────┐            ┌───────────────────────┐
          │  Google Gemini API    │            │  Google Gemini API    │
          │  (Server Secret Key)  │            │  (Server Secret Key)  │
          └───────────────────────┘            └───────────────────────┘
```

---

## 2. Estrategia de Persistencia Dual (Offline-First + Cloud)

Para asegurar que la aplicación sea utilizable sin necesidad de configurar servicios externos, Pulse&Cook implementa una estrategia de persistencia en capas:

### 2.1 Almacenamiento Local (`lib/recipeStore.ts`)
- **Claves de almacenamiento**:
  - `pulse_cook_local_recipes_v3`: Colección de recetas creadas/editadas localmente en formato JSON.
  - `pulse_cook_local_ingredients_v3`: Mapa de ingredientes asociados indexados por `recipe.id`.
- **Limpieza de Demos**: Se descartan automáticamente IDs de demostración obsoletos para evitar recetas duplicadas o fantasmas.
- **Sincronización Inmediata**: Cualquier cambio realizado en la interfaz se guarda inmediatamente en `localStorage` antes de enviar la petición a Supabase.

### 2.2 Sincronización con Supabase (`lib/supabase.ts`)
- La aplicación verifica si las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están definidas mediante el booleano exportado `isSupabaseConfigured`.
- Si Supabase está disponible y el usuario está autenticado, las recetas se sincronizan con las tablas `recipes`, `recipe_ingredients`, `ratings` y `comments`.
- Si Supabase no está configurado, o si una petición falla (por ejemplo por problemas de red), la aplicación **captura el error silenciosamente y continúa operando con los datos locales**, notificando al usuario de forma amigable sin romper la vista.

---

## 3. Motor de Traducción Culinaria & Cascada de Modelos

El soporte bilingüe se diseñó específicamente para el ámbito gastronómico:

### 3.1 Detección Lingüística Culinaria (`lib/recipeTranslator.ts`)
- Las recetas pueden tener instrucciones en español, en inglés, o en ambos idiomas.
- Se implementaron funciones de análisis:
  - `isSpanishCulinaryText(text)`: Detecta tildes y marcadores verbales en infinitivo e imperativo latino/rioplatense (*cortá, agregá, mezclá, dorá, salteá, sartén, fuego lento*).
  - `isEnglishCulinaryText(text)`: Detecta vocabulario gastronómico en inglés (*chop, dice, skillet, simmer, golden brown*).
  - `hasGenuineEnglishInstructions(en, es)`: Verifica si el campo en inglés realmente contiene texto en inglés o si simplemente se guardó una copia idéntica del texto en español.

### 3.2 Cascada Resiliente de Modelos (`app/api/translate/route.ts`)
Para evitar fallos por cuota o saturación temporal (errores 503), la API de traducción ejecuta una cascada secuencial:
1. Intento con `gemini-3.1-flash-lite`.
2. Si falla, intento con `gemini-3.6-flash`.
3. Si falla, intento con `gemini-3.8-flash`.
4. Si todos los modelos fallan o no hay conectividad, la API o el frontend aplican **`translateTextSmart`** con el diccionario culinario de expresiones regulares (`lib/recipeTranslator.ts`), traduciendo al instante las frases y verbos esenciales sin interrumpir al usuario.

---

## 4. Asistente Culinario "Chef Remy" (`app/api/chef-ai/route.ts` & `lib/chefRemyOffline.ts`)

### 4.1 Modos de Operación
1. **Nevera Inteligente (`mode === 'fridge'`)**: Recibe una lista de ingredientes que el usuario tiene disponibles, porciones, tiempo máximo y restricciones dietéticas, generando una receta completa que prioriza el aprovechamiento de recursos.
2. **Sustituciones Culinarias (`mode === 'substitute'`)**: Recibe un ingrediente que el usuario no tiene y sugiere reemplazos con proporciones exactas y advertencias de sabor o textura.

### 4.2 Control de Tráfico (*Rate Limiting*)
- Control en memoria por identificador (IP / ID de usuario): Máximo 12 peticiones cada 5 minutos.
- Si se excede el límite o no se dispone de `GEMINI_API_KEY`, la ruta responde invocando a **`chefRemyOffline.ts`** sin devolver un error 500 al cliente.

### 4.3 Motor Heurístico Offline (`lib/chefRemyOffline.ts`)
- Provee respuestas precomputadas y adaptables basadas en combinatorias de ingredientes.
- Cubre sustitutos comunes: huevos (compota de manzana, semillas de chía, plátano), manteca/mantequilla (aceite de oliva, puré de aguacate), harina de trigo (avena molida, harina de arroz), etc.

---

## 5. Motor de Consolidación de Lista de Compras (`lib/groceryConsolidator.ts`)

Cuando el usuario selecciona varias recetas para su menú semanal, la lista de compras no debe listar ingredientes duplicados. El motor de consolidación realiza tres fases:

1. **Normalización de Llaves**:
   - Limpieza de acentos, minúsculas y eliminación de plurales.
   - Asociación de sinónimos culinarios (ej. *"pechuga de pollo"*, *"filet de pollo"*, *"pollo troceado"* convergen en la misma llave canónica `pollo_pechuga`).

2. **Conversión y Suma de Unidades (`normalizeUnit`)**:
   - Normalización de variaciones (*gr*, *gramos*, *g* → `g`).
   - Suma acumulativa de cantidades: si dos recetas piden 200g y 400g, el resultado consolidado es 600g.
   - Si las unidades no son compatibles matemáticamente (ej. una receta pide 2 *unidades* y otra pide 100 *gramos*), se agrupan respetando la descripción legible de ambas fuentes.

3. **Clasificación Automática por Pasillos**:
   - Los artículos se agrupan en 5 categorías de supermercado:
     - `produce`: Frutas, verduras, hierbas frescas.
     - `meat`: Carnes rojas, pollo, pescado, mariscos, tofu.
     - `dairy`: Leche, quesos, yogur, crema, huevos.
     - `pantry`: Harinas, arroces, pastas, especias secas, aceites, legumbres.
     - `other`: Artículos no clasificados.

---

## 6. Pipeline de Imágenes y Rendimiento (`lib/storage.ts`)

1. **Compresión en el Cliente**:
   - Antes de subir un archivo de imagen, se dibuja en un elemento `<canvas>` HTML5 off-screen.
   - Se redimensiona con un ancho máximo de 1600px manteniendo la relación de aspecto.
   - Se exporta a `image/jpeg` con calidad `0.85`, reduciendo archivos de 5MB a ~200KB sin pérdida perceptible.
2. **Subida a Supabase Storage**:
   - Bucket: `recipe-images`.
   - Ruta: `recipes/{userId}/{timestamp}_{cleanFileName}`.
   - Si Supabase Storage no está activo, la interfaz permite almacenar la URL o imagen en base64 para uso local.

---

## 7. Modo Cocina Guiado (`app/components/CookingModeModal.tsx`)

Diseñado con ergonomía para cocinar con el móvil o tablet cerca del fuego:
- Tipografía ampliada de alto contraste.
- **Detector automático de tiempos**: Expresiones regulares analizan el texto del paso (ej. `\b(\d+)\s*(?:minutos|min|minutes)\b`) y renderizan un botón de temporizador de un toque.
- Al activarse, un temporizador con cuenta regresiva en segundos emite una alerta sonora (`Web Audio API` con oscilador sintetizado sin dependencias de archivos de audio externos) para avisar al cocinero cuando la cocción ha concluido.

# 🍳 Pulse&Cook — Recetario Inteligente y Menú Semanal

**Pulse&Cook** es una aplicación web full-stack de recetario personal, familiar y colaborativo con soporte bilingüe completo (Español / Inglés), asistente culinario impulsado por Inteligencia Artificial (**Chef Remy**), organizador inteligente de lista de compras y modo cocina guiado paso a paso con temporizadores.

Diseñada bajo una filosofía **offline-first resiliente**: la aplicación funciona al 100% de manera local en el navegador mediante `localStorage` y memoria, y se sincroniza sin fisuras con **Supabase** (autenticación, base de datos Postgres y almacenamiento de fotos) cuando las credenciales están configuradas.

---

## 🌟 Características Principales

1. **Gestión Completa de Recetas**:
   - Creación, edición y eliminación de recetas con categorías, tiempos de preparación y porciones.
   - Soporte para hasta 3 imágenes por receta con compresión automática en el navegador (Canvas) para ahorrar ancho de banda.
   - Enlaces de video múltiples (incluyendo reproductor embebido de YouTube).
   - Sistema de etiquetas dietéticas (Sin Gluten, Vegano, Rápido, Alto en Proteínas, etc.).
   - Valoración de recetas (estrellas de 1 a 5) y comentarios con avatares.

2. **Soporte Bilingüe Nativo (Español ⇄ Inglés)**:
   - Conmutación global instantánea de idioma sin recargar la página.
   - Traducción con IA (Gemini 3) con cascada de modelos (`gemini-3.1-flash-lite` → `gemini-3.6-flash` → `gemini-3.8-flash`).
   - Diccionario culinario offline inteligente (`lib/recipeTranslator.ts` y `lib/culinaryDictionary.ts`) con más de 200 términos y verbos gastronómicos conjugados (incluyendo imperativo latino/argentino como *cortá, agregá, cociná*).
   - Selector independiente de idioma `[ES | EN]` y botón de traducción dentro del detalle de cada receta.

3. **Asistente Culinario "Chef Remy" (IA + Motor Offline)**:
   - **Modo "¿Qué cocino con lo que tengo?"**: Sugiere recetas completas a partir de los ingredientes disponibles en tu heladera, porciones, tiempo disponible y metas nutricionales.
   - **Modo "¿Con qué lo reemplazo?"**: Proporciona sustitutos inmediatos para ingredientes faltantes con proporciones y consejos técnicos.
   - **Protección anti-fallo**: Si no hay API key o hay problemas de red, el motor heurístico offline (`lib/chefRemyOffline.ts`) genera recomendaciones y sustitutos instantáneamente sin interrumpir la experiencia.
   - Limitador de tasa en memoria (*rate limiting*) para prevenir abuso y consumo desmedido de cuota.

4. **Modo Cocina Guiado Paso a Paso (`CookingModeModal.tsx`)**:
   - Pantalla completa interactiva diseñada para usarse en la cocina.
   - División automática de las instrucciones en pasos claros numerados.
   - Detección inteligente de tiempos (ej. *"hervir durante 10 minutos"*) con temporizadores interactivos integrados que avisan con sonido al finalizar.
   - Lista de ingredientes verificable con checkboxes interactivos para no olvidar ningún elemento.

5. **Lista de Compras Inteligente y Consolidada (`ShoppingListModal.tsx`)**:
   - Agrega recetas completas a tu plan de menú semanal con un solo clic.
   - Motor de consolidación algorítmica (`lib/groceryConsolidator.ts`):
     - Unifica ingredientes idénticos entre recetas (ej. suma 200g de pollo de una receta + 300g de otra = 500g de pollo).
     - Convierte y normaliza unidades (gramos a kilos, mililitros a litros, unidades, cucharadas).
     - Clasifica automáticamente los artículos por pasillo del supermercado: *Frutas y Verduras*, *Carnes y Proteínas*, *Lácteos*, *Despensa* y *Otros*.
   - Posibilidad de agregar ítems manuales personalizados.
   - Marcar artículos comprados y vista optimizada para impresión en papel o PDF.

6. **Arquitectura Híbrida Offline-First**:
   - Si Supabase no está configurado o falla la conexión, la aplicación almacena y lee automáticamente todas las recetas e ingredientes de `localStorage` (`lib/recipeStore.ts`).
   - Sin pantallas de carga infinitas ni bloqueos si el usuario no inicia sesión.

---

## 🏗️ Estructura del Proyecto

```
pulse-and-cook/
├── app/
│   ├── api/
│   │   ├── chef-ai/route.ts      # API del Chef Remy (IA Gemini con rate-limiting y fallback offline)
│   │   └── translate/route.ts    # API de traducción culinaria con cascada de modelos Gemini
│   ├── components/
│   │   ├── AuthModal.tsx             # Modal de inicio de sesión y registro (Supabase Auth)
│   │   ├── ChefAssistantModal.tsx    # Interfaz interactiva del Chef Remy
│   │   ├── CookingModeModal.tsx      # Modo cocina paso a paso con temporizadores automáticos
│   │   ├── Header.tsx                # Barra superior con cambio de idioma, menú, compras y perfil
│   │   ├── RecipeCard.tsx            # Tarjeta de receta con rating, tags, tiempo e imagen
│   │   ├── RecipeDetailModal.tsx     # Vista en detalle con selector de idioma, videos e ingredientes
│   │   ├── RecipeFormModal.tsx       # Formulario de alta y edición con subida de imágenes y traducción
│   │   ├── RecipePrintView.tsx       # Hoja de impresión optimizada para recetas individuales
│   │   ├── RemyIcon.tsx              # Icono SVG personalizado del Chef Remy
│   │   ├── SearchBar.tsx             # Barra de búsqueda con filtros por categoría y tiempo
│   │   ├── ShoppingListModal.tsx     # Planificador de compras consolidado
│   │   ├── ShoppingListPrintView.tsx # Hoja de impresión de la lista de compras clasificada
│   │   ├── UsernameSetupModal.tsx    # Asignación de alias al registrarse
│   │   └── WelcomeLandingModal.tsx   # Modal de bienvenida para nuevos usuarios
│   ├── error.tsx                 # Manejador global de errores en Next.js App Router
│   ├── globals.css               # Estilos globales y utilidades Tailwind CSS v4
│   ├── layout.tsx                # Root layout con fuentes y metadatos SEO
│   ├── page.tsx                  # Página principal (controlador central de estado de la aplicación)
│   └── types.ts                  # Definición canónica de tipos e interfaces TypeScript
├── docs/
│   └── ARCHITECTURE.md           # Documentación técnica profunda de arquitectura y flujos de datos
├── lib/
│   ├── chefRemyOffline.ts        # Motor heurístico offline para el Chef Remy (recetas y sustitutos)
│   ├── culinaryDictionary.ts     # Diccionario bilingüe culinario (términos, ingredientes y categorías)
│   ├── groceryConsolidator.ts    # Algoritmo de unificación de ingredientes y conversión de unidades
│   ├── recipeStore.ts            # Capa de persistencia local (localStorage) resiliente
│   ├── recipeTranslator.ts       # Motor de traducción heurístico y detector de idioma culinario
│   ├── sampleData.ts             # Datos iniciales de demostración
│   ├── storage.ts                # Compresión de imágenes en Canvas y subida a Supabase Storage
│   └── supabase.ts               # Inicialización del cliente Supabase con detección de estado
├── HANDOVER.md                   # Registro histórico de fases completadas y decisiones técnicas
├── metadata.json                 # Metadatos de la plataforma AI Studio
└── package.json                  # Dependencias y scripts del proyecto
```

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: [Next.js 15+ (App Router)](https://nextjs.org/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/) con paleta cálida inspirada en gastronomía artesanal
- **Iconos**: [Lucide React](https://lucide.dev/)
- **Inteligencia Artificial**: [Google Gen AI SDK (`@google/genai`)](https://github.com/google-gemini/generative-ai-js)
- **Base de Datos & Auth**: [Supabase JS Client (`@supabase/supabase-js`)](https://supabase.com/)
- **Gestión de Paquetes**: `npm` / `bun`

---

## ⚙️ Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto (toma como referencia `.env.example`):

```env
# Google Gemini API Key (Requerido para las funciones inteligentes de Chef Remy y traducción con IA)
GEMINI_API_KEY=tu_clave_de_gemini_aqui

# Supabase (Opcional - La app funciona en modo local offline sin estas variables)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase_aqui
```

> **Nota de Seguridad**: `GEMINI_API_KEY` es una clave de servidor y **nunca** debe llevar el prefijo `NEXT_PUBLIC_`. Todas las llamadas a Gemini se realizan a través de rutas de servidor seguras (`/app/api/*`).

---

## 🚀 Instalación y Puesta en Marcha

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

3. **Verificar tipos y código (Linting)**:
   ```bash
   npm run lint
   ```

4. **Compilar para producción**:
   ```bash
   npm run build
   ```

---

## 📖 Documentación Adicional

Para comprender a fondo los flujos de datos, la estrategia de persistencia dual y los algoritmos internos, consulta:
- **[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)**: Flujos técnicos, diagrama del motor de consolidación y estrategia de IA.
- **[`HANDOVER.md`](./HANDOVER.md)**: Bitácora de trabajo con las 11 fases implementadas, resolución de bugs y cambios arquitectónicos.

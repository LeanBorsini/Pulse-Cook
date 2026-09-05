# HANDOVER - Pulse&Cook

## 📌 Visión General del Proyecto
**Pulse&Cook** es un recetario personal, familiar y colaborativo de alta fidelidad con soporte bilingüe (Español / Inglés), auto-traducción inteligente asistida por Gemini (`@google/genai`), control de voz manos libres para cocinar, soporte multienlace de videos/tutoriales, sistema comunitario de valoraciones por estrellas (1 a 5), comentarios persistentes, asistente culinario Chef Remy con fallbacks offline y un planificador inteligente de compras para supermercados.

- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, Google GenAI SDK (`@google/genai`).
- **Base de Datos & Auth**: Supabase (PostgreSQL + Supabase Auth OTP / Magic Links).
- **IA Generativa**: Google Gemini (`gemini-3.7-flash` / `@google/genai` v0.1.2) con arquitectura de API server-side y respaldo offline.

---

## ⚡ Estado de Estabilidad & Diagnóstico Reciente

### ✅ Corrección del Bloqueo / Congelamiento (Infinite Loop Fix)
- **Problema Detectado**: La aplicación se congelaba en el navegador arrojando *"La página no responde"* o error `SIGILL` y log de Vercel con códigos `304 Not Modified`.
- **Causa Raíz**: Bucle reactivo infinito en `app/page.tsx`. El `useEffect` de autenticación de Supabase (`onAuthStateChange`) ejecutaba `fetchRecipes`, el cual tenía como dependencia el objeto `user`. Al cambiar el estado de sesión, la referencia de la función mutaba en cada render, disparando peticiones y re-renders continuos que saturaban el hilo principal de JavaScript.
- **Solución Implementada**: 
  1. Desacoplamiento de `fetchRecipes` de las dependencias reactivas mediante paso explícito de usuario (`userOverride`) y uso de `userRef` estabilizado.
  2. Suscripción a eventos específicos de Supabase (`SIGNED_IN`, `SIGNED_OUT`, `USER_UPDATED`).
  3. Recreación del archivo `.env.example` con la documentación de variables de entorno.
- **Verificación**: `npm run lint` y `npm run build` ejecutados exitosamente sin advertencias de bloqueo ni errores.

### ✅ Corrección del Motor de Traducción de Instrucciones & Cascada de Modelos
- **Problema Detectado**: Las recetas guardadas en español no mostraban instrucciones al cambiar al inglés o se duplicaba el texto en español.
- **Causa Raíz**: Fallo por duplicidad en el campo `instructions_en` y fallos 503 por saturación temporal de un solo modelo en `/api/translate`.
- **Solución Implementada**: Cascada de modelos (`gemini-3.1-flash-lite`, `gemini-3.6-flash`, `gemini-3.8-flash`), saneamiento de textos clonados, diccionario offline de respaldo y conmutador `[ES | EN]` con botón interactivo de traducción en `RecipeDetailModal.tsx`.
- **Servidor Dev**: Operando en `http://localhost:3000` con respuesta HTTP 200 OK.

### ✅ Erradicación de Spanglish y Limpieza Léxica en Tiempo Real
- **Problema Detectado**: Ciertas recetas arrastraban términos en inglés en la vista en español (ej. *chicken breast*, *butternut squash*) o términos en español en la vista en inglés (ej. *cebolla*).
- **Causa Raíz**: Contaminación léxica en la ingesta inicial de recetas y traducciones literales de ingredientes aislados.
- **Solución Implementada**: 
  1. Funciones de limpieza léxica profunda `cleanToPureSpanish` y `cleanToPureEnglish` en `lib/recipeTranslator.ts` que se aplican automáticamente en runtime (tarjetas, modales, vista de impresión).
  2. Botón interactivo *"Sanear Spanglish"* en `RecipeDetailModal.tsx` que detecta términos cruzados, los corrige y guarda la versión pura tanto en Supabase como en `localStorage`.
  3. Editor manual directo de instrucciones paso a paso dentro del modal para control total del usuario.
  4. Fallback externo de traducción alternativa (MyMemory API) integrado en `/api/translate/route.ts` cuando la cuota de Gemini se satura temporalmente.

### ✅ Filtros en Combobox Desplegable y Rediseño Minimalista de Búsqueda
- **Requerimiento del Usuario**: Los filtros de categorías y dietas ocupaban demasiado espacio visual en pantalla. El usuario solicitó mantener la pantalla limpia por defecto, agrupándolos dentro de un combobox/menú desplegable, con soporte para seleccionar múltiples categorías/dietas, una sola, o ninguna, y mostrar únicamente los filtros activos como chips.
- **Solución Implementada**:
  1. Refactorización completa de `app/components/SearchBar.tsx` con un botón desplegable (`SlidersHorizontal`) y menú flotante con pestañas (Categorías y Dietas) y checkboxes accesibles.
  2. Soporte de selección múltiple con chips interactivos con botón `✕` de eliminación rápida y botón `Borrar todos`.
  3. Actualización de `app/page.tsx` con estado `selectedCategories: string[]` (lógica OR) y `selectedTags: string[]` (lógica AND).
  4. Rediseño y expansión del modal de ayuda `WelcomeLandingModal.tsx` abarcando las 8 capacidades centrales del recetario.

---

## 🔑 Variables de Entorno Requeridas

Para el correcto funcionamiento local y en producción (Vercel / Cloud Run):

| Variable | Tipo | Descripción | Dónde se obtiene |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente | URL del proyecto Supabase | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente | Clave anónima pública de Supabase | Supabase > Project Settings > API |
| `GEMINI_API_KEY` | Servidor | Clave de Google AI Studio para Chef Remy y Traductor | [Google AI Studio](https://aistudio.google.com/app/apikey) |

> ⚠️ **Nota de Seguridad**: `GEMINI_API_KEY` es de uso exclusivo en servidor (`app/api/*`) y nunca debe llevar el prefijo `NEXT_PUBLIC_`.

---

## 🗄️ Esquema de Base de Datos en Supabase

### 1. Tabla `profiles`
```sql
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);
```

### 2. Tabla `recipes`
```sql
create table if not exists public.recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  title_es text not null,
  title_en text,
  category text,
  prep_time integer default 15,
  servings integer default 1,
  description_es text,
  description_en text,
  instructions_es text,
  instructions_en text,
  youtube_url text,
  video_links jsonb default '[]'::jsonb,
  image_url text,
  dietary_tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.recipes enable row level security;
create policy "Recipes are viewable by everyone." on public.recipes for select using (true);
create policy "Authenticated users can create recipes." on public.recipes for insert with check (auth.role() = 'authenticated');
create policy "Users can update their own recipes." on public.recipes for update using (auth.uid() = user_id);
create policy "Users can delete their own recipes." on public.recipes for delete using (auth.uid() = user_id);
```

### 3. Tabla `ratings`
```sql
create table if not exists public.ratings (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  stars integer not null check (stars >= 1 and stars <= 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (recipe_id, user_id)
);

alter table public.ratings enable row level security;
create policy "Ratings are viewable by everyone." on public.ratings for select using (true);
create policy "Authenticated users can rate recipes." on public.ratings for insert with check (auth.uid() = user_id);
create policy "Users can update their own rating." on public.ratings for update using (auth.uid() = user_id);
create policy "Users can delete their own rating." on public.ratings for delete using (auth.uid() = user_id);
```

### 4. Tabla `comments`
```sql
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes on delete cascade not null,
  user_id uuid references auth.users on delete set null,
  user_name text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.comments enable row level security;
create policy "Comments are viewable by everyone." on public.comments for select using (true);
create policy "Authenticated users can post comments." on public.comments for insert with check (auth.role() = 'authenticated');
create policy "Users can delete their own comments." on public.comments for delete using (auth.uid() = user_id);
```

---

### 5. Supabase Storage: Bucket `recipe-images`
Para permitir la subida directa de fotos (máximo 3 imágenes por receta con compresión automática en cliente):

1. Ve a **Storage** en tu panel de Supabase.
2. Crea un nuevo bucket llamado `recipe-images` y márcalo como **Public bucket**.
3. Aplica las siguientes políticas de almacenamiento (Policies):
```sql
-- Permitir lectura pública de imágenes
create policy "Public images are viewable by everyone."
  on storage.objects for select
  using ( bucket_id = 'recipe-images' );

-- Permitir subida a usuarios autenticados
create policy "Authenticated users can upload recipe images."
  on storage.objects for insert
  with check ( bucket_id = 'recipe-images' and auth.role() = 'authenticated' );

-- Permitir actualización y borrado al autor
create policy "Users can update or delete their own recipe images."
  on storage.objects for delete
  using ( bucket_id = 'recipe-images' and auth.uid() = owner );
```

---

## 🗺️ Estado de la Hoja de Ruta

### ✅ Fase 1: Autenticación de Usuarios y Seguridad (COMPLETADA)
- [x] Autenticación sin contraseñas híbrida: soporte simultáneo para clic en Magic Link o ingreso manual de Token numérico de 6 dígitos (`AuthModal.tsx`).
- [x] Flujo de Onboarding obligatorio de Alias único (`UsernameSetupModal.tsx`) con chequeo de disponibilidad en tiempo real.
- [x] Ocultación total de correos electrónicos en la interfaz (solo se muestra `@alias`).
- [x] Atribución de autoría en recetas (`by @alias`) y comentarios.
- [x] Restricción de permisos de edición/eliminación únicamente al autor (`user.id === recipe.user_id`).
- [x] Header actualizado con estado de sesión, avatar de alias y cierre de sesión.

---

### ✅ Fase 2: Traducción con IA, Múltiples Videos y Tags Dinámicos (COMPLETADA)
- [x] Endpoint seguro `/api/translate` con Gemini (`gemini-3.7-flash`) y schema JSON estructurado para traducción culinaria precisa (ES <-> EN).
- [x] Botón "Auto-Traducir con IA" en el formulario de creación/edición de recetas (`RecipeFormModal.tsx`).
- [x] Botón "Traducir en Vivo" en el modal de detalle (`RecipeDetailModal.tsx`) para cambiar de idioma al instante.
- [x] Soporte para múltiples enlaces de video y tutoriales (`video_links`) con selector de pestaña en el reproductor.
- [x] Sistema de etiquetas gastronómicas dinámicas (predefinidas + creación de tags personalizados + sugerencias de IA).
- [x] Barra de búsqueda y filtros sincronizada dinámicamente con todos los tags de la base de datos.

---

### ✅ Fase 3: Calificaciones y Funcionalidades Comunitarias (COMPLETADA)
- [x] Sistema interactivo de valoración por estrellas (1 a 5) con cálculo de promedio y total de votos (`ratings`).
- [x] Guardado optimista y persistencia en Supabase por usuario con constraint única `(recipe_id, user_id)`.
- [x] Selector de ordenamiento en la cabecera: **Recientes** (`recent`), **Mejor Valoradas** (`rating`) y **Más Rápidas** (`prepTime`).
- [x] Persistencia de comentarios en Supabase con avatar y alias del autor en tiempo real.
- [x] Badges de calificación en tarjetas (`RecipeCard.tsx`) y visualizador en el modal detallado.

---

### ✅ Fase 4: Lista Inteligente de Compras & Subida de Fotos (COMPLETADA)
- [x] **Lista de Compras Inteligente (`ShoppingListModal.tsx`)**:
  - Agrupación automática por pasillos de supermercado (🥦 Frutas/Verduras, 🥩 Carnicería, 🧀 Lácteos, 🥖 Panadería, 🥫 Despensa, 🧂 Especias).
  - Consolidación y suma matemática automática de cantidades e ingredientes repetidos.
  - Checkboxes interactivos para tachar artículos en el súper con barra de porcentaje de progreso.
  - Botón directo de **Compartir por WhatsApp** y **Copiar al Portapapeles** con formato limpio.
- [x] **Subida Directa de Fotos & Galería Múltiple (`lib/storage.ts`, `RecipeFormModal.tsx`)**:
  - Subida directa desde cámara o galería de archivos con compresión automática en el navegador (JPEG optimizado).
  - Límite estricto de **máximo 3 fotos por receta** para proteger el almacenamiento y rendimiento.
  - Selector interactivo de Foto de Portada (`Cover`) y eliminación individual.
  - Visor de galería en `RecipeDetailModal.tsx` con tira de miniaturas interactivas.
  - Indicador de número de fotos en las tarjetas de la pantalla principal (`RecipeCard.tsx`).

---

### ✅ Fase 5: Asistente Chef Gemini IA: ¿Qué cocino hoy? & Sustitutos (COMPLETADA)
- [x] **Endpoint Servidor Seguro `/api/chef-ai` (`gemini-3.7-flash`)**:
  - Implementación con SDK `@google/genai` con schema JSON estricto.
  - Rate limiting en memoria por IP/Usuario (máx 12 peticiones / 5 minutos) para proteger cuotas de API.
- [x] **Modo "De la Heladera al Plato" (`ChefAssistantModal.tsx`)**:
  - Creación interactiva de recetas personalizadas basadas en ingredientes disponibles en la heladera/despensa.
  - Ajustes de comensales (1, 2, 4, 6+ porciones), tiempo límite (15m express, 30m, 45m, 60m) y metas dietarias (Vegetariano, Vegano, Celíaco/Sin Gluten, Alto en Proteína, Bajo en Calorías).
  - Botón directo **"Guardar en mi Recetario"** que persiste la receta y sus ingredientes en Supabase.
- [x] **Modo "Reemplazo Inteligente de Ingredientes"**:
  - Búsqueda culinaria de sustitutos ante ingredientes faltantes con ratios de conversión exactos y consejos del chef.
- [x] **Acceso Directo**: Botón destacado **Chef Remy** integrado en la cabecera principal (`Header.tsx`).

---

### ✅ Fase 6: Exportación a PDF & Compartir Recetas (COMPLETADA)
- [x] **Ficha Imprimible y Exportación a PDF (`RecipePrintView.tsx`)**:
  - Diseño gourmet limpio y corporativo (*Pulse & Cook • Anyone can cook!*) adaptado para tamaño de hoja A4 y Carta.
  - Sello e icono del Chef Remy, tabla de ingredientes con cantidades escaladas según las porciones calculadas, casillas de verificación e instrucciones paso a paso numeradas.
  - Estilos CSS `@media print` dedicados para ocultar botones o fondos de UI innecesarios al imprimir.
- [x] **Compartir Recetas en Redes y WhatsApp**:
  - Botón integrado en `RecipeDetailModal.tsx` con integración a `navigator.share` y copia formateada automática para WhatsApp o mensajería.

---

### ✅ Fase 7: Estabilidad, Offline Fallbacks y Consolidación (COMPLETADA)
- [x] **Manejo de Errores y Fallbacks (`chefRemyOffline.ts`, `recipeTranslator.ts`)**:
  - Sistema de respaldo local inteligente en caso de que falte la API Key de Gemini, se alcance el límite de cuotas, o existan interrupciones en la API.
  - El motor captura los fallos de la API silenciosamente y el Chef Remy devuelve recetas de contingencia pre-calculadas o sustitutos para evitar que la UI se rompa.
  - Traducción por diccionario Regex offline como respaldo al traductor IA.
- [x] **Lista de Compras Robusta (`groceryConsolidator.ts`)**:
  - Tipado (`Ingredient`) y lógica para extraer y consolidar correctamente los ingredientes de las recetas pasadas al modal.
- [x] **Corrección de Build y Tipado**:
  - Solución de errores en `route.ts` de `chef-ai` y `translate`.

---

### ✅ Fase 8: Infraestructura de Autenticación SMTP & Plantillas Bilingües (COMPLETADA)
- [x] **Configuración SMTP Personalizado para Códigos OTP de 6 Dígitos**:
  - Transición documentada del mailer predeterminado de Supabase a proveedor SMTP dedicado (**Brevo** / `smtp-relay.brevo.com`) para evitar rate limits y habilitar entrega instantánea sin costo.
  - Compatibilidad de remitente verificado con cuentas `@gmail.com` sin requerir dominios comerciales de pago.
- [x] **Plantilla de Correo Bilingüe (ES / EN) de Alta Fidelidad**:
  - Diseño HTML responsivo alineado con la identidad visual de Pulse & Cook (paleta cálida `#F4F1EA`, `#2C3523`, tarjeta con código OTP destacado y aviso de expiración a 10 min).
  - Integración nativa con la variable `{{ .Token }}` de Supabase Auth para login sin contraseñas (Passwordless OTP).

---

### ✅ Fase 9: Landing de Bienvenida, Carga Unificada & Correcciones Chef Remy / PDF (COMPLETADA)
- [x] **Pantalla / Modal de Bienvenida (`WelcomeLandingModal.tsx`)**:
  - Presentación editorial bilingüe (ES / EN) que explica el propósito de Pulse & Cook, los 4 pilares clave (IA, Chef Remy, Modo Cocina Guiado, Lista de Compras Inteligente) y botón directo para continuar a las recetas.
  - Persistencia de primer acceso en `localStorage` (`pulse_cook_welcome_seen`) y botón de acceso rápido `"Guía"` en el encabezado (`Header.tsx`).
- [x] **Formulario Unificado de Recetas (`RecipeFormModal.tsx`)**:
  - El usuario redacta cómodamente en un solo Título espacioso, una sola Descripción y una sola área de Instrucciones numeradas en su idioma preferido.
  - Al guardar, el motor traduce al segundo idioma en segundo plano y enriquece con tags antes de almacenar en Supabase.
- [x] **Estabilidad y Resiliencia del Chef Remy IA (`ChefAssistantModal.tsx` & `/api/chef-ai`)**:
  - Comunicación con `gemini-3.7-flash` con fallback culinario inmediato ante interrupciones o cuotas.
- [x] **Corrección de Impresión PDF Limpia (`RecipePrintView.tsx` & `globals.css`)**:
  - Aislamiento estricto del selector `@media print` para eliminar duplicados del DOM y renderizar la ficha culinaria en el idioma activo.

---

### ✅ Fase 10: Modo Cocina con Comandos por Voz & Experiencia Manos Libres (COMPLETADA)
- [x] **Modo Cocina con Comandos de Voz Manos Libres (`CookingModeModal.tsx`)**:
  - Interfaz de lectura a pantalla completa, limpia y libre de distracciones.
  - **Control por Voz Nativo (Web Speech Recognition)**: Activa el botón de micrófono y controla la receta diciendo:
    - 🗣️ *"Siguiente"* / *"Next"* -> Avanza de paso automáticamente.
    - 🗣️ *"Anterior"* / *"Atrás"* / *"Back"* -> Vuelve al paso previo.
    - 🗣️ *"Leer"* / *"Repetir"* / *"Read"* -> Lee el paso en voz alta (Text-To-Speech).
    - 🗣️ *"Ingredientes"* -> Despliega la lista de ingredientes y porciones.
  - Escalado dinámico de porciones (`+` / `-`) que recalcula los ingredientes en vivo.
- [x] **Botón "Menú" directo desde la Receta Abierta (`RecipeDetailModal.tsx`)**:
  - Sume o retire la receta de la lista de compras sin cerrar la vista.

---

### ✅ Fase 11: Motor de Traducción Culinaria Robusta & Corrección de Instrucciones Bilingües (COMPLETADA)
- [x] **Detección Lingüística Culinaria Genuina (`lib/recipeTranslator.ts`)**:
  - Detección precisa de textos culinarios en español vs. inglés (`isSpanishCulinaryText`, `hasGenuineEnglishInstructions`, `hasGenuineSpanishInstructions`).
  - Reconocimiento de conjugaciones estándar e imperativas rioplatenses/latinas (*cortá, cociná, agregá, serví, mezclá, dorá*) y vocabulario gastronómico específico.
  - Corrección del bug donde recetas cargadas solo en español duplicaban su contenido en `instructions_en`, bloqueando falsamente la traducción.
- [x] **Cascada Resiliente de Modelos de IA en `/api/translate`**:
  - Implementación de cascada automática entre modelos Gemini (`gemini-3.1-flash-lite` -> `gemini-3.6-flash` -> `gemini-3.8-flash`) para mitigar saturación de cuota o errores 503 temporales.
  - Fallback offline inmediato con diccionario culinario inteligente expandido, garantizando que el usuario nunca vea un error ni se quede sin instrucciones traducidas.
- [x] **Selector Directo de Idioma y Traducción Rápida en Detalle (`RecipeDetailModal.tsx`)**:
  - Conmutador directo `[ES | EN]` en la cabecera de las instrucciones.
  - Botón interactivo de traducción directa con indicador de carga.
  - Almacenamiento y persistencia local inmediata de las instrucciones traducidas para que estén listas sin esperas en el Modo Cocina y futuras visitas.
- [x] **Normalización en Formulario y Listado (`RecipeFormModal.tsx` & `app/page.tsx`)**:
  - Saneamiento en la ingesta de datos para evitar que `instructions_en` almacene copias en español.
  - Fallback culinario inteligente integrado directamente en el guardado de nuevas recetas.

---

### ✅ Fase 12: Documentación Integral del Proyecto & Guía de Arquitectura (COMPLETADA)
- [x] **Manual de Instalación y Referencia (`README.md`)**:
  - Guía completa de inicio rápido, configuración de variables de entorno (`.env.local`), scripts npm y estructura de carpetas.
  - Tabla de credenciales de prueba, detalles del stack tecnológico (Next.js 15 App Router, Supabase, Google GenAI SDK, Tailwind CSS) y notas sobre el funcionamiento offline-first.
- [x] **Documento Técnico de Arquitectura (`docs/ARCHITECTURE.md`)**:
  - Diagrama de flujo de datos y modelo de persistencia híbrida (`localStorage` v3 + Supabase PostgreSQL).
  - Especificación técnica del motor de consolidación de compras (`lib/groceryConsolidator.ts`) y normalización de unidades.
  - Detalle del sistema de fallback en cascada para la IA culinaria (`/api/chef-ai` y `/api/translate` con `lib/chefRemyOffline.ts`).
  - Guía de onboarding para nuevos desarrolladores y mantenimiento futuro.
- [x] **Comentarios JSDoc Exhaustivos en el Código**:
  - Documentación de tipos e interfaces clave (`app/types.ts`).
  - Comentarios explicativos en módulos de lógica de negocio (`lib/recipeStore.ts`, `lib/supabase.ts`, `lib/storage.ts`, `lib/groceryConsolidator.ts`, `lib/recipeTranslator.ts`, `lib/chefRemyOffline.ts`).
  - Documentación a nivel de archivo y props en rutas de API (`/api/chef-ai`, `/api/translate`) y componentes principales (`app/page.tsx`, `RecipeDetailModal.tsx`, `CookingModeModal.tsx`, `ShoppingListModal.tsx`, `ChefAssistantModal.tsx`, `RecipeFormModal.tsx`).

---

### ✅ Fase 13: Erradicación de Spanglish & Sanitización Léxica Culinaria (COMPLETADA)
- [x] **Limpieza Léxica Automática en Runtime (`lib/recipeTranslator.ts`)**:
  - Funciones `cleanToPureSpanish` y `cleanToPureEnglish` que sanean términos cruzados rebeldes (como *cebolla / onion*, *chicken breast / pechuga de pollo*, *butternut squash / calabaza/zapallo*, *egg / huevo*, etc.).
  - Aplicación consistente en el renderizado de tarjetas (`RecipeCard.tsx`), detalle de receta (`RecipeDetailModal.tsx`), modo cocina y vista de impresión.
- [x] **Botón de Auto-Reparación "Sanear Spanglish" (`RecipeDetailModal.tsx`)**:
  - Detección en tiempo real de mezclas léxicas dentro de las instrucciones de la receta abierta.
  - Al presionar el botón, se purga el texto mixto y se guarda la versión corregida tanto en Supabase como en `localStorage`.
- [x] **Editor Manual de Instrucciones en el Modal de Detalle**:
  - Permite al usuario editar o ajustar directamente las instrucciones paso a paso en caso de querer redactar matices específicos.
- [x] **Traductor Alternativo Multicapa (`/api/translate/route.ts`)**:
  - Adición de respaldo con MyMemory API y diccionario offline para garantizar traducción culinaria ininterrumpida aun en momentos de cuota agotada de Gemini.

---

### ✅ Fase 14: Filtros en Combobox Desplegable, Selección Múltiple & Guía de Ayuda (COMPLETADA)
- [x] **Filtros en Menú Desplegable Tipo Combobox (`SearchBar.tsx`)**:
  - La pantalla principal se mantiene 100% limpia y despejada por defecto, sin hileras de botones estáticos que sobrecarguen la vista.
  - Al hacer clic en el botón *"Filtros"* (`SlidersHorizontal`), se despliega un panel flotante organizado por pestañas (**Categorías** y **Dietas / Preferencias**).
  - Cierre automático al hacer clic fuera del panel (`click-outside handler`) o presionar Escape.
- [x] **Soporte para Selección Múltiple, Única o Ninguna**:
  - Permite seleccionar múltiples categorías a la vez (lógica OR: ej. ver platos que sean *Desayuno* o *Postre*).
  - Permite seleccionar múltiples dietas a la vez (lógica AND: ej. recetas que cumplan con *Sin Gluten* y *Vegano*).
  - Contador numérico visual en el botón de filtros indicando la cantidad total de filtros activos.
- [x] **Chips Activos Dinámicos en Pantalla**:
  - Únicamente los filtros seleccionados se despliegan debajo de la barra de búsqueda en formato de píldoras/chips.
  - Cada chip incluye un botón interactivo `✕` para removerlo individualmente, además de un botón *"Borrar todos"* / *"Clear all"*.
- [x] **Actualización de la Guía de Ayuda / Modal de Bienvenida (`WelcomeLandingModal.tsx`)**:
  - Rediseño editorial y estructuración exhaustiva con las **8 capacidades completas** de Pulse & Cook:
    1. Filtros Inteligentes en Combobox con selección múltiple.
    2. Chef Asistente Remy con IA.
    3. Traducción Pura bilingüe sin Spanglish y saneamiento en un clic.
    4. Modo Cocina Guiado con temporizadores de sonido.
    5. Menú Semanal y Lista de Compras clasificada por pasillos.
    6. Creación Multimedia con hasta 5 fotos y videos de YouTube.
    7. Fichas Imprimibles gourmet y exportación a PDF.
    8. Instalación como PWA móvil y compartir rápido por Código QR o WhatsApp.
  - Accesible en cualquier momento desde el botón *"Guía"* en la cabecera principal.



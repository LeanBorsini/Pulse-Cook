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





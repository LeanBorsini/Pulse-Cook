-- ==============================================================================
-- PULSE & COOK - SCRIPT SQL DE SINCRONIZACIÓN Y POLÍTICAS DE SUPABASE
-- ==============================================================================
-- Idempotente: Listo para copiar y pegar directamente en el SQL Editor de Supabase.
-- Garantiza que todos los usuarios (creador, admin y visitantes) vean exactamente
-- las mismas recetas, ingredientes bilingües y valoraciones consolidadas.
-- ==============================================================================

-- 1. EXTENSIONES Y TABLAS BÁSICAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Recetas
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title_es TEXT NOT NULL,
    title_en TEXT DEFAULT '',
    category TEXT DEFAULT 'Platos Principales',
    prep_time INTEGER DEFAULT 20,
    servings INTEGER DEFAULT 4,
    description_es TEXT DEFAULT '',
    description_en TEXT DEFAULT '',
    instructions_es TEXT DEFAULT '',
    instructions_en TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    images TEXT[] DEFAULT '{}',
    youtube_url TEXT DEFAULT '',
    video_links JSONB DEFAULT '[]'::jsonb,
    dietary_tags TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active'
);

-- Tabla de Ingredientes (Bilingües genuinos: name_es / name_en)
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    name_es TEXT NOT NULL,
    name_en TEXT NOT NULL,
    amount NUMERIC DEFAULT 1,
    unit TEXT DEFAULT '',
    aisle TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Tabla de Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Tabla de Calificaciones por Estrellas
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(recipe_id, user_id)
);

-- Tabla de Comentarios
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. ÍNDICES DE ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON public.ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_recipe_id ON public.ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON public.comments(recipe_id);

-- 3. HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS IDEMPOTENTES
-- Recetas: Lectura pública para todos los usuarios
DROP POLICY IF EXISTS "Lectura publica recetas" ON public.recipes;
CREATE POLICY "Lectura publica recetas" ON public.recipes
    FOR SELECT USING (true);

-- Recetas: Inserción para usuarios autenticados
DROP POLICY IF EXISTS "Insertar recetas autenticados" ON public.recipes;
CREATE POLICY "Insertar recetas autenticados" ON public.recipes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Recetas: Edición para el autor de la receta o para el administrador principal leanBorsini
DROP POLICY IF EXISTS "Editar recetas autor o admin" ON public.recipes;
CREATE POLICY "Editar recetas autor o admin" ON public.recipes
    FOR UPDATE USING (
        auth.uid() = user_id OR
        auth.uid() = '1afb8de4-9294-4f57-af9f-dc50b3e6e768'::uuid
    );

-- Recetas: Borrado para el autor o admin
DROP POLICY IF EXISTS "Borrar recetas autor o admin" ON public.recipes;
CREATE POLICY "Borrar recetas autor o admin" ON public.recipes
    FOR DELETE USING (
        auth.uid() = user_id OR
        auth.uid() = '1afb8de4-9294-4f57-af9f-dc50b3e6e768'::uuid
    );

-- Ingredientes: Lectura pública para todos los usuarios
DROP POLICY IF EXISTS "Lectura publica ingredientes" ON public.ingredients;
CREATE POLICY "Lectura publica ingredientes" ON public.ingredients
    FOR SELECT USING (true);

-- Ingredientes: Inserción permitida para usuarios autenticados o autores de la receta
DROP POLICY IF EXISTS "Insertar ingredientes autenticados" ON public.ingredients;
CREATE POLICY "Insertar ingredientes autenticados" ON public.ingredients
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ingredientes: Modificación / Borrado para el autor de la receta o admin
DROP POLICY IF EXISTS "Gestion ingredientes autor o admin" ON public.ingredients;
CREATE POLICY "Gestion ingredientes autor o admin" ON public.ingredients
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM public.recipes
                WHERE recipes.id = ingredients.recipe_id
                AND (recipes.user_id = auth.uid() OR auth.uid() = '1afb8de4-9294-4f57-af9f-dc50b3e6e768'::uuid)
            )
            OR auth.uid() = '1afb8de4-9294-4f57-af9f-dc50b3e6e768'::uuid
        )
    );

-- Ratings: Lectura pública
DROP POLICY IF EXISTS "Lectura publica ratings" ON public.ratings;
CREATE POLICY "Lectura publica ratings" ON public.ratings
    FOR SELECT USING (true);

-- Ratings: Inserción y actualización para el propio usuario
DROP POLICY IF EXISTS "Insertar propios ratings" ON public.ratings;
CREATE POLICY "Insertar propios ratings" ON public.ratings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Actualizar propios ratings" ON public.ratings;
CREATE POLICY "Actualizar propios ratings" ON public.ratings
    FOR UPDATE USING (auth.uid() = user_id);

-- Comentarios: Lectura pública e inserción autenticada
DROP POLICY IF EXISTS "Lectura publica comments" ON public.comments;
CREATE POLICY "Lectura publica comments" ON public.comments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insertar comentarios" ON public.comments;
CREATE POLICY "Insertar comentarios" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. SUSCRIPCIONES EN TIEMPO REAL
-- Habilita supabase_realtime para sincronización instantánea entre todos los dispositivos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'recipes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.recipes;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ingredients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ratings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
    END IF;
END $$;

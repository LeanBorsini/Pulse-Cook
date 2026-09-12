-- ==============================================================================
-- 🛡️ PULSE&COOK — MIGRACIÓN SQL: SISTEMA DE DENUNCIAS Y PANEL DE MODERACIÓN
-- ==============================================================================
-- Instrucciones:
-- 1. Abre el SQL Editor en tu proyecto de Supabase (https://supabase.com/dashboard).
-- 2. Copia y pega este script completo.
-- 3. Pulsa "Run".
-- Es 100% idempotente (se puede ejecutar múltiples veces de forma segura sin romper datos existentes).
--
-- Autor principal y Administrador Supremo: leanBorsini (leoborsini12@gmail.com)
-- UUID: 1afb8de4-9294-4f57-af9f-dc50b3e6e768
-- ==============================================================================

-- 1. ACTUALIZAR TABLA DE PERFILES: profiles (Roles y Baneo)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- Garantizar restricción de roles válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('admin', 'moderator', 'user'));
  END IF;
END $$;

-- Asignar rol de 'admin' a leanBorsini
UPDATE public.profiles
SET role = 'admin', is_banned = FALSE
WHERE id = '1afb8de4-9294-4f57-af9f-dc50b3e6e768'
   OR lower(username) = 'leanborsini';

-- 2. AÑADIR ESTADOS DE MODERACIÓN Y CONTADOR DE DENUNCIAS A LAS TABLAS DE CONTENIDO

-- 2.1 En Recetas: recipes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS reports_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipes_status_check'
  ) THEN
    ALTER TABLE public.recipes ADD CONSTRAINT recipes_status_check 
      CHECK (status IN ('active', 'under_review', 'hidden'));
  END IF;
END $$;

-- 2.2 En Tips de Chef: chef_tips (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chef_tips') THEN
    ALTER TABLE public.chef_tips ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE public.chef_tips ADD COLUMN IF NOT EXISTS reports_count INTEGER NOT NULL DEFAULT 0;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chef_tips_status_check'
    ) THEN
      ALTER TABLE public.chef_tips ADD CONSTRAINT chef_tips_status_check 
        CHECK (status IN ('active', 'under_review', 'hidden'));
    END IF;
  END IF;
END $$;

-- 2.3 En Comentarios de Recetas: comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS reports_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_status_check'
  ) THEN
    ALTER TABLE public.comments ADD CONSTRAINT comments_status_check 
      CHECK (status IN ('active', 'under_review', 'hidden'));
  END IF;
END $$;

-- 2.4 En Experiencias de Tips: tip_experiences (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tip_experiences') THEN
    ALTER TABLE public.tip_experiences ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE public.tip_experiences ADD COLUMN IF NOT EXISTS reports_count INTEGER NOT NULL DEFAULT 0;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'tip_experiences_status_check'
    ) THEN
      ALTER TABLE public.tip_experiences ADD CONSTRAINT tip_experiences_status_check 
        CHECK (status IN ('active', 'under_review', 'hidden'));
    END IF;
  END IF;
END $$;

-- 3. CREACIÓN DE LA TABLA PRINCIPAL DE DENUNCIAS: content_reports
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_username TEXT,
  reporter_email TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('recipe', 'tip', 'comment', 'tip_experience', 'user')),
  target_id TEXT NOT NULL,
  target_title TEXT,
  target_snippet TEXT,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_username TEXT,
  reason_category TEXT NOT NULL CHECK (reason_category IN (
    'spam_scam',
    'inappropriate_nudity',
    'offensive_harassment',
    'dangerous_misleading',
    'other'
  )),
  reason_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  action_taken TEXT DEFAULT 'none' CHECK (action_taken IN (
    'none',
    'dismissed',
    'hidden',
    'deleted',
    'user_banned'
  )),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Evitar que un mismo usuario denuncie múltiples veces el mismo elemento (spam de denuncias)
  CONSTRAINT content_reports_unique_reporter_target UNIQUE (reporter_id, target_type, target_id)
);

-- Índices de consulta rápida para el panel de moderación
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON public.content_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON public.content_reports(reporter_id);

-- 4. FUNCIÓN AUXILIAR: is_admin_or_moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND (role IN ('admin', 'moderator') OR id = '1afb8de4-9294-4f57-af9f-dc50b3e6e768')
  ) OR user_id = '1afb8de4-9294-4f57-af9f-dc50b3e6e768';
$$;

-- 5. FUNCIÓN & TRIGGER: UMBRAL DE DENUNCIAS AUTOMÁTICO (3 denuncias de usuarios distintos)
-- Si un contenido alcanza 3 reportes distintos, pasa automáticamente a 'under_review' (salvo el contenido del autor principal)
CREATE OR REPLACE FUNCTION public.handle_content_report_threshold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_reports_count INTEGER;
  main_admin_uuid CONSTANT UUID := '1afb8de4-9294-4f57-af9f-dc50b3e6e768';
BEGIN
  -- 1. Contar cuántos reportes pendientes/activos existen para este elemento
  SELECT count(*) INTO current_reports_count
  FROM public.content_reports
  WHERE target_type = NEW.target_type AND target_id = NEW.target_id AND status != 'dismissed';

  -- 2. Actualizar el contador en la tabla correspondiente y aplicar umbral
  IF NEW.target_type = 'recipe' THEN
    UPDATE public.recipes
    SET reports_count = current_reports_count,
        status = CASE 
          WHEN current_reports_count >= 3 AND (user_id IS NULL OR user_id != main_admin_uuid) THEN 'under_review'
          ELSE status
        END
    WHERE id = NEW.target_id;

  ELSIF NEW.target_type = 'tip' THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chef_tips') THEN
      UPDATE public.chef_tips
      SET reports_count = current_reports_count,
          status = CASE 
            WHEN current_reports_count >= 3 AND (author_id IS NULL OR author_id != main_admin_uuid) THEN 'under_review'
            ELSE status
          END
      WHERE id::text = NEW.target_id;
    END IF;

  ELSIF NEW.target_type = 'comment' THEN
    UPDATE public.comments
    SET reports_count = current_reports_count,
        status = CASE 
          WHEN current_reports_count >= 3 AND (user_id IS NULL OR user_id != main_admin_uuid) THEN 'under_review'
          ELSE status
        END
    WHERE id::text = NEW.target_id;

  ELSIF NEW.target_type = 'tip_experience' THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tip_experiences') THEN
      UPDATE public.tip_experiences
      SET reports_count = current_reports_count,
          status = CASE 
            WHEN current_reports_count >= 3 AND (user_id IS NULL OR user_id != main_admin_uuid) THEN 'under_review'
            ELSE status
          END
      WHERE id::text = NEW.target_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_on_content_report_inserted ON public.content_reports;
CREATE TRIGGER trigger_on_content_report_inserted
AFTER INSERT ON public.content_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_content_report_threshold();

-- 6. POLÍTICAS DE SEGURIDAD RLS (Row Level Security)

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- 6.1 Un usuario autenticado no baneado puede registrar una denuncia
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.content_reports;
CREATE POLICY "Authenticated users can submit reports"
ON public.content_reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_banned = TRUE
  )
);

-- 6.2 Los usuarios pueden ver sus propias denuncias enviadas
DROP POLICY IF EXISTS "Users can view their own reports" ON public.content_reports;
CREATE POLICY "Users can view their own reports"
ON public.content_reports
FOR SELECT
TO authenticated
USING (
  auth.uid() = reporter_id
  OR public.is_admin_or_moderator(auth.uid())
);

-- 6.3 Moderadores y Admins pueden actualizar cualquier denuncia (resolver, desestimar, aplicar acciones)
DROP POLICY IF EXISTS "Moderators and admins can update reports" ON public.content_reports;
CREATE POLICY "Moderators and admins can update reports"
ON public.content_reports
FOR UPDATE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- 6.4 Moderadores y Admins pueden eliminar denuncias
DROP POLICY IF EXISTS "Moderators and admins can delete reports" ON public.content_reports;
CREATE POLICY "Moderators and admins can delete reports"
ON public.content_reports
FOR DELETE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

-- 7. REGLAS PARA BLOQUEO DE USUARIOS BANEADOS
-- Bloquear creación/actualización de recetas si el usuario está baneado
DROP POLICY IF EXISTS "Banned users cannot create recipes" ON public.recipes;
CREATE POLICY "Banned users cannot create recipes"
ON public.recipes
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_banned = TRUE
  )
);

-- Bloquear comentarios si el usuario está baneado
DROP POLICY IF EXISTS "Banned users cannot comment" ON public.comments;
CREATE POLICY "Banned users cannot comment"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_banned = TRUE
  )
);

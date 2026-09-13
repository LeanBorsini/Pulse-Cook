-- ==============================================================================
-- 🛡️ PULSE&COOK — MIGRACIÓN SQL: SINCRONIZACIÓN DE EMAIL Y BÚSQUEDA DE PERFILES
-- ==============================================================================
-- Instrucciones:
-- 1. Abre tu proyecto en Supabase (https://supabase.com/dashboard).
-- 2. Ve al SQL Editor en el menú lateral izquierdo.
-- 3. Crea una "New query", pega este script completo y haz clic en "Run".
-- Es 100% idempotente (se puede ejecutar varias veces de forma segura).
--
-- Autor principal y Administrador Supremo: leanBorsini (leoborsini12@gmail.com)
-- UUID: 1afb8de4-9294-4f57-af9f-dc50b3e6e768 (y 1afb8de4-9294-4f57-af9f-dc50091cfa72)
-- ==============================================================================

-- 1. AÑADIR COLUMNA DE EMAIL A LA TABLA PROFILES SI NO EXISTE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. ACTUALIZAR EMAILS EXISTENTES DESDE auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id 
  AND (p.email IS NULL OR p.email = '' OR p.email != u.email);

-- 3. ASEGURAR DATOS CANÓNICOS DEL ADMINISTRADOR PRINCIPAL (leanBorsini)
UPDATE public.profiles
SET 
  email = 'leoborsini12@gmail.com',
  role = 'admin',
  is_banned = FALSE
WHERE id IN ('1afb8de4-9294-4f57-af9f-dc50b3e6e768', '1afb8de4-9294-4f57-af9f-dc50091cfa72')
   OR lower(username) = 'leanborsini';

-- 4. FUNCIÓN Y TRIGGER PARA SINCRONIZAR AUTOMÁTICAMENTE EL EMAIL DESDE auth.users
CREATE OR REPLACE FUNCTION public.handle_profile_email_sync()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_email_sync();

-- 5. POLÍTICAS DE LECTURA PÚBLICA / AUTENTICADA EN PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Permitir lectura de perfiles a usuarios autenticados'
  ) THEN
    CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

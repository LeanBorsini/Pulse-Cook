import { createClient } from '@supabase/supabase-js';

/**
 * URL base del proyecto Supabase.
 * Si las variables de entorno no están configuradas, se utiliza un placeholder seguro
 * para evitar que el constructor de Supabase arroje excepciones fatales en el arranque.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-pulse-cook.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy';

/**
 * Bandera booleana que indica si las credenciales de Supabase han sido provistas
 * en las variables de entorno.
 * Permite a los componentes y funciones decidir si intentan sincronizar con la nube
 * o si operan directamente sobre el motor local (`localStorage`).
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Cliente singleton de Supabase para operaciones de autenticación, base de datos y Storage.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


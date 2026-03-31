import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente "${name}" não definida no .env`);
  return value;
}

const supabaseUrl            = requireEnv("SUPABASE_URL");
const supabaseAnonKey        = requireEnv("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const BASE_AUTH_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

/**
 * Cliente padrão — usa a anon key.
 * Use para operações que respeitam as Row Level Security policies.
 */
export function createSupabaseServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, BASE_AUTH_OPTIONS);
}

/**
 * Cliente admin — usa a service role key.
 * Ignora RLS. Use apenas em serviços de servidor confiáveis.
 */
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, BASE_AUTH_OPTIONS);
}

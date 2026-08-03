import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente com a service_role key — ignora RLS. Uso restrito a rotas de
// servidor que já validaram a sessão do usuário (ex: /api/onboarding).
// NUNCA importar isso em um componente cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

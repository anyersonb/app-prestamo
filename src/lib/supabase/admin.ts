// Cliente de Supabase con SERVICE ROLE — SOLO SERVIDOR.
// ----------------------------------------------------------------------------
// Bypassa RLS para lecturas/escrituras server-side, sin depender de la sesión
// por-request (que en Vercel no siempre llega al Server Component). La ruta ya
// está protegida por login (middleware), así que el acceso sigue controlado.
//
// ⚠️ NUNCA importar este archivo desde un componente cliente: la service key es
// secreta (env SIN prefijo NEXT_PUBLIC, no se inlinea al bundle del navegador).
import { createClient } from "@supabase/supabase-js";

export const HAS_SERVICE_ROLE = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

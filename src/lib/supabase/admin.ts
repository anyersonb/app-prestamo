// Cliente de Supabase con SERVICE ROLE — SOLO SERVIDOR.
// ----------------------------------------------------------------------------
// Bypassa RLS para lecturas/escrituras server-side, sin depender de la sesión
// por-request (que en Vercel no siempre llega al Server Component). La ruta ya
// está protegida por login (middleware), así que el acceso sigue controlado.
//
// ⚠️ NUNCA importar este archivo desde un componente cliente: la service key es
// secreta (env SIN prefijo NEXT_PUBLIC, no se inlinea al bundle del navegador).
import { createClient } from "@supabase/supabase-js";

// @supabase/supabase-js >=2.110 exige WebSocket nativo al construir el cliente
// (para realtime), disponible solo en Node 22+. En Node 20 (runtime de algunas
// funciones de Vercel) createClient() lanza "native WebSocket not found" y
// getDataset() cae a mock. Como en el servidor NUNCA usamos realtime (solo
// lecturas/escrituras REST), damos un stub de WebSocket si no existe. Así el
// cliente funciona en cualquier versión de Node. En Node 22 ya hay WebSocket
// nativo y este stub no se usa.
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = class {
    constructor() {
      throw new Error("Realtime deshabilitado en el servidor (solo REST).");
    }
  };
}

export const HAS_SERVICE_ROLE = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

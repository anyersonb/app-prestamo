// Capa de acceso a datos.
// ----------------------------------------------------------------------------
// getDataset() devuelve el conjunto de datos para el dashboard:
//   - Si hay credenciales de Supabase -> lee de la base de datos real.
//   - Si no -> usa el mock (Control_Prestamos.xlsx) para no romper la demo.
// Ambos devuelven la MISMA estructura (Dataset), así finance.ts no cambia.
// ----------------------------------------------------------------------------

import type { Dataset } from "./finance";
import type { Cliente, Config, Pago, Prestamo } from "./types";
import { clientes as mockClientes, config as mockConfig, HOY, pagos as mockPagos, prestamos as mockPrestamos } from "./mock-data";
import { createClient } from "./supabase/server";
import { createAdminClient, HAS_SERVICE_ROLE } from "./supabase/admin";

export const HAS_SUPABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMockDataset(): Dataset {
  return {
    clientes: mockClientes,
    prestamos: mockPrestamos,
    pagos: mockPagos,
    config: mockConfig,
    hoy: HOY,
  };
}

export async function getDataset(): Promise<Dataset> {
  if (!HAS_SUPABASE) return getMockDataset();

  try {
    // Preferir service-role (bypassa RLS, no depende de la sesión por-request,
    // fiable en Vercel). Fallback al cliente de sesión si no hay service key.
    const supabase = HAS_SERVICE_ROLE ? createAdminClient() : createClient();
    const [clientesRes, prestamosRes, pagosRes, configRes] = await Promise.all([
      supabase.from("clientes").select("*"),
      supabase.from("prestamos").select("*"),
      supabase.from("pagos").select("*"),
      supabase.from("config").select("*").eq("id", 1).maybeSingle(),
    ]);

    // Si aún no hay datos o no se pudo leer, caemos al mock (resiliencia).
    if (
      clientesRes.error ||
      prestamosRes.error ||
      pagosRes.error ||
      !configRes.data
    ) {
      return getMockDataset();
    }

    const clientes: Cliente[] = (clientesRes.data ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      dni: c.dni,
      celular: c.celular,
      direccion: c.direccion,
      trabajo: c.trabajo,
      empresa: c.empresa,
      referido_por: c.referido_por,
      score: Number(c.score),
      observaciones: c.observaciones,
    }));

    const prestamos: Prestamo[] = (prestamosRes.data ?? []).map((p) => ({
      id: p.id,
      cliente_id: p.cliente_id,
      capital: Number(p.capital),
      moneda: p.moneda,
      tasa_interes: Number(p.tasa_interes),
      interes_mensual: Number(p.interes_mensual),
      dia_pago: Number(p.dia_pago),
      fecha_inicio: p.fecha_inicio,
      estado: p.estado,
      capital_pendiente: Number(p.capital_pendiente),
    }));

    const pagos: Pago[] = (pagosRes.data ?? []).map((pg) => ({
      id: pg.id,
      prestamo_id: pg.prestamo_id,
      cliente_id: pg.cliente_id,
      fecha: pg.fecha,
      monto: Number(pg.monto),
      moneda: pg.moneda,
      tipo: pg.tipo,
    }));

    const cfg = configRes.data;
    const config: Config = {
      tipo_cambio: Number(cfg.tipo_cambio),
      aporte_inicial: Number(cfg.aporte_inicial),
      deuda_carro_total: Number(cfg.deuda_carro_total),
      amortizacion_carro: Number(cfg.amortizacion_carro ?? 0),
      ajuste_caja: Number(cfg.ajuste_caja ?? 0),
      distribucion: {
        carro: Number(cfg.pct_carro),
        reinversion: Number(cfg.pct_reinversion),
        ahorro: Number(cfg.pct_ahorro),
        gastos: Number(cfg.pct_gastos),
      },
    };

    return { clientes, prestamos, pagos, config, hoy: hoyISO() };
  } catch {
    return getMockDataset();
  }
}

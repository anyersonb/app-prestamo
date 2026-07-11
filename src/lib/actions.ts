"use server";

// ============================================================================
// SERVER ACTIONS — capa de ESCRITURA del negocio (Fase 2)
// ----------------------------------------------------------------------------
// Insertan/actualizan en Supabase usando la sesión AUTENTICADA (cookie). La RLS
// permite todo a usuarios autenticados, así que estas acciones solo corren si
// hay sesión válida (requireUser lanza si no). Tras escribir, revalidan "/" para
// que el dashboard recalcule con finance.ts (que deriva TODO de los datos crudos).
// ============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import { createAdminClient, HAS_SERVICE_ROLE } from "./supabase/admin";
import type { Moneda } from "./types";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Verifica que haya sesión (autorización) y devuelve el cliente para ESCRIBIR:
// service-role si está disponible (bypassa RLS, fiable en Vercel), si no el de
// sesión. La autorización sigue exigiendo estar logueado.
async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida. Vuelve a iniciar sesión.");
  return HAS_SERVICE_ROLE ? createAdminClient() : supabase;
}

// ----------------------------------------------------------------------------
// REGISTRAR COBRO — la operación diaria. Registra el interés cobrado de un
// préstamo (y opcionalmente devolución de capital, que regresa 100% a la Caja).
// El interés es "distribuible" (60/25/10/5); el capital baja capital_pendiente
// y si llega a 0, el préstamo pasa a "pagado".
// ----------------------------------------------------------------------------
export async function registrarCobro(input: {
  prestamoId: string;
  clienteId: string;
  moneda: Moneda;
  montoInteres: number;
  montoCapital: number;
  fecha: string; // YYYY-MM-DD
}): Promise<ActionResult> {
  try {
    const supabase = await requireUser();

    const interes = Number(input.montoInteres) || 0;
    const capital = Number(input.montoCapital) || 0;
    if (interes <= 0 && capital <= 0) {
      return { ok: false, error: "Ingresa un monto de interés o de capital." };
    }

    const rows = [];
    if (interes > 0) {
      rows.push({
        prestamo_id: input.prestamoId,
        cliente_id: input.clienteId,
        fecha: input.fecha,
        monto: interes,
        moneda: input.moneda,
        tipo: "interes" as const,
      });
    }
    if (capital > 0) {
      rows.push({
        prestamo_id: input.prestamoId,
        cliente_id: input.clienteId,
        fecha: input.fecha,
        monto: capital,
        moneda: input.moneda,
        tipo: "capital" as const,
      });
    }

    const { error: insErr } = await supabase.from("pagos").insert(rows);
    if (insErr) return { ok: false, error: insErr.message };

    // Si hubo devolución de capital, actualizar el préstamo.
    if (capital > 0) {
      const { data: prest } = await supabase
        .from("prestamos")
        .select("capital_pendiente")
        .eq("id", input.prestamoId)
        .single();
      const pendienteActual = Number(prest?.capital_pendiente ?? 0);
      const nuevoPendiente = Math.max(0, pendienteActual - capital);
      const update: Record<string, unknown> = {
        capital_pendiente: nuevoPendiente,
        updated_at: new Date().toISOString(),
      };
      if (nuevoPendiente <= 0) update.estado = "pagado";
      const { error: updErr } = await supabase
        .from("prestamos")
        .update(update)
        .eq("id", input.prestamoId);
      if (updErr) return { ok: false, error: updErr.message };

      // Movimiento de caja: el capital recuperado vuelve íntegro a la Caja.
      await supabase.from("movimientos_caja").insert({
        fecha: input.fecha,
        tipo: "capital_recuperado",
        monto: input.moneda === "USD" ? capital : capital, // consolidado se calcula en finance
        prestamo_id: input.prestamoId,
        descripcion: "Devolución de capital",
      });
    }

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

// ----------------------------------------------------------------------------
// AJUSTAR CAJA — reconciliar el efectivo REAL con el valor derivado. Guarda un
// delta en config.ajuste_caja tal que la Caja mostrada pase a `real`. No toca
// ROI ni intereses. newAjuste = ajusteActual + (real − cajaMostradaActual).
// ----------------------------------------------------------------------------
export async function ajustarCaja(input: {
  real: number;
  cajaActual: number; // caja mostrada actual (ya incluye el ajuste vigente)
  ajusteActual: number;
}): Promise<ActionResult> {
  try {
    const supabase = await requireUser();
    const real = Number(input.real);
    if (!Number.isFinite(real)) {
      return { ok: false, error: "Ingresa un monto válido." };
    }
    const nuevoAjuste = Number(
      (input.ajusteActual + (real - input.cajaActual)).toFixed(2),
    );
    const { error } = await supabase
      .from("config")
      .update({ ajuste_caja: nuevoAjuste })
      .eq("id", 1);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

// ----------------------------------------------------------------------------
// CREAR CLIENTE
// ----------------------------------------------------------------------------
export async function crearCliente(input: {
  nombre: string;
  dni?: string;
  celular?: string;
  direccion?: string;
  trabajo?: string;
  empresa?: string;
  referido_por?: string;
  score: number;
  observaciones?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await requireUser();
    const nombre = input.nombre?.trim();
    if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
    const score = Math.min(5, Math.max(1, Number(input.score) || 3));

    const { error } = await supabase.from("clientes").insert({
      nombre,
      dni: input.dni?.trim() || null,
      celular: input.celular?.trim() || null,
      direccion: input.direccion?.trim() || null,
      trabajo: input.trabajo?.trim() || null,
      empresa: input.empresa?.trim() || null,
      referido_por: input.referido_por?.trim() || null,
      score,
      observaciones: input.observaciones?.trim() || null,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

// ----------------------------------------------------------------------------
// CREAR PRÉSTAMO — interes_mensual = capital * tasa%. capital_pendiente arranca
// igual al capital (nada ha regresado a Caja aún).
// ----------------------------------------------------------------------------
export async function crearPrestamo(input: {
  clienteId: string;
  capital: number;
  moneda: Moneda;
  tasaInteres: number;
  diaPago: number;
  fechaInicio: string; // YYYY-MM-DD
}): Promise<ActionResult> {
  try {
    const supabase = await requireUser();
    const capital = Number(input.capital) || 0;
    const tasa = Number(input.tasaInteres) || 0;
    if (!input.clienteId) return { ok: false, error: "Selecciona un cliente." };
    if (capital <= 0) return { ok: false, error: "El capital debe ser mayor a 0." };

    const interesMensual = Number((capital * (tasa / 100)).toFixed(2));
    const diaPago = Math.min(28, Math.max(1, Number(input.diaPago) || 1));

    const { error } = await supabase.from("prestamos").insert({
      cliente_id: input.clienteId,
      capital,
      moneda: input.moneda,
      tasa_interes: tasa,
      interes_mensual: interesMensual,
      dia_pago: diaPago,
      fecha_inicio: input.fechaInicio,
      estado: "activo",
      capital_pendiente: capital,
    });
    if (error) return { ok: false, error: error.message };

    // Movimiento de caja: préstamo colocado (salida de Caja).
    await supabase.from("movimientos_caja").insert({
      fecha: input.fechaInicio,
      tipo: "prestamo_colocado",
      monto: capital,
      descripcion: "Desembolso de préstamo",
    });

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

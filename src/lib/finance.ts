// ============================================================================
// finance.ts — MOTOR DE DECISIONES DEL NEGOCIO
// ----------------------------------------------------------------------------
// Funciones PURAS que calculan todos los indicadores del dashboard a partir de
// clientes/préstamos/pagos. No es un CRM: cada función responde una pregunta de
// negocio (¿cuánto gané?, ¿tengo liquidez?, ¿quién me debe hoy?).
//
// REGLAS DE ORO (no negociables):
//  - Solo los INTERESES se distribuyen. El capital recuperado vuelve 100% a Caja.
//  - Distribución de intereses: 60% carro / 25% reinversión / 10% ahorro / 5% gastos.
//  - El fondo del carro es independiente y NUNCA se usa para prestar.
// ============================================================================

import { config, clientes, pagos, prestamos, HOY } from "./mock-data";
import type { MonthlyStat, Pago, Prestamo } from "./types";

const TC = config.tipo_cambio;
const D = config.distribucion;

/** Convierte cualquier monto a PEN para consolidar. */
export function toPEN(monto: number, moneda: string): number {
  return moneda === "USD" ? monto * TC : monto;
}

const [HOY_Y, HOY_M, HOY_D] = HOY.split("-").map(Number);
const ym = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return y * 12 + (m - 1);
};
const HOY_YM = HOY_Y * 12 + (HOY_M - 1);

// ---------------------------------------------------------------------------
// Helpers base
// ---------------------------------------------------------------------------

const pagosInteres = pagos.filter((p) => p.tipo === "interes");

function pagosDelMes(year: number, month: number): Pago[] {
  return pagos.filter((p) => {
    const [y, m] = p.fecha.split("-").map(Number);
    return y === year && m === month;
  });
}

/** ¿Este préstamo ya pagó su interés en el mes dado? */
export function pagoRegistrado(prestamoId: string, year: number, month: number): boolean {
  return pagos.some((p) => {
    if (p.prestamo_id !== prestamoId || p.tipo !== "interes") return false;
    const [y, m] = p.fecha.split("-").map(Number);
    return y === year && m === month;
  });
}

/** Capital colocado (pendiente de devolución) en PEN al día de hoy. */
export function capitalColocado(): number {
  return prestamos
    .filter((p) => p.estado !== "pagado")
    .reduce((s, p) => s + toPEN(p.capital_pendiente, p.moneda), 0);
}

/** Capital que ya regresó a la Caja (devoluciones de capital). */
export function capitalRecuperado(): number {
  return pagos
    .filter((p) => p.tipo === "capital")
    .reduce((s, p) => s + toPEN(p.monto, p.moneda), 0);
}

/** Intereses cobrados acumulados (histórico) en PEN. */
export function interesesCobradosAcum(): number {
  return pagosInteres.reduce((s, p) => s + toPEN(p.monto, p.moneda), 0);
}

/** Intereses cobrados en un mes específico (PEN). */
export function interesesCobradosMes(year: number, month: number): number {
  return pagosDelMes(year, month)
    .filter((p) => p.tipo === "interes")
    .reduce((s, p) => s + toPEN(p.monto, p.moneda), 0);
}

/** Intereses que faltan cobrar este mes (préstamos activos que aún no pagan). */
export function interesesPendientesMes(): number {
  return prestamos
    .filter((p) => p.estado !== "pagado")
    .filter((p) => !pagoRegistrado(p.id, HOY_Y, HOY_M))
    .reduce((s, p) => s + toPEN(p.interes_mensual, p.moneda), 0);
}

/** Capital "vivo" colocado a fin de un mes dado (para promedio del mes). */
function capitalColocadoAlMes(year: number, month: number): number {
  const limite = year * 12 + (month - 1);
  return prestamos
    .filter((p) => ym(p.fecha_inicio) <= limite)
    .reduce((s, p) => s + toPEN(p.capital_pendiente, p.moneda), 0);
}

// ---------------------------------------------------------------------------
// Distribución de intereses (60/25/10/5)
// ---------------------------------------------------------------------------

export function distribucionIntereses() {
  const total = interesesCobradosAcum();
  return {
    total,
    carro: total * D.carro,
    reinversion: total * D.reinversion,
    ahorro: total * D.ahorro,
    gastos: total * D.gastos,
  };
}

// ---------------------------------------------------------------------------
// Caja / Liquidez  (la Caja es SOLO el fondo de inversión)
// ---------------------------------------------------------------------------

/**
 * Caja disponible para prestar =
 *   aporte inicial
 * − capital colocado (salió a préstamos)
 * + capital recuperado (regresó íntegro)
 * + 25% de intereses cobrados (reinversión — única parte que se queda en Caja)
 * El 60/10/5 (carro/ahorro/gastos) YA salió de la Caja.
 */
export function cajaDisponible(): number {
  const colocadoOriginal = prestamos.reduce(
    (s, p) => s + toPEN(p.capital, p.moneda),
    0,
  );
  return (
    config.aporte_inicial -
    colocadoOriginal +
    capitalRecuperado() +
    interesesCobradosAcum() * D.reinversion
  );
}

/** % del capital total que está líquido en Caja vs. prestado. */
export function liquidez(): number {
  const caja = cajaDisponible();
  const total = caja + capitalColocado();
  return total > 0 ? (caja / total) * 100 : 0;
}

/** Umbral bajo el cual encendemos la alerta de liquidez. */
export const UMBRAL_LIQUIDEZ = 15;

// ---------------------------------------------------------------------------
// Fondo del carro (independiente — nunca presta)
// ---------------------------------------------------------------------------

export function fondoCarro() {
  const amortizado = interesesCobradosAcum() * D.carro;
  const restante = Math.max(0, config.deuda_carro_total - amortizado);
  const avance = config.deuda_carro_total > 0
    ? (amortizado / config.deuda_carro_total) * 100
    : 0;
  return { amortizado, restante, avance, total: config.deuda_carro_total };
}

// ---------------------------------------------------------------------------
// Rentabilidad
// ---------------------------------------------------------------------------

/** Rentabilidad de un mes = intereses cobrados / capital colocado promedio. */
export function rentabilidadMes(year: number, month: number): number {
  const cobrado = interesesCobradosMes(year, month);
  const colocado = capitalColocadoAlMes(year, month);
  return colocado > 0 ? (cobrado / colocado) * 100 : 0;
}

/** ROI acumulado = intereses cobrados / capital aportado. */
export function roiAcumulado(): number {
  return config.aporte_inicial > 0
    ? (interesesCobradosAcum() / config.aporte_inicial) * 100
    : 0;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export function conteoClientes() {
  const activos = new Set<string>();
  const morosos = new Set<string>();
  for (const p of prestamos) {
    if (p.estado === "moroso") morosos.add(p.cliente_id);
    else if (p.estado === "activo") activos.add(p.cliente_id);
  }
  // Un cliente con al menos un préstamo moroso cuenta como moroso.
  morosos.forEach((id) => activos.delete(id));
  return { activos: activos.size, morosos: morosos.size, total: clientes.length };
}

// ---------------------------------------------------------------------------
// Patrimonio neto
// ---------------------------------------------------------------------------

/**
 * Patrimonio neto estimado =
 *   Caja + Cartera colocada + Ahorro acumulado − Deuda del carro restante.
 * (El valor del carro no se contabiliza; criterio conservador.)
 */
export function patrimonioNeto(): number {
  const ahorro = interesesCobradosAcum() * D.ahorro;
  return (
    cajaDisponible() +
    capitalColocado() +
    ahorro -
    fondoCarro().restante
  );
}

// ---------------------------------------------------------------------------
// Estadísticas mensuales (monthly_stats) — últimos 12 meses
// ---------------------------------------------------------------------------

const MESES_ABBR = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Set", "Oct", "Nov", "Dic",
];

export function monthlyStats(meses = 12): MonthlyStat[] {
  const out: MonthlyStat[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const idx = HOY_YM - i;
    const year = Math.floor(idx / 12);
    const month = (idx % 12) + 1;

    const interesesCobrados = interesesCobradosMes(year, month);
    const capitalColocadoPromedio = capitalColocadoAlMes(year, month);
    const capitalNuevo = prestamos
      .filter((p) => ym(p.fecha_inicio) === idx)
      .reduce((s, p) => s + toPEN(p.capital, p.moneda), 0);
    const capitalRecuperadoMes = pagosDelMes(year, month)
      .filter((p) => p.tipo === "capital")
      .reduce((s, p) => s + toPEN(p.monto, p.moneda), 0);

    const rentabilidad =
      capitalColocadoPromedio > 0
        ? (interesesCobrados / capitalColocadoPromedio) * 100
        : 0;

    // Mora del mes: % de préstamos vivos que NO pagaron ese mes.
    const vivos = prestamos.filter((p) => ym(p.fecha_inicio) <= idx && p.estado !== "pagado");
    const impagos = vivos.filter((p) => !pagoRegistrado(p.id, year, month)).length;
    const mora = vivos.length > 0 ? (impagos / vivos.length) * 100 : 0;

    out.push({
      label: `${MESES_ABBR[month - 1]} ${String(year).slice(2)}`,
      year,
      month,
      interesesCobrados,
      capitalColocadoPromedio,
      capitalNuevo,
      capitalRecuperado: capitalRecuperadoMes,
      rentabilidad,
      rentabilidadAnualizada: rentabilidad * 12,
      mora,
    });
  }
  return out;
}

/**
 * Comparativa de rentabilidad del mes de REFERENCIA vs. el mes anterior.
 * El mes de referencia = el mes en curso si ya tuvo cobros; si aún no
 * (ej: inicio de mes), usa el último mes cerrado con cobros. Así el KPI
 * refleja el rendimiento real del negocio y no un "0%" por ser día 9.
 */
export function comparativaMoM() {
  const stats = monthlyStats(12);
  let refIdx = stats.length - 1;
  for (let i = stats.length - 1; i >= 0; i--) {
    if (stats[i].interesesCobrados > 0) {
      refIdx = i;
      break;
    }
  }
  const actual = stats[refIdx];
  const anterior = stats[refIdx - 1];
  const delta = (actual?.rentabilidad ?? 0) - (anterior?.rentabilidad ?? 0);
  return {
    actual: actual?.rentabilidad ?? 0,
    anterior: anterior?.rentabilidad ?? 0,
    delta,
    subio: delta >= 0,
    mesLabel: actual?.label ?? "",
    interesesRef: actual?.interesesCobrados ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Interés promedio pactado en la cartera activa
// ---------------------------------------------------------------------------

export function interesPromedioCartera(): number {
  const activos = prestamos.filter((p) => p.estado !== "pagado");
  if (!activos.length) return 0;
  return activos.reduce((s, p) => s + p.tasa_interes, 0) / activos.length;
}

// ---------------------------------------------------------------------------
// Calendario de cobros
// ---------------------------------------------------------------------------

export type EstadoCobro = "vencido" | "hoy" | "proximo";

export interface CobroDia {
  prestamo: Prestamo;
  clienteNombre: string;
  fecha: string; // YYYY-MM-DD del cobro este mes
  monto: number; // interés a cobrar (PEN)
  moneda: string;
  montoOriginal: number;
  estado: EstadoCobro;
  pagado: boolean;
}

/** Agenda de cobros del mes actual: quién paga hoy, mañana, o está vencido. */
export function calendarioCobros(): CobroDia[] {
  const nombre = new Map(clientes.map((c) => [c.id, c.nombre]));
  const out: CobroDia[] = [];

  for (const p of prestamos) {
    if (p.estado === "pagado") continue;
    const dia = Math.min(p.dia_pago, 28);
    const fecha = `${HOY_Y}-${String(HOY_M).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const pagado = pagoRegistrado(p.id, HOY_Y, HOY_M);

    let estado: EstadoCobro;
    if (dia === HOY_D) estado = "hoy";
    else if (dia < HOY_D) estado = "vencido";
    else estado = "proximo";

    out.push({
      prestamo: p,
      clienteNombre: nombre.get(p.cliente_id) ?? p.cliente_id,
      fecha,
      monto: toPEN(p.interes_mensual, p.moneda),
      moneda: p.moneda,
      montoOriginal: p.interes_mensual,
      estado,
      pagado,
    });
  }

  // Orden: vencidos sin pagar primero, luego hoy, luego próximos por día.
  const rank = (c: CobroDia) =>
    c.pagado ? 3 : c.estado === "vencido" ? 0 : c.estado === "hoy" ? 1 : 2;
  return out.sort((a, b) => rank(a) - rank(b) || a.prestamo.dia_pago - b.prestamo.dia_pago);
}

// ---------------------------------------------------------------------------
// Resumen consolidado para el dashboard (una sola llamada)
// ---------------------------------------------------------------------------

export function dashboardResumen() {
  const mom = comparativaMoM();
  return {
    cajaDisponible: cajaDisponible(),
    capitalColocado: capitalColocado(),
    capitalRecuperado: capitalRecuperado(),
    interesesMesActual: interesesCobradosMes(HOY_Y, HOY_M),
    interesesRef: mom.interesesRef,
    mesRefLabel: mom.mesLabel,
    interesesAcum: interesesCobradosAcum(),
    interesesPendientes: interesesPendientesMes(),
    rentabilidadMes: mom.actual,
    comparativaMoM: mom,
    liquidez: liquidez(),
    clientes: conteoClientes(),
    fondoCarro: fondoCarro(),
    roi: roiAcumulado(),
    patrimonioNeto: patrimonioNeto(),
    interesPromedio: interesPromedioCartera(),
    distribucion: distribucionIntereses(),
    hoy: HOY,
  };
}

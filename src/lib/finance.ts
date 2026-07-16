// ============================================================================
// finance.ts — MOTOR DE DECISIONES DEL NEGOCIO
// ----------------------------------------------------------------------------
// buildFinance(dataset) recibe los datos (mock o reales de Supabase) y devuelve
// funciones PURAS con todos los indicadores del dashboard. Así las fórmulas no
// se duplican: funcionan igual con datos de ejemplo o con la base de datos real.
//
// REGLAS DE ORO (no negociables):
//  - Solo los INTERESES se distribuyen. El capital recuperado vuelve 100% a Caja.
//  - Distribución de intereses: 60% carro / 25% reinversión / 10% ahorro / 5% gastos.
//  - El fondo del carro es independiente y NUNCA se usa para prestar.
// ============================================================================

import type { Cliente, Config, MonthlyStat, Pago, Prestamo } from "./types";

/** Umbral bajo el cual encendemos la alerta de liquidez. */
export const UMBRAL_LIQUIDEZ = 15;

export interface Dataset {
  clientes: Cliente[];
  prestamos: Prestamo[];
  pagos: Pago[];
  config: Config;
  hoy: string; // YYYY-MM-DD de referencia
  /**
   * Origen real de los datos, para no engañar a quien decide:
   *  - "supabase": datos en vivo (confiables).
   *  - "mock": no hay Supabase configurado (demo local).
   *  - "fallback": Supabase configurado PERO la lectura falló → cifras NO confiables.
   */
  source?: "supabase" | "mock" | "fallback";
}

export type EstadoCobro = "vencido" | "hoy" | "proximo";

export interface CobroDia {
  prestamo: Prestamo;
  clienteNombre: string;
  fecha: string;
  monto: number;
  moneda: string;
  montoOriginal: number;
  estado: EstadoCobro;
  pagado: boolean;
}

/** Fila de la vista "Estado de cartera / Mora": estado real + sugerencia. */
export interface CarteraMoraItem {
  prestamo: Prestamo;
  clienteNombre: string;
  dia: number;
  /** ¿Ya se registró el interés de ESTE mes? */
  interesCobradoMes: boolean;
  /** El día de pago ya pasó este mes. */
  diaPasado: boolean;
  /** El día de pago es hoy. */
  diaHoy: boolean;
  /** Sugerencia automática: pasó el día y no se ha cobrado el interés. */
  sugerenciaMora: boolean;
  estado: Prestamo["estado"];
}

const MESES_ABBR = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Set", "Oct", "Nov", "Dic",
];

export function buildFinance(data: Dataset) {
  const { clientes, prestamos, pagos, config } = data;
  const TC = config.tipo_cambio;
  const D = config.distribucion;

  const [HOY_Y, HOY_M, HOY_D] = data.hoy.split("-").map(Number);
  const HOY_YM = HOY_Y * 12 + (HOY_M - 1);
  const ym = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    return y * 12 + (m - 1);
  };

  const toPEN = (monto: number, moneda: string) =>
    moneda === "USD" ? monto * TC : monto;

  const pagosInteres = pagos.filter((p) => p.tipo === "interes");

  const pagosDelMes = (year: number, month: number): Pago[] =>
    pagos.filter((p) => {
      const [y, m] = p.fecha.split("-").map(Number);
      return y === year && m === month;
    });

  const pagoRegistrado = (prestamoId: string, year: number, month: number) =>
    pagos.some((p) => {
      if (p.prestamo_id !== prestamoId || p.tipo !== "interes") return false;
      const [y, m] = p.fecha.split("-").map(Number);
      return y === year && m === month;
    });

  const capitalColocado = () =>
    prestamos
      .filter((p) => p.estado !== "pagado")
      .reduce((s, p) => s + toPEN(p.capital_pendiente, p.moneda), 0);

  const capitalRecuperado = () =>
    pagos
      .filter((p) => p.tipo === "capital")
      .reduce((s, p) => s + toPEN(p.monto, p.moneda), 0);

  const interesesCobradosAcum = () =>
    pagosInteres.reduce((s, p) => s + toPEN(p.monto, p.moneda), 0);

  const interesesCobradosMes = (year: number, month: number) =>
    pagosDelMes(year, month)
      .filter((p) => p.tipo === "interes")
      .reduce((s, p) => s + toPEN(p.monto, p.moneda), 0);

  const interesesPendientesMes = () =>
    prestamos
      .filter((p) => p.estado !== "pagado")
      .filter((p) => !pagoRegistrado(p.id, HOY_Y, HOY_M))
      .reduce((s, p) => s + toPEN(p.interes_mensual, p.moneda), 0);

  const capitalColocadoAlMes = (year: number, month: number) => {
    const limite = year * 12 + (month - 1);
    return prestamos
      .filter((p) => ym(p.fecha_inicio) <= limite)
      .reduce((s, p) => s + toPEN(p.capital_pendiente, p.moneda), 0);
  };

  const distribucionIntereses = () => {
    const total = interesesCobradosAcum();
    return {
      total,
      carro: total * D.carro,
      reinversion: total * D.reinversion,
      ahorro: total * D.ahorro,
      gastos: total * D.gastos,
    };
  };

  /**
   * Caja disponible = aporte inicial − capital colocado + capital recuperado
   * + 25% de intereses (reinversión, única parte que se queda en Caja).
   */
  const cajaDisponible = () => {
    const colocadoOriginal = prestamos.reduce(
      (s, p) => s + toPEN(p.capital, p.moneda),
      0,
    );
    return (
      config.aporte_inicial -
      colocadoOriginal +
      capitalRecuperado() +
      interesesCobradosAcum() * D.reinversion +
      (config.ajuste_caja ?? 0) // reconciliación manual con el efectivo real
    );
  };

  const liquidez = () => {
    const caja = cajaDisponible();
    const total = caja + capitalColocado();
    return total > 0 ? (caja / total) * 100 : 0;
  };

  /**
   * ¿Cuánto puedo prestar HOY sin que mi liquidez baje del umbral?
   * Prestar X mueve X de Caja a Capital colocado (el total caja+colocado no
   * cambia). Queremos que (caja − X) / total >= umbral, de donde:
   *   X <= caja − umbral·total
   * El cupo nunca es negativo ni mayor que la caja disponible.
   */
  const cupoPrestableHoy = () => {
    const caja = cajaDisponible();
    const total = caja + capitalColocado();
    const u = UMBRAL_LIQUIDEZ / 100;
    const cupo = Math.max(0, Math.min(caja, caja - u * total));
    return {
      cupo,
      caja,
      liquidezActual: total > 0 ? (caja / total) * 100 : 0,
      umbral: UMBRAL_LIQUIDEZ,
      // true cuando ya no hay margen: prestar cualquier cosa rompe el umbral.
      sinMargen: cupo <= 0,
    };
  };

  // Deuda REAL del carro: se reduce con los abonos manuales registrados
  // (config.amortizacion_carro), no con el 60% teórico de los intereses.
  const fondoCarro = () => {
    const total = config.deuda_carro_total;
    const amortizado = config.amortizacion_carro ?? 0;
    const restante = Math.max(0, total - amortizado);
    const avance = total > 0 ? (amortizado / total) * 100 : 0;
    return { amortizado, restante, avance, total };
  };

  const rentabilidadMes = (year: number, month: number) => {
    const cobrado = interesesCobradosMes(year, month);
    const colocado = capitalColocadoAlMes(year, month);
    return colocado > 0 ? (cobrado / colocado) * 100 : 0;
  };

  const roiAcumulado = () =>
    config.aporte_inicial > 0
      ? (interesesCobradosAcum() / config.aporte_inicial) * 100
      : 0;

  const conteoClientes = () => {
    const activos = new Set<string>();
    const morosos = new Set<string>();
    for (const p of prestamos) {
      if (p.estado === "moroso") morosos.add(p.cliente_id);
      else if (p.estado === "activo") activos.add(p.cliente_id);
    }
    morosos.forEach((id) => activos.delete(id));
    return { activos: activos.size, morosos: morosos.size, total: clientes.length };
  };

  const patrimonioNeto = () => {
    const ahorro = interesesCobradosAcum() * D.ahorro;
    return cajaDisponible() + capitalColocado() + ahorro - fondoCarro().restante;
  };

  const interesPromedioCartera = () => {
    const activos = prestamos.filter((p) => p.estado !== "pagado");
    if (!activos.length) return 0;
    return activos.reduce((s, p) => s + p.tasa_interes, 0) / activos.length;
  };

  const monthlyStats = (meses = 12): MonthlyStat[] => {
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

      const vivos = prestamos.filter(
        (p) => ym(p.fecha_inicio) <= idx && p.estado !== "pagado",
      );
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
  };

  const comparativaMoM = () => {
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
  };

  const calendarioCobros = (): CobroDia[] => {
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

    const rank = (c: CobroDia) =>
      c.pagado ? 3 : c.estado === "vencido" ? 0 : c.estado === "hoy" ? 1 : 2;
    return out.sort(
      (a, b) => rank(a) - rank(b) || a.prestamo.dia_pago - b.prestamo.dia_pago,
    );
  };

  /**
   * Estado de cartera para validar la MORA. Por cada préstamo vivo indica si ya
   * se cobró el interés del mes y sugiere "en mora" cuando el día de pago pasó
   * sin cobro. La sugerencia NO cambia nada: el dueño confirma o corrige.
   */
  const carteraMora = (): CarteraMoraItem[] => {
    const nombre = new Map(clientes.map((c) => [c.id, c.nombre]));
    return prestamos
      .filter((p) => p.estado !== "pagado")
      .map((p) => {
        const dia = Math.min(p.dia_pago, 28);
        const interesCobradoMes = pagoRegistrado(p.id, HOY_Y, HOY_M);
        const diaPasado = dia < HOY_D;
        const diaHoy = dia === HOY_D;
        return {
          prestamo: p,
          clienteNombre: nombre.get(p.cliente_id) ?? p.cliente_id,
          dia,
          interesCobradoMes,
          diaPasado,
          diaHoy,
          sugerenciaMora: diaPasado && !interesCobradoMes,
          estado: p.estado,
        };
      })
      .sort((a, b) => {
        // En mora primero, luego los sugeridos, luego al día. Empates por día.
        const rank = (x: CarteraMoraItem) =>
          x.estado === "moroso" ? 0 : x.sugerenciaMora ? 1 : 2;
        return rank(a) - rank(b) || a.dia - b.dia;
      });
  };

  const dashboardResumen = () => {
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
      cupoHoy: cupoPrestableHoy(),
      clientes: conteoClientes(),
      fondoCarro: fondoCarro(),
      roi: roiAcumulado(),
      patrimonioNeto: patrimonioNeto(),
      interesPromedio: interesPromedioCartera(),
      distribucion: distribucionIntereses(),
      hoy: data.hoy,
    };
  };

  return {
    toPEN,
    dashboardResumen,
    monthlyStats,
    calendarioCobros,
    carteraMora,
    comparativaMoM,
    fondoCarro,
    conteoClientes,
    liquidez,
    cupoPrestableHoy,
    rentabilidadMes,
  };
}

export type Finance = ReturnType<typeof buildFinance>;

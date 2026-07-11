// ============================================================================
// Tipos de dominio del negocio financiero
// ----------------------------------------------------------------------------
// Estos tipos son la "fuente de verdad" del modelo. Los usa tanto la capa mock
// como (más adelante) la capa Supabase, para que las fórmulas de finance.ts
// funcionen igual con datos de ejemplo o datos reales.
// ============================================================================

export type Moneda = "PEN" | "USD";

/** Estado operativo de un préstamo. */
export type EstadoPrestamo =
  | "activo" // vigente, generando interés
  | "moroso" // vencido sin pago del periodo
  | "pagado"; // capital devuelto por completo

/** Tipo de movimiento en la Caja (fondo de inversión). */
export type TipoMovimiento =
  | "aporte" // capital semilla / inyección de capital (entrada)
  | "capital_recuperado" // devolución de capital de un préstamo (entrada)
  | "interes_cobrado" // interés cobrado (entrada)
  | "prestamo_colocado" // desembolso de un préstamo nuevo (salida)
  | "amortizacion_carro" // 60% que va al fondo del carro (salida de caja)
  | "reinversion" // 25% que se queda disponible para prestar
  | "ahorro" // 10% que va a ahorro (salida de caja)
  | "gasto"; // 5% gastos personales (salida de caja)

export interface Cliente {
  id: string;
  nombre: string;
  dni: string | null;
  celular: string | null;
  direccion: string | null;
  trabajo: string | null;
  empresa: string | null;
  referido_por: string | null;
  /** Calificación de riesgo 1-5 estrellas (5 = paga puntual siempre). */
  score: number;
  observaciones: string | null;
}

export interface Prestamo {
  id: string;
  cliente_id: string;
  capital: number;
  moneda: Moneda;
  /** Interés % mensual pactado (ej: 20). */
  tasa_interes: number;
  /** Monto de interés mensual en la moneda del préstamo (capital * tasa%). */
  interes_mensual: number;
  /** Día del mes en que corresponde cobrar (1-28). */
  dia_pago: number;
  fecha_inicio: string; // YYYY-MM-DD
  estado: EstadoPrestamo;
  /** Capital que aún no ha regresado a la Caja. */
  capital_pendiente: number;
}

export interface Pago {
  id: string;
  prestamo_id: string;
  cliente_id: string;
  fecha: string; // YYYY-MM-DD
  monto: number;
  moneda: Moneda;
  /** "interes" (distribuible) o "capital" (vuelve íntegro a la Caja). */
  tipo: "interes" | "capital";
}

export interface MovimientoCaja {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: TipoMovimiento;
  monto: number; // siempre en PEN (consolidado)
  descripcion: string;
}

export interface Distribucion {
  carro: number;
  reinversion: number;
  ahorro: number;
  gastos: number;
}

export interface Config {
  /** Tipo de cambio USD -> PEN para consolidar KPIs. */
  tipo_cambio: number;
  /** Capital semilla aportado a la Caja. */
  aporte_inicial: number;
  /** Deuda del carro (saldo base desde que se empezó a registrar). */
  deuda_carro_total: number;
  /** Total realmente abonado al carro (pagos manuales). Saldo = total − esto. */
  amortizacion_carro?: number;
  /**
   * Ajuste manual de Caja (delta) para reconciliar el efectivo REAL con el
   * valor derivado. No afecta ROI ni intereses; solo la "Caja disponible" y el
   * patrimonio. Se mueve con futuros cobros/préstamos desde el baseline fijado.
   */
  ajuste_caja?: number;
  distribucion: Distribucion;
}

export interface Seed {
  config: Config;
  clientes: Cliente[];
  prestamos: Prestamo[];
  pagos: Pago[];
}

/** Estadísticas de un mes calendario (para monthly_stats / gráfico). */
export interface MonthlyStat {
  /** Etiqueta corta, ej "Jun 26". */
  label: string;
  year: number;
  month: number; // 1-12
  interesesCobrados: number; // PEN
  capitalColocadoPromedio: number; // PEN
  capitalNuevo: number; // PEN colocado ese mes
  capitalRecuperado: number; // PEN recuperado ese mes
  /** Rentabilidad del mes = interesesCobrados / capitalColocadoPromedio * 100. */
  rentabilidad: number;
  /** Rentabilidad anualizada estimada = rentabilidad * 12. */
  rentabilidadAnualizada: number;
  /** % de préstamos vencidos sin pago ese mes. */
  mora: number;
}

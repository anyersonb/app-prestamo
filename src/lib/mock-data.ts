// Capa de datos MOCK.
// ----------------------------------------------------------------------------
// Carga el seed generado desde el Excel real (Control_Prestamos.xlsx).
// Cuando se conecte Supabase, se reemplaza este módulo por consultas reales
// que devuelvan las MISMAS estructuras (Cliente[], Prestamo[], Pago[], Config),
// y todo finance.ts / la UI siguen funcionando sin cambios.
// ----------------------------------------------------------------------------

import seedJson from "./mock-seed.json";
import type { Cliente, Config, Pago, Prestamo, Seed } from "./types";

const seed = seedJson as unknown as Seed;

export const config: Config = seed.config;
export const clientes: Cliente[] = seed.clientes;
export const prestamos: Prestamo[] = seed.prestamos;
export const pagos: Pago[] = seed.pagos;

/** "Hoy" de referencia para el mock (alineado al ciclo del Excel: jul 2026). */
export const HOY = "2026-07-09";

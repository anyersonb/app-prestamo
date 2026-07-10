// Utilidades de formato para moneda, porcentajes y fechas (es-PE).

export function formatPEN(n: number, decimals = 0): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);
}

export function formatPct(n: number, decimals = 1): string {
  return `${(n || 0).toFixed(decimals)}%`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-PE").format(n || 0);
}

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "set", "oct", "nov", "dic",
];

/** "2026-07-09" -> "9 jul" */
export function formatFechaCorta(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

/** "2026-07-09" -> "9 jul 2026" */
export function formatFechaLarga(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

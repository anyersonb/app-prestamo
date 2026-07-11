import { Badge } from "@/components/ui/badge";
import type { CobroDia } from "@/lib/finance";
import { formatFechaCorta, formatPEN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CobrarButton } from "./cobrar-button";

const CFG: Record<string, { label: string; clase: string }> = {
  vencido: { label: "Vencido", clase: "bg-red-500/15 text-red-500 border-red-500/20" },
  hoy: { label: "Hoy", clase: "bg-amber-500/15 text-amber-500 border-amber-500/20" },
  proximo: { label: "Próximo", clase: "bg-sky-500/15 text-sky-500 border-sky-500/20" },
};

export function CalendarioCobros({ cobros, hoy }: { cobros: CobroDia[]; hoy: string }) {
  return (
    <div className="divide-y divide-border">
      {cobros.map((c) => (
        <div
          key={c.prestamo.id}
          className={cn(
            "flex items-center justify-between gap-3 py-2.5",
            c.pagado && "opacity-40",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-[10px] font-medium">
              <span className="text-sm font-bold leading-none">{c.prestamo.dia_pago}</span>
              <span className="text-muted-foreground">día</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{c.clienteNombre}</p>
              <p className="text-xs text-muted-foreground">
                {formatFechaCorta(c.fecha)} · {c.prestamo.moneda}
                {c.prestamo.moneda === "USD" ? ` $${c.montoOriginal}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold tabular-nums">{formatPEN(c.monto)}</span>
            {c.pagado ? (
              <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                Pagado
              </Badge>
            ) : (
              <>
                <Badge variant="outline" className={cn("hidden sm:inline-flex", CFG[c.estado].clase)}>
                  {CFG[c.estado].label}
                </Badge>
                <CobrarButton cobro={c} hoy={hoy} />
              </>
            )}
          </div>
        </div>
      ))}
      {cobros.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay cobros pendientes este mes.
        </p>
      )}
    </div>
  );
}

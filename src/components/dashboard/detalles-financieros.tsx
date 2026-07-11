"use client";

// Sección secundaria colapsable: agrupa las métricas más difíciles de leer de un
// vistazo (rentabilidad %, ROI, patrimonio, interés promedio). Cerrada por defecto.
import * as React from "react";
import { ChevronDown, LineChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPEN, formatPct } from "@/lib/format";

export function DetallesFinancieros({
  rentabilidadMes,
  mesLabel,
  roi,
  patrimonio,
  interesPromedio,
}: {
  rentabilidadMes: number;
  mesLabel: string;
  roi: number;
  patrimonio: number;
  interesPromedio: number;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-accent/40"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <LineChart className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Detalles financieros</p>
            <p className="text-xs text-muted-foreground">
              Rentabilidad, ROI, patrimonio e interés promedio
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {open ? "Ver menos" : "Ver más"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-4 border-t border-border p-5 sm:grid-cols-4">
          <Metric
            label="Rentabilidad del mes"
            value={formatPct(rentabilidadMes)}
            hint={mesLabel}
          />
          <Metric
            label="ROI acumulado"
            value={formatPct(roi)}
            hint="Ganancia total vs. lo invertido"
          />
          <Metric
            label="Patrimonio neto"
            value={formatPEN(patrimonio)}
            hint="Caja + cartera + ahorro − deuda"
          />
          <Metric
            label="Interés promedio"
            value={formatPct(interesPromedio, 0)}
            hint="Tasa media de la cartera"
          />
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

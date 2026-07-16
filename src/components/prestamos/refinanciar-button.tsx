"use client";

// Refinanciar con NETEO: el cliente amplía su préstamo el mismo día que paga
// interés. El modal muestra en vivo el depósito NETO a entregar (adicional −
// interés) y el nuevo capital/interés mensual resultante. Una sola operación
// registra el interés cobrado + amplía el préstamo.

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { refinanciarConNeteo } from "@/lib/actions";
import type { Prestamo } from "@/lib/types";

export function RefinanciarButton({
  prestamo,
  clienteNombre,
  hoy,
  variant = "row",
}: {
  prestamo: Prestamo;
  clienteNombre: string;
  hoy: string;
  /** "row" = ícono compacto; "full" = botón con texto. */
  variant?: "row" | "full";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [adicional, setAdicional] = React.useState("");
  const [interes, setInteres] = React.useState(String(prestamo.interes_mensual));
  const [fecha, setFecha] = React.useState(hoy);

  const simbolo = prestamo.moneda === "USD" ? "$" : "S/";
  const adic = Number(adicional) || 0;
  const inte = Number(interes) || 0;
  const neto = Math.max(0, adic - inte);
  const nuevoCapital = Number(prestamo.capital) + adic;
  const nuevoInteresMensual = nuevoCapital * (Number(prestamo.tasa_interes) / 100);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (adic <= 0) {
      toast.error("Ingresa el monto adicional que te piden.");
      return;
    }
    setSaving(true);
    const res = await refinanciarConNeteo({
      prestamoId: prestamo.id,
      montoAdicional: adic,
      montoInteres: inte,
      fecha,
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Préstamo de ${clienteNombre} ampliado`);
      setOpen(false);
      setAdicional("");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      {variant === "row" ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-sky-500 hover:text-sky-500"
          onClick={() => setOpen(true)}
          aria-label="Refinanciar con neteo"
          title="Refinanciar con neteo"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-sky-500/30 px-2 text-xs text-sky-500 hover:bg-sky-500/10 hover:text-sky-500"
          onClick={() => setOpen(true)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refinanciar
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={`Refinanciar con neteo · ${clienteNombre}`}
        description={`Debe ${simbolo} ${Number(prestamo.capital_pendiente).toLocaleString("es-PE")} · ${prestamo.moneda}`}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rf-adic">Monto que te pide ({simbolo})</Label>
            <Input
              id="rf-adic"
              type="number"
              step="0.01"
              min="0"
              value={adicional}
              onChange={(e) => setAdicional(e.target.value)}
              placeholder="Ej: 500"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rf-int">Interés que te paga hoy ({simbolo})</Label>
            <Input
              id="rf-int"
              type="number"
              step="0.01"
              min="0"
              value={interes}
              onChange={(e) => setInteres(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Interés mensual pactado: {simbolo} {prestamo.interes_mensual}. Se
              registra como cobrado (así deja de figurar vencido).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rf-fecha">Fecha</Label>
            <Input
              id="rf-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          {/* Resumen en vivo del neteo */}
          <div className="space-y-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Depósito NETO a entregar</span>
              <span className="text-base font-bold tabular-nums text-sky-500">
                {simbolo} {neto.toLocaleString("es-PE", { maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {simbolo} {adic.toLocaleString("es-PE")} que pide − {simbolo}{" "}
              {inte.toLocaleString("es-PE")} de interés que paga
            </p>
            <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
              <span>Nuevo capital del préstamo</span>
              <span className="font-medium tabular-nums text-foreground">
                {simbolo} {nuevoCapital.toLocaleString("es-PE")} · interés/mes {simbolo}{" "}
                {nuevoInteresMensual.toLocaleString("es-PE", { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Confirmar ampliación"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

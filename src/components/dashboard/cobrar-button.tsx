"use client";

// Botón "Cobrar" por cada fila del calendario. Abre un modal para registrar el
// interés cobrado (prellenado con el interés mensual del préstamo) y, opcional,
// devolución de capital. Llama a la server action y refresca el dashboard.

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrarCobro } from "@/lib/actions";
import { formatFechaCorta } from "@/lib/format";
import type { CobroDia } from "@/lib/finance";

export function CobrarButton({ cobro, hoy }: { cobro: CobroDia; hoy: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [interes, setInteres] = React.useState(String(cobro.montoOriginal));
  const [capital, setCapital] = React.useState("0");
  const [fecha, setFecha] = React.useState(hoy);

  const simbolo = cobro.moneda === "USD" ? "$" : "S/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await registrarCobro({
      prestamoId: cobro.prestamo.id,
      clienteId: cobro.prestamo.cliente_id,
      moneda: cobro.moneda as "PEN" | "USD",
      montoInteres: Number(interes),
      montoCapital: Number(capital),
      fecha,
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Cobro registrado a ${cobro.clienteNombre}`);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-emerald-500/30 px-2 text-xs text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
        onClick={() => setOpen(true)}
      >
        <HandCoins className="h-3.5 w-3.5" />
        Cobrar
      </Button>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={`Registrar cobro · ${cobro.clienteNombre}`}
        description={`Vence el ${formatFechaCorta(cobro.fecha)} · ${cobro.moneda}`}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="interes">Interés cobrado ({simbolo})</Label>
            <Input
              id="interes"
              type="number"
              step="0.01"
              min="0"
              value={interes}
              onChange={(e) => setInteres(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Interés mensual pactado: {simbolo} {cobro.montoOriginal}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capital">Capital devuelto ({simbolo}) — opcional</Label>
            <Input
              id="capital"
              type="number"
              step="0.01"
              min="0"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              El capital vuelve 100% a la Caja. Si cubre todo, el préstamo pasa a pagado.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha del cobro</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
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
              {saving ? "Guardando…" : "Registrar cobro"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

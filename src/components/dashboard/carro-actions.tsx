"use client";

// Acciones de la deuda del carro: registrar un abono real (reduce el saldo) y
// ajustar el saldo base de la deuda.
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { abonarCarro, ajustarDeudaCarro } from "@/lib/actions";
import { formatPEN } from "@/lib/format";

export function CarroActions({
  total,
  amortizado,
  restante,
}: {
  total: number;
  amortizado: number;
  restante: number;
}) {
  const router = useRouter();
  const [openAbono, setOpenAbono] = React.useState(false);
  const [openDeuda, setOpenDeuda] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [monto, setMonto] = React.useState("");
  const [nuevaDeuda, setNuevaDeuda] = React.useState(String(Math.round(total)));

  async function abonar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await abonarCarro({ monto: Number(monto), amortizadoActual: amortizado });
    setSaving(false);
    if (res.ok) {
      toast.success(`Abono de ${formatPEN(Number(monto))} registrado`);
      setMonto("");
      setOpenAbono(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function guardarDeuda(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await ajustarDeudaCarro({ total: Number(nuevaDeuda) });
    setSaving(false);
    if (res.ok) {
      toast.success("Deuda del carro actualizada");
      setOpenDeuda(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground"
        onClick={() => {
          setNuevaDeuda(String(Math.round(total)));
          setOpenDeuda(true);
        }}
        aria-label="Ajustar deuda"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
        onClick={() => setOpenAbono(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Abonar
      </Button>

      <Modal
        open={openAbono}
        onClose={() => !saving && setOpenAbono(false)}
        title="Abonar al carro"
        description={`Saldo actual: ${formatPEN(restante)}. El abono lo reduce.`}
      >
        <form onSubmit={abonar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="abono">Monto del abono (S/)</Label>
            <Input
              id="abono"
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            {Number(monto) > 0 && (
              <p className="text-xs text-muted-foreground">
                Nuevo saldo: {formatPEN(Math.max(0, restante - Number(monto)))}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpenAbono(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Registrar abono"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openDeuda}
        onClose={() => !saving && setOpenDeuda(false)}
        title="Ajustar deuda del carro"
        description="Fija el saldo base de la deuda (por si cambia o hay un error)."
      >
        <form onSubmit={guardarDeuda} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="deuda">Deuda base (S/)</Label>
            <Input
              id="deuda"
              type="number"
              step="0.01"
              min="0"
              value={nuevaDeuda}
              onChange={(e) => setNuevaDeuda(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Abonado hasta hoy: {formatPEN(amortizado)}. El avance se calcula sobre esta deuda base.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpenDeuda(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

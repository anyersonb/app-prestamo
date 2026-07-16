"use client";

// Acciones por fila de préstamo: ver amortizaciones (historial de pagos),
// editar y eliminar.
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, Pencil, Trash2, Coins, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { editarPrestamo, eliminarPrestamo, eliminarPago } from "@/lib/actions";
import { RefinanciarButton } from "@/components/prestamos/refinanciar-button";
import { formatFechaCorta, formatPEN } from "@/lib/format";
import type { Pago, Prestamo } from "@/lib/types";

export function PrestamoActions({
  prestamo,
  clienteNombre,
  pagos,
  hoy,
}: {
  prestamo: Prestamo;
  clienteNombre: string;
  pagos: Pago[];
  hoy: string;
}) {
  const [openAmort, setOpenAmort] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDel, setOpenDel] = React.useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setOpenAmort(true)}>
        <ListChecks className="h-4 w-4" />
        <span className="hidden md:inline">Amortizaciones</span>
      </Button>
      {prestamo.estado !== "pagado" && (
        <RefinanciarButton
          prestamo={prestamo}
          clienteNombre={clienteNombre}
          hoy={hoy}
          variant="row"
        />
      )}
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setOpenEdit(true)} aria-label="Editar">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
        onClick={() => setOpenDel(true)}
        aria-label="Eliminar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AmortizacionesModal
        open={openAmort}
        onClose={() => setOpenAmort(false)}
        prestamo={prestamo}
        clienteNombre={clienteNombre}
        pagos={pagos}
      />
      <EditarPrestamoModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        prestamo={prestamo}
        clienteNombre={clienteNombre}
      />
      <EliminarPrestamo
        open={openDel}
        onClose={() => setOpenDel(false)}
        prestamo={prestamo}
        clienteNombre={clienteNombre}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
function AmortizacionesModal({
  open,
  onClose,
  prestamo,
  clienteNombre,
  pagos,
}: {
  open: boolean;
  onClose: () => void;
  prestamo: Prestamo;
  clienteNombre: string;
  pagos: Pago[];
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const simbolo = prestamo.moneda === "USD" ? "$" : "S/";

  const ordenados = [...pagos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const totalInteres = pagos.filter((p) => p.tipo === "interes").reduce((s, p) => s + Number(p.monto), 0);
  const totalCapital = pagos.filter((p) => p.tipo === "capital").reduce((s, p) => s + Number(p.monto), 0);

  async function borrar(id: string) {
    setDeletingId(id);
    const res = await eliminarPago(id);
    setDeletingId(null);
    if (res.ok) {
      toast.success("Cobro eliminado");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Amortizaciones · ${clienteNombre}`}
      description={`${simbolo} ${prestamo.capital} al ${prestamo.tasa_interes}% · día ${prestamo.dia_pago}`}
      className="max-w-lg"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-emerald-500/10 p-2">
            <p className="text-xs text-muted-foreground">Interés cobrado</p>
            <p className="font-semibold text-emerald-500 tabular-nums">
              {simbolo} {totalInteres.toFixed(0)}
            </p>
          </div>
          <div className="rounded-lg bg-sky-500/10 p-2">
            <p className="text-xs text-muted-foreground">Capital devuelto</p>
            <p className="font-semibold text-sky-500 tabular-nums">
              {simbolo} {totalCapital.toFixed(0)}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-xs text-muted-foreground">Capital pendiente</p>
            <p className="font-semibold tabular-nums">
              {simbolo} {Number(prestamo.capital_pendiente).toFixed(0)}
            </p>
          </div>
        </div>

        <div className="max-h-[300px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {ordenados.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin pagos registrados todavía.
            </p>
          )}
          {ordenados.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2">
                {p.tipo === "interes" ? (
                  <Coins className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Banknote className="h-4 w-4 text-sky-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {p.tipo === "interes" ? "Interés" : "Capital"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatFechaCorta(p.fecha)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {simbolo} {Number(p.monto).toFixed(0)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-500"
                  onClick={() => borrar(p.id)}
                  disabled={deletingId === p.id}
                  aria-label="Eliminar cobro"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
function EditarPrestamoModal({
  open,
  onClose,
  prestamo,
  clienteNombre,
}: {
  open: boolean;
  onClose: () => void;
  prestamo: Prestamo;
  clienteNombre: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [capital, setCapital] = React.useState(String(prestamo.capital));
  const [moneda, setMoneda] = React.useState<"PEN" | "USD">(prestamo.moneda as "PEN" | "USD");
  const [tasa, setTasa] = React.useState(String(prestamo.tasa_interes));
  const [diaPago, setDiaPago] = React.useState(String(prestamo.dia_pago));
  const [estado, setEstado] = React.useState(prestamo.estado);
  const [pendiente, setPendiente] = React.useState(String(prestamo.capital_pendiente));

  const simbolo = moneda === "USD" ? "$" : "S/";
  const interesMensual = (Number(capital) || 0) * ((Number(tasa) || 0) / 100);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await editarPrestamo({
      id: prestamo.id,
      capital: Number(capital),
      moneda,
      tasaInteres: Number(tasa),
      diaPago: Number(diaPago),
      estado,
      capitalPendiente: Number(pendiente),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Préstamo actualizado");
      onClose();
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={`Editar préstamo · ${clienteNombre}`}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-capital">Capital</Label>
            <Input id="e-capital" type="number" step="0.01" min="0" value={capital} onChange={(e) => setCapital(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={(v) => setMoneda(v as "PEN" | "USD")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PEN">PEN (S/)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-tasa">Interés % mensual</Label>
            <Input id="e-tasa" type="number" step="0.1" min="0" value={tasa} onChange={(e) => setTasa(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-dia">Día de pago (1-28)</Label>
            <Input id="e-dia" type="number" min="1" max="28" value={diaPago} onChange={(e) => setDiaPago(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-pend">Capital pendiente</Label>
            <Input id="e-pend" type="number" step="0.01" min="0" value={pendiente} onChange={(e) => setPendiente(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="moroso">Moroso</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Interés mensual: </span>
          <span className="font-semibold tabular-nums">{simbolo} {interesMensual.toFixed(2)}</span>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
function EliminarPrestamo({
  open,
  onClose,
  prestamo,
  clienteNombre,
}: {
  open: boolean;
  onClose: () => void;
  prestamo: Prestamo;
  clienteNombre: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function confirm() {
    setLoading(true);
    const res = await eliminarPrestamo(prestamo.id);
    setLoading(false);
    if (res.ok) {
      toast.success("Préstamo eliminado");
      onClose();
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={confirm}
      loading={loading}
      title={`Eliminar préstamo de ${clienteNombre}`}
      description={`Se borrará el préstamo de ${formatPEN(prestamo.capital)} y TODOS sus pagos. Esta acción no se puede deshacer.`}
    />
  );
}

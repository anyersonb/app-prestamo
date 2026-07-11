"use client";

// Acciones de escritura en el encabezado: "Nuevo cliente" y "Nuevo préstamo".
// Cada uno abre un modal con su formulario y llama a la server action.

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ajustarCaja, crearCliente, crearPrestamo } from "@/lib/actions";
import { formatPEN } from "@/lib/format";

type ClienteOpt = { id: string; nombre: string };

export function AccionesHeader({
  clientes,
  hoy,
  cajaActual,
  ajusteActual,
}: {
  clientes: ClienteOpt[];
  hoy: string;
  cajaActual: number;
  ajusteActual: number;
}) {
  const [openCliente, setOpenCliente] = React.useState(false);
  const [openPrestamo, setOpenPrestamo] = React.useState(false);
  const [openCaja, setOpenCaja] = React.useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpenCaja(true)}>
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">Ajustar caja</span>
      </Button>
      <Button size="sm" variant="outline" onClick={() => setOpenCliente(true)}>
        <UserPlus className="h-4 w-4" />
        <span className="hidden sm:inline">Nuevo cliente</span>
      </Button>
      <Button size="sm" onClick={() => setOpenPrestamo(true)}>
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nuevo préstamo</span>
      </Button>

      <CajaForm
        open={openCaja}
        onClose={() => setOpenCaja(false)}
        cajaActual={cajaActual}
        ajusteActual={ajusteActual}
      />
      <ClienteForm open={openCliente} onClose={() => setOpenCliente(false)} />
      <PrestamoForm
        open={openPrestamo}
        onClose={() => setOpenPrestamo(false)}
        clientes={clientes}
        hoy={hoy}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
function CajaForm({
  open,
  onClose,
  cajaActual,
  ajusteActual,
}: {
  open: boolean;
  onClose: () => void;
  cajaActual: number;
  ajusteActual: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [real, setReal] = React.useState(String(Math.round(cajaActual)));

  React.useEffect(() => {
    if (open) setReal(String(Math.round(cajaActual)));
  }, [open, cajaActual]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await ajustarCaja({
      real: Number(real),
      cajaActual,
      ajusteActual,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Caja ajustada al efectivo real");
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
      title="Ajustar caja al efectivo real"
      description="Fija tu efectivo disponible real. No afecta el ROI ni los intereses."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Caja mostrada actual: </span>
          <span className="font-semibold tabular-nums">{formatPEN(cajaActual)}</span>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="caja-real">Efectivo real disponible (S/)</Label>
          <Input
            id="caja-real"
            type="number"
            step="0.01"
            value={real}
            onChange={(e) => setReal(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            De aquí en adelante la caja se moverá sola con cobros y préstamos.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Ajustar caja"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
function ClienteForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [nombre, setNombre] = React.useState("");
  const [celular, setCelular] = React.useState("");
  const [dni, setDni] = React.useState("");
  const [referido, setReferido] = React.useState("");
  const [score, setScore] = React.useState("3");
  const [obs, setObs] = React.useState("");

  function reset() {
    setNombre("");
    setCelular("");
    setDni("");
    setReferido("");
    setScore("3");
    setObs("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await crearCliente({
      nombre,
      celular,
      dni,
      referido_por: referido,
      score: Number(score),
      observaciones: obs,
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Cliente "${nombre}" agregado`);
      reset();
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
      title="Nuevo cliente"
      description="Agrega una persona a tu cartera."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="c-nombre">Nombre *</Label>
          <Input
            id="c-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre y apellido"
            autoFocus
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-celular">Celular</Label>
            <Input
              id="c-celular"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="9xx xxx xxx"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-dni">DNI</Label>
            <Input id="c-dni" value={dni} onChange={(e) => setDni(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-ref">Referido por</Label>
            <Input
              id="c-ref"
              value={referido}
              onChange={(e) => setReferido(e.target.value)}
              placeholder="Quién lo trajo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Score (riesgo)</Label>
            <Select value={score} onValueChange={setScore}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 ★ (riesgo alto)</SelectItem>
                <SelectItem value="2">2 ★★</SelectItem>
                <SelectItem value="3">3 ★★★</SelectItem>
                <SelectItem value="4">4 ★★★★</SelectItem>
                <SelectItem value="5">5 ★★★★★ (paga puntual)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-obs">Observaciones</Label>
          <Input
            id="c-obs"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Notas opcionales"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Agregar cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
function PrestamoForm({
  open,
  onClose,
  clientes,
  hoy,
}: {
  open: boolean;
  onClose: () => void;
  clientes: ClienteOpt[];
  hoy: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [clienteId, setClienteId] = React.useState("");
  const [capital, setCapital] = React.useState("");
  const [moneda, setMoneda] = React.useState<"PEN" | "USD">("PEN");
  const [tasa, setTasa] = React.useState("20");
  const [diaPago, setDiaPago] = React.useState("1");
  const [fechaInicio, setFechaInicio] = React.useState(hoy);

  const capitalNum = Number(capital) || 0;
  const tasaNum = Number(tasa) || 0;
  const interesMensual = capitalNum * (tasaNum / 100);
  const simbolo = moneda === "USD" ? "$" : "S/";

  function reset() {
    setClienteId("");
    setCapital("");
    setMoneda("PEN");
    setTasa("20");
    setDiaPago("1");
    setFechaInicio(hoy);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await crearPrestamo({
      clienteId,
      capital: capitalNum,
      moneda,
      tasaInteres: tasaNum,
      diaPago: Number(diaPago),
      fechaInicio,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Préstamo registrado");
      reset();
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
      title="Nuevo préstamo"
      description="Coloca capital a un cliente de tu cartera."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Cliente *</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-capital">Capital *</Label>
            <Input
              id="p-capital"
              type="number"
              step="0.01"
              min="0"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={(v) => setMoneda(v as "PEN" | "USD")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PEN">PEN (S/)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-tasa">Interés % mensual</Label>
            <Input
              id="p-tasa"
              type="number"
              step="0.1"
              min="0"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-dia">Día de pago (1-28)</Label>
            <Input
              id="p-dia"
              type="number"
              min="1"
              max="28"
              value={diaPago}
              onChange={(e) => setDiaPago(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-fecha">Fecha de inicio</Label>
          <Input
            id="p-fecha"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Interés mensual estimado: </span>
          <span className="font-semibold tabular-nums">
            {simbolo} {interesMensual.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Registrar préstamo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

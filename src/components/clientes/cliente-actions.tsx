"use client";

// Acciones por fila de cliente: editar y eliminar.
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
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
import { editarCliente, eliminarCliente } from "@/lib/actions";
import type { Cliente } from "@/lib/types";

export function ClienteActions({ cliente }: { cliente: Cliente }) {
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDel, setOpenDel] = React.useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
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

      <EditarClienteModal open={openEdit} onClose={() => setOpenEdit(false)} cliente={cliente} />
      <EliminarCliente open={openDel} onClose={() => setOpenDel(false)} cliente={cliente} />
    </div>
  );
}

// ---------------------------------------------------------------------------
function EditarClienteModal({
  open,
  onClose,
  cliente,
}: {
  open: boolean;
  onClose: () => void;
  cliente: Cliente;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [nombre, setNombre] = React.useState(cliente.nombre);
  const [celular, setCelular] = React.useState(cliente.celular ?? "");
  const [dni, setDni] = React.useState(cliente.dni ?? "");
  const [referido, setReferido] = React.useState(cliente.referido_por ?? "");
  const [score, setScore] = React.useState(String(cliente.score));
  const [obs, setObs] = React.useState(cliente.observaciones ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await editarCliente({
      id: cliente.id,
      nombre,
      celular,
      dni,
      referido_por: referido,
      score: Number(score),
      observaciones: obs,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Cliente actualizado");
      onClose();
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Modal open={open} onClose={() => !saving && onClose()} title={`Editar · ${cliente.nombre}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ec-nombre">Nombre *</Label>
          <Input id="ec-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ec-celular">Celular</Label>
            <Input id="ec-celular" value={celular} onChange={(e) => setCelular(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-dni">DNI</Label>
            <Input id="ec-dni" value={dni} onChange={(e) => setDni(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ec-ref">Referido por</Label>
            <Input id="ec-ref" value={referido} onChange={(e) => setReferido(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Score</Label>
            <Select value={score} onValueChange={setScore}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 ★</SelectItem>
                <SelectItem value="2">2 ★★</SelectItem>
                <SelectItem value="3">3 ★★★</SelectItem>
                <SelectItem value="4">4 ★★★★</SelectItem>
                <SelectItem value="5">5 ★★★★★</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ec-obs">Observaciones</Label>
          <Input id="ec-obs" value={obs} onChange={(e) => setObs(e.target.value)} />
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
function EliminarCliente({
  open,
  onClose,
  cliente,
}: {
  open: boolean;
  onClose: () => void;
  cliente: Cliente;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function confirm() {
    setLoading(true);
    const res = await eliminarCliente(cliente.id);
    setLoading(false);
    if (res.ok) {
      toast.success("Cliente eliminado");
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
      title={`Eliminar a ${cliente.nombre}`}
      description="Se borrará el cliente. Si tiene préstamos, primero debes eliminarlos."
    />
  );
}

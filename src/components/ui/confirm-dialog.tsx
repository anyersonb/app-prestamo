"use client";

// Diálogo de confirmación para acciones destructivas. Reutiliza Modal.
import * as React from "react";
import { Modal } from "./modal";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Eliminar",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={() => !loading && onClose()} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={loading}>
          {loading ? "Eliminando…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

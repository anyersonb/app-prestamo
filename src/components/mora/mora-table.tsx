"use client";

// Vista "Estado de cartera / Mora". Por cada préstamo vivo muestra si ya se
// cobró el interés del mes y una SUGERENCIA automática de mora (día pasado sin
// cobro). El dueño confirma/corrige con un botón Al día ↔ En mora. También puede
// refinanciar con neteo desde aquí (registra el interés y limpia la mora sola).

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefinanciarButton } from "@/components/prestamos/refinanciar-button";
import { setEstadoPrestamo } from "@/lib/actions";
import type { CarteraMoraItem } from "@/lib/finance";

export function MoraTable({
  items,
  hoy,
}: {
  items: CarteraMoraItem[];
  hoy: string;
}) {
  const router = useRouter();
  const [savingId, setSavingId] = React.useState<string | null>(null);

  async function marcar(id: string, estado: "activo" | "moroso", nombre: string) {
    setSavingId(id);
    const res = await setEstadoPrestamo({ id, estado });
    setSavingId(null);
    if (res.ok) {
      toast.success(
        estado === "moroso"
          ? `${nombre} marcado EN MORA`
          : `${nombre} marcado AL DÍA`,
      );
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay préstamos vigentes en cartera.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-center">Día</TableHead>
          <TableHead>Interés del mes</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead className="text-right">Validar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => {
          const p = it.prestamo;
          const simbolo = p.moneda === "USD" ? "$" : "S/";
          const enMora = it.estado === "moroso";
          return (
            <TableRow
              key={p.id}
              className={it.sugerenciaMora && !enMora ? "bg-amber-500/5" : undefined}
            >
              <TableCell className="font-medium">{it.clienteNombre}</TableCell>
              <TableCell className="text-center tabular-nums">{it.dia}</TableCell>

              <TableCell>
                {it.noExigibleAun ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CircleDot className="h-4 w-4" /> Primer cobro el próximo mes
                  </span>
                ) : it.interesCobradoMes ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-500">
                    <Check className="h-4 w-4" /> Cobrado
                  </span>
                ) : it.sugerenciaMora ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-amber-500">
                    <AlertTriangle className="h-4 w-4" /> Vencido sin cobrar
                    <span className="text-muted-foreground">
                      · {simbolo} {Number(p.interes_mensual).toLocaleString("es-PE")}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CircleDot className="h-4 w-4" />
                    {it.diaHoy ? "Vence hoy" : "Por vencer"}
                    <span>
                      · {simbolo} {Number(p.interes_mensual).toLocaleString("es-PE")}
                    </span>
                  </span>
                )}
              </TableCell>

              <TableCell className="text-center">
                {enMora ? (
                  <Badge
                    variant="outline"
                    className="border-red-500/30 bg-red-500/10 text-red-500"
                  >
                    En mora
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  >
                    Al día
                  </Badge>
                )}
              </TableCell>

              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <RefinanciarButton
                    prestamo={p}
                    clienteNombre={it.clienteNombre}
                    hoy={hoy}
                    variant="row"
                  />
                  {enMora ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-emerald-500/30 px-2 text-xs text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
                      disabled={savingId === p.id}
                      onClick={() => marcar(p.id, "activo", it.clienteNombre)}
                    >
                      Marcar al día
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-red-500/30 px-2 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-500"
                      disabled={savingId === p.id}
                      onClick={() => marcar(p.id, "moroso", it.clienteNombre)}
                    >
                      Marcar en mora
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

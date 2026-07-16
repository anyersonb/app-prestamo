import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDataset, HAS_SUPABASE } from "@/lib/data";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { AccionesHeader } from "@/components/dashboard/acciones-header";
import { AppNav } from "@/components/dashboard/app-nav";
import { PrestamoActions } from "@/components/prestamos/prestamo-actions";
import { buildFinance } from "@/lib/finance";
import { formatPEN } from "@/lib/format";
import { Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

const ESTADO: Record<string, string> = {
  activo: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  moroso: "border-red-500/30 bg-red-500/10 text-red-500",
  pagado: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export default async function PrestamosPage() {
  const dataset = await getDataset();
  const r = buildFinance(dataset).dashboardResumen();
  const nombre = new Map(dataset.clientes.map((c) => [c.id, c.nombre]));
  const clienteOpts = dataset.clientes
    .map((c) => ({ id: c.id, nombre: c.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const prestamos = [...dataset.prestamos].sort((a, b) => {
    const orden = { activo: 0, moroso: 1, pagado: 2 } as Record<string, number>;
    return (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9);
  });
  const simboloDe = (m: string) => (m === "USD" ? "$" : "S/");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
            <Landmark className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Préstamos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AppNav />
          {HAS_SUPABASE && (
            <>
              <AccionesHeader
                clientes={clienteOpts}
                hoy={r.hoy}
                cajaActual={r.cajaDisponible}
                ajusteActual={dataset.config.ajuste_caja ?? 0}
              />
              <LogoutButton />
            </>
          )}
        </div>
      </header>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">
            {prestamos.length} préstamos en cartera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Capital</TableHead>
                <TableHead className="text-right">Interés/mes</TableHead>
                <TableHead className="text-center">Día</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prestamos.map((p) => {
                const s = simboloDe(p.moneda);
                const pagos = dataset.pagos.filter((pg) => pg.prestamo_id === p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {nombre.get(p.cliente_id) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s} {Number(p.capital).toLocaleString("es-PE")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s} {Number(p.interes_mensual).toLocaleString("es-PE")}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{p.dia_pago}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={ESTADO[p.estado]}>
                        {p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s} {Number(p.capital_pendiente).toLocaleString("es-PE")}
                    </TableCell>
                    <TableCell>
                      <PrestamoActions
                        prestamo={p}
                        clienteNombre={nombre.get(p.cliente_id) ?? "—"}
                        pagos={pagos}
                        hoy={r.hoy}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {prestamos.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay préstamos. Usa &quot;Nuevo préstamo&quot; para agregar.
            </p>
          )}
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        Total colocado: {formatPEN(r.capitalColocado)} · Financiera privada
      </footer>
    </div>
  );
}

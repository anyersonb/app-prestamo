import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ClienteActions } from "@/components/clientes/cliente-actions";
import { buildFinance } from "@/lib/finance";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const dataset = await getDataset();
  const r = buildFinance(dataset).dashboardResumen();
  const clienteOpts = dataset.clientes
    .map((c) => ({ id: c.id, nombre: c.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const prestamosPorCliente = new Map<string, number>();
  for (const p of dataset.prestamos) {
    if (p.estado !== "pagado") {
      prestamosPorCliente.set(p.cliente_id, (prestamosPorCliente.get(p.cliente_id) ?? 0) + 1);
    }
  }

  const clientes = [...dataset.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
            <Users className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Clientes</h1>
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
          <CardTitle className="text-base">{clientes.length} clientes en cartera</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Referido por</TableHead>
                <TableHead className="text-center">Préstamos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{c.celular ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.dni ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    {"★".repeat(c.score)}
                    <span className="text-muted-foreground">{"★".repeat(5 - c.score)}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.referido_por ?? "—"}</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {prestamosPorCliente.get(c.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    <ClienteActions cliente={c} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {clientes.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay clientes. Usa &quot;Nuevo cliente&quot; para agregar.
            </p>
          )}
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        Financiera privada · Cartera de clientes
      </footer>
    </div>
  );
}

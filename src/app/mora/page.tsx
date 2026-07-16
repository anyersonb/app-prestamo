import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDataset, HAS_SUPABASE } from "@/lib/data";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { AccionesHeader } from "@/components/dashboard/acciones-header";
import { AppNav } from "@/components/dashboard/app-nav";
import { MoraTable } from "@/components/mora/mora-table";
import { buildFinance } from "@/lib/finance";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MoraPage() {
  const dataset = await getDataset();
  const finance = buildFinance(dataset);
  const r = finance.dashboardResumen();
  const items = finance.carteraMora();

  const clienteOpts = dataset.clientes
    .map((c) => ({ id: c.id, nombre: c.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const enMora = items.filter((i) => i.estado === "moroso").length;
  const sugeridos = items.filter((i) => i.sugerenciaMora && i.estado !== "moroso").length;
  const alDia = items.length - enMora - sugeridos;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Estado de cartera</h1>
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

      {/* Resumen de conteos */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Al día</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-500">{alDia}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sugeridos en mora</p>
            <p className="text-2xl font-bold tabular-nums text-amber-500">{sugeridos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Confirmados en mora</p>
            <p className="text-2xl font-bold tabular-nums text-red-500">{enMora}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Validar mora préstamo por préstamo</CardTitle>
          <p className="text-sm text-muted-foreground">
            El sistema <span className="text-amber-500">sugiere</span> en mora cuando el
            día de pago ya pasó y no registraste el interés del mes. Tú confirmas o
            corriges. Si fue un préstamo con neteo, usa{" "}
            <span className="text-sky-500">Refinanciar</span>: registra el interés y lo
            saca de mora solo.
          </p>
        </CardHeader>
        <CardContent>
          <MoraTable items={items} hoy={r.hoy} />
        </CardContent>
      </Card>
    </div>
  );
}

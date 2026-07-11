import { KpiCard } from "@/components/dashboard/kpi-card";
import { RentabilidadChart } from "@/components/dashboard/rentabilidad-chart";
import { CalendarioCobros } from "@/components/dashboard/calendario-cobros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buildFinance, UMBRAL_LIQUIDEZ } from "@/lib/finance";
import { getDataset, HAS_SUPABASE } from "@/lib/data";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { AccionesHeader } from "@/components/dashboard/acciones-header";
import { formatFechaLarga, formatPct, formatPEN } from "@/lib/format";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Car,
  CalendarClock,
  Coins,
  HandCoins,
  Landmark,
  PiggyBank,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dataset = await getDataset();
  const clienteOpts = dataset.clientes
    .map((c) => ({ id: c.id, nombre: c.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const fin = buildFinance(dataset);
  const r = fin.dashboardResumen();
  const stats = fin.monthlyStats(12);
  const cobros = fin.calendarioCobros();
  const mom = r.comparativaMoM;
  const liquidezBaja = r.liquidez < UMBRAL_LIQUIDEZ;

  const pendientesCount = cobros.filter((c) => !c.pagado).length;
  const vencidosCount = cobros.filter((c) => !c.pagado && c.estado === "vencido").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Encabezado */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <Landmark className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Panel de decisiones</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Financiera privada · {formatFechaLarga(r.hoy)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {HAS_SUPABASE ? (
            <Badge variant="outline" className="w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
              Datos reales · Supabase
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit border-amber-500/30 bg-amber-500/10 text-amber-500">
              Datos de ejemplo (mock)
            </Badge>
          )}
          {HAS_SUPABASE && (
            <>
              <AccionesHeader clientes={clienteOpts} hoy={r.hoy} />
              <LogoutButton />
            </>
          )}
        </div>
      </header>

      {/* Alerta de liquidez */}
      {liquidezBaja && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-500">Liquidez baja</p>
            <p className="text-sm text-muted-foreground">
              Solo tienes {formatPct(r.liquidez)} de tu capital líquido en Caja (umbral {UMBRAL_LIQUIDEZ}%).
              Prioriza cobrar y frena colocaciones nuevas hasta recuperar caja.
            </p>
          </div>
        </div>
      )}

      {/* Fila 1 — Dinero */}
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titulo="Caja disponible"
          valor={formatPEN(r.cajaDisponible)}
          sub="Fondo de inversión para prestar"
          icon={Wallet}
          tono={r.cajaDisponible > 0 ? "success" : "danger"}
        />
        <KpiCard
          titulo="Capital colocado"
          valor={formatPEN(r.capitalColocado)}
          sub={`${r.clientes.activos + r.clientes.morosos} préstamos vigentes`}
          icon={Banknote}
          tono="info"
        />
        <KpiCard
          titulo="Intereses cobrados"
          valor={formatPEN(r.interesesRef)}
          sub={`${r.mesRefLabel} · Acum. ${formatPEN(r.interesesAcum)}`}
          icon={Coins}
          tono="success"
        />
        <KpiCard
          titulo="Por cobrar este mes"
          valor={formatPEN(r.interesesPendientes)}
          sub={`${pendientesCount} cobros · ${vencidosCount} vencidos`}
          icon={HandCoins}
          tono={vencidosCount > 0 ? "danger" : "warning"}
        />
      </section>

      {/* Fila 2 — Rendimiento */}
      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titulo="Rentabilidad del mes"
          valor={formatPct(r.rentabilidadMes)}
          sub={`${mom.mesLabel} (último mes con cobros)`}
          icon={TrendingUp}
          tono="success"
          trend={{
            valor: `${mom.subio ? "+" : ""}${mom.delta.toFixed(1)} pts vs. mes anterior`,
            positivo: mom.subio,
          }}
        />
        <KpiCard
          titulo="Liquidez"
          valor={formatPct(r.liquidez)}
          sub="Caja vs. capital total"
          icon={liquidezBaja ? ArrowDownRight : ArrowUpRight}
          tono={liquidezBaja ? "danger" : "info"}
        />
        <KpiCard
          titulo="Patrimonio neto"
          valor={formatPEN(r.patrimonioNeto)}
          sub="Caja + cartera + ahorro − deuda carro"
          icon={PiggyBank}
          tono="success"
        />
        <KpiCard
          titulo="ROI acumulado"
          valor={formatPct(r.roi)}
          sub={`Interés promedio cartera: ${formatPct(r.interesPromedio, 0)}`}
          icon={TrendingUp}
          tono="success"
        />
      </section>

      {/* Fila 3 — Gráfico + Calendario */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Rentabilidad mensual (últimos 12 meses)</CardTitle>
            <Badge variant="outline" className="text-xs">
              {mom.subio ? "▲" : "▼"} {formatPct(Math.abs(mom.delta))} MoM
            </Badge>
          </CardHeader>
          <CardContent>
            <RentabilidadChart data={stats} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Calendario de cobros</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            <CalendarioCobros cobros={cobros} hoy={r.hoy} />
          </CardContent>
        </Card>
      </section>

      {/* Fila 4 — Fondo carro / Distribución / Clientes */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Fondo del carro */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Fondo del carro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{formatPEN(r.fondoCarro.amortizado)}</p>
                <p className="text-xs text-muted-foreground">
                  amortizado de {formatPEN(r.fondoCarro.total)}
                </p>
              </div>
              <span className="text-sm font-semibold text-emerald-500">
                {formatPct(r.fondoCarro.avance)}
              </span>
            </div>
            <Progress value={r.fondoCarro.avance} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Falta {formatPEN(r.fondoCarro.restante)}. Se nutre del 60% de los intereses. Nunca se presta.
            </p>
          </CardContent>
        </Card>

        {/* Distribución de intereses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución de intereses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { l: "Carro (60%)", v: r.distribucion.carro, c: "bg-emerald-500" },
              { l: "Reinversión (25%)", v: r.distribucion.reinversion, c: "bg-sky-500" },
              { l: "Ahorro (10%)", v: r.distribucion.ahorro, c: "bg-violet-500" },
              { l: "Gastos (5%)", v: r.distribucion.gastos, c: "bg-amber-500" },
            ].map((row) => (
              <div key={row.l} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${row.c}`} />
                  {row.l}
                </span>
                <span className="font-medium tabular-nums">{formatPEN(row.v)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>Total distribuible</span>
              <span className="tabular-nums">{formatPEN(r.distribucion.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Clientes + capital recuperado */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Cartera de clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <p className="text-2xl font-bold text-emerald-500">{r.clientes.activos}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-3">
                <p className="text-2xl font-bold text-red-500">{r.clientes.morosos}</p>
                <p className="text-xs text-muted-foreground">Morosos</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
              <span className="text-muted-foreground">Capital recuperado</span>
              <span className="font-medium tabular-nums">{formatPEN(r.capitalRecuperado)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total clientes</span>
              <span className="font-medium tabular-nums">{r.clientes.total}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        {HAS_SUPABASE
          ? "MVP · Datos en vivo desde Supabase · Financiera privada"
          : "MVP · Datos de ejemplo desde Control_Prestamos.xlsx · Conecta Supabase para producción"}
      </footer>
    </div>
  );
}

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
import { AppNav } from "@/components/dashboard/app-nav";
import { formatFechaLarga, formatPct, formatPEN } from "@/lib/format";
import { DetallesFinancieros } from "@/components/dashboard/detalles-financieros";
import { CarroActions } from "@/components/dashboard/carro-actions";
import { cn } from "@/lib/utils";
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

  // ---- Resumen humano del mes (solo presentación, sin cálculos nuevos) ----
  const mesActual = stats[stats.length - 1];
  const mesAnterior = stats[stats.length - 2];
  const cobradoEsteMes = mesActual?.interesesCobrados ?? 0;
  const cobradoMesPasado = mesAnterior?.interesesCobrados ?? 0;
  const prev3 = stats.slice(-4, -1); // 3 meses previos al actual
  const prom3 = prev3.length
    ? prev3.reduce((s, m) => s + m.interesesCobrados, 0) / prev3.length
    : 0;
  const vencidoMonto = cobros
    .filter((c) => !c.pagado && c.estado === "vencido")
    .reduce((s, c) => s + c.monto, 0);
  const porCobrar = r.interesesPendientes;
  const esperadoMes = r.interesesMesActual + r.interesesPendientes;
  const vencidoAlto = esperadoMes > 0 && vencidoMonto / esperadoMes > 0.2;

  let semaforo = "🟡";
  let tonoResumen: "success" | "warning" | "danger" = "warning";
  if (vencidoAlto) {
    semaforo = "🔴";
    tonoResumen = "danger";
  } else if (prom3 > 0 && cobradoEsteMes >= prom3) {
    semaforo = "🟢";
    tonoResumen = "success";
  }

  let comparacion: string;
  if (cobradoMesPasado === 0) {
    comparacion = "Vas arrancando el mes";
  } else if (cobradoEsteMes > cobradoMesPasado) {
    comparacion = `Vas mejor que el mes pasado (${formatPEN(cobradoEsteMes)} vs ${formatPEN(cobradoMesPasado)})`;
  } else if (cobradoEsteMes < cobradoMesPasado) {
    comparacion = `Cobraste menos que el mes pasado (${formatPEN(cobradoEsteMes)} vs ${formatPEN(cobradoMesPasado)})`;
  } else {
    comparacion = "Vas igual que el mes pasado";
  }
  const fraseVencido =
    vencidoMonto > 0 ? `, de los cuales ${formatPEN(vencidoMonto)} ya están vencidos` : "";
  const fraseResumen = `Cobraste ${formatPEN(cobradoEsteMes)} en intereses este mes. ${comparacion}. Te faltan ${formatPEN(porCobrar)} por cobrar${fraseVencido}.`;

  const RESUMEN_STYLE: Record<string, string> = {
    success: "border-emerald-500/30 bg-emerald-500/10",
    warning: "border-amber-500/30 bg-amber-500/10",
    danger: "border-red-500/30 bg-red-500/10",
  };

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

      {/* Resumen del mes en lenguaje humano */}
      <div
        className={cn(
          "mt-5 flex items-start gap-3 rounded-xl border p-4 sm:p-5",
          RESUMEN_STYLE[tonoResumen],
        )}
      >
        <span className="text-2xl leading-none" aria-hidden="true">{semaforo}</span>
        <p className="text-sm leading-relaxed text-foreground sm:text-[15px]">
          {fraseResumen}
        </p>
      </div>

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
          valor={formatPEN(cobradoEsteMes)}
          sub={`Este mes · Acumulado ${formatPEN(r.interesesAcum)}`}
          icon={Coins}
          tono="success"
          trend={{
            valor:
              cobradoEsteMes >= cobradoMesPasado
                ? `más que el mes pasado · ${formatPEN(cobradoEsteMes)} vs ${formatPEN(cobradoMesPasado)}`
                : `menos que el mes pasado · ${formatPEN(cobradoEsteMes)} vs ${formatPEN(cobradoMesPasado)}`,
            positivo: cobradoEsteMes >= cobradoMesPasado,
          }}
        />
        <KpiCard
          titulo="Por cobrar este mes"
          valor={formatPEN(r.interesesPendientes)}
          sub={`${pendientesCount} cobros · ${vencidosCount} vencidos`}
          icon={HandCoins}
          tono={vencidosCount > 0 ? "danger" : "warning"}
        />
      </section>

      {/* Fila 2 — Liquidez (en palabras) + detalles financieros colapsables */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <KpiCard
          titulo="Liquidez"
          valor={formatPct(r.liquidez)}
          sub={`De cada S/100 invertidos, S/${Math.round(r.liquidez)} están libres para prestar hoy`}
          icon={liquidezBaja ? ArrowDownRight : ArrowUpRight}
          tono={liquidezBaja ? "danger" : "info"}
        />
        <div className="lg:col-span-3">
          <DetallesFinancieros
            rentabilidadMes={r.rentabilidadMes}
            mesLabel={mom.mesLabel}
            roi={r.roi}
            patrimonio={r.patrimonioNeto}
            interesPromedio={r.interesPromedio}
          />
        </div>
      </section>

      {/* Fila 3 — Gráfico + Calendario */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Cuánto has cobrado cada mes</CardTitle>
            <p className="text-xs text-muted-foreground">Intereses cobrados por mes (S/), últimos 12 meses</p>
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
        {/* Deuda del carro (real) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Deuda del carro</CardTitle>
            </div>
            <CarroActions
              total={r.fondoCarro.total}
              amortizado={r.fondoCarro.amortizado}
              restante={r.fondoCarro.restante}
            />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Debes</p>
                <p className="text-2xl font-bold">{formatPEN(r.fondoCarro.restante)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  de {formatPEN(r.fondoCarro.total)} · abonado {formatPEN(r.fondoCarro.amortizado)}
                </p>
              </div>
              <span className="text-sm font-semibold text-emerald-500">
                {formatPct(r.fondoCarro.avance)}
              </span>
            </div>
            <Progress value={r.fondoCarro.avance} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Cada abono que registres reduce tu deuda real del carro.
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

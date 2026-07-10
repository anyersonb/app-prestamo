"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyStat } from "@/lib/types";

interface Props {
  data: MonthlyStat[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyStat }>;
}

function TooltipContenido({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d: MonthlyStat = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-popover-foreground">{d.label}</p>
      <p className="mt-1 text-muted-foreground">
        Rentabilidad: <span className="font-medium text-emerald-500">{d.rentabilidad.toFixed(1)}%</span>
      </p>
      <p className="text-muted-foreground">
        Anualizada: <span className="font-medium">{d.rentabilidadAnualizada.toFixed(0)}%</span>
      </p>
      <p className="text-muted-foreground">
        Intereses: S/ {d.interesesCobrados.toLocaleString("es-PE")}
      </p>
      <p className="text-muted-foreground">Mora: {d.mora.toFixed(0)}%</p>
    </div>
  );
}

export function RentabilidadChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.rentabilidad), 1);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
          width={40}
        />
        <Tooltip content={<TooltipContenido />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey="rentabilidad" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.rentabilidad >= max * 0.99 ? "#10b981" : "#34d399"}
              fillOpacity={d.interesesCobrados > 0 ? 1 : 0.25}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

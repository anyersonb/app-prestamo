"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import type { MonthlyStat } from "@/lib/types";

interface Props {
  data: MonthlyStat[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyStat }>;
}

const money = (v: number) =>
  v >= 1000 ? `S/${(v / 1000).toFixed(1)}k` : `S/${Math.round(v)}`;

function TooltipContenido({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d: MonthlyStat = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-popover-foreground">{d.label}</p>
      <p className="mt-1 text-muted-foreground">
        Cobrado:{" "}
        <span className="font-medium text-emerald-500">
          S/ {d.interesesCobrados.toLocaleString("es-PE")}
        </span>
      </p>
      <p className="text-muted-foreground">
        Rentabilidad: {d.rentabilidad.toFixed(1)}%
      </p>
    </div>
  );
}

export function RentabilidadChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.interesesCobrados), 1);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 24, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<TooltipContenido />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey="interesesCobrados" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
          <LabelList
            dataKey="interesesCobrados"
            position="top"
            fontSize={10}
            fill="hsl(var(--muted-foreground))"
            formatter={(v) => {
              const n = Number(v);
              return n > 0 ? money(n) : "";
            }}
          />
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.interesesCobrados >= max * 0.99 ? "#10b981" : "#34d399"}
              fillOpacity={d.interesesCobrados > 0 ? 1 : 0.25}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

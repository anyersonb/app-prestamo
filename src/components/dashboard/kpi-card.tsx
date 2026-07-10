import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  titulo: string;
  valor: string;
  sub?: string;
  icon: LucideIcon;
  /** Acento de color: neutral por defecto. */
  tono?: "default" | "success" | "warning" | "danger" | "info";
  trend?: { valor: string; positivo: boolean };
}

const TONOS: Record<string, string> = {
  default: "text-foreground",
  success: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
  info: "text-sky-500",
};

const TONO_BG: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-amber-500/10 text-amber-500",
  danger: "bg-red-500/10 text-red-500",
  info: "bg-sky-500/10 text-sky-500",
};

export function KpiCard({ titulo, valor, sub, icon: Icon, tono = "default", trend }: KpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {titulo}
            </p>
            <p className={cn("mt-2 text-2xl font-bold tracking-tight", TONOS[tono])}>
              {valor}
            </p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
            {trend && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  trend.positivo ? "text-emerald-500" : "text-red-500",
                )}
              >
                {trend.positivo ? "▲" : "▼"} {trend.valor}
              </p>
            )}
          </div>
          <div className={cn("shrink-0 rounded-lg p-2", TONO_BG[tono])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

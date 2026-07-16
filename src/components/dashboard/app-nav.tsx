"use client";

// Navegación entre las vistas: Panel · Préstamos · Clientes.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

const LINKS = [
  { href: "/", label: "Panel" },
  { href: "/prestamos", label: "Préstamos" },
  { href: "/mora", label: "Mora" },
  { href: "/clientes", label: "Clientes" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2">
      <nav className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 text-sm">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <ThemeToggle />
    </div>
  );
}

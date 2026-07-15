"use client";

// Provider de tema (claro/oscuro) basado en next-themes.
// Aplica la clase `dark` en <html>, que activa los tokens .dark de globals.css.
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

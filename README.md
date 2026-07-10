# App Financiera — Panel de decisiones

Sistema web para administrar una financiera privada (préstamos, caja, rentabilidad).
No es un CRM: es un **sistema operativo de decisiones**. Optimiza rentabilidad,
liquidez, riesgo controlado y **patrimonio neto** — no solo el capital prestado.

## Reglas de oro del negocio
- Solo los **intereses** se distribuyen. El capital recuperado vuelve **100% a la Caja**.
- Distribución de intereses: **60% carro / 25% reinversión / 10% ahorro / 5% gastos**.
- El **fondo del carro** es independiente y **nunca** se usa para prestar.

## Stack
- **Next.js 14** (App Router) + TypeScript + Tailwind + **shadcn/ui**
- **Recharts** para el gráfico de rentabilidad
- **Supabase** (Postgres + Auth) — pendiente de conectar
- Deploy en **Vercel** desde GitHub

## Estado (MVP Fase 1)
- [x] Dashboard con datos de ejemplo (mock) desde `Control_Prestamos.xlsx`
- [x] KPIs: caja, capital colocado, intereses, rentabilidad %, comparativa MoM,
      liquidez (con alerta), morosos, fondo del carro, ROI, patrimonio neto
- [x] Gráfico de rentabilidad mensual (12 meses)
- [x] Calendario de cobros (vencido / hoy / próximo)
- [x] Esquema SQL de Supabase con comentarios de negocio (`supabase/schema.sql`)
- [ ] Conectar Supabase (auth + datos reales)
- [ ] CRUD de clientes / préstamos / pagos / caja

## Desarrollo local
```bash
npm install
npm run dev      # http://localhost:3000
```

## Variables de entorno
Copia `.env.local.example` a `.env.local` y completa con tus credenciales de Supabase.
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Arquitectura de datos
- `src/lib/types.ts` — tipos de dominio (fuente de verdad)
- `src/lib/mock-data.ts` — datos de ejemplo (se reemplaza por Supabase)
- `src/lib/finance.ts` — **motor de cálculo** (funciones puras de todos los KPIs)
- `supabase/schema.sql` — esquema de base de datos

Las fórmulas viven en `finance.ts` y funcionan igual con datos mock o reales.

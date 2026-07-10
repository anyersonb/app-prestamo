-- ============================================================================
-- ESQUEMA DE BASE DE DATOS — App Financiera (Supabase / Postgres)
-- ----------------------------------------------------------------------------
-- Cada tabla lleva un COMMENT explicando su PROPÓSITO DE NEGOCIO, no solo su
-- estructura técnica. Ejecutar en el SQL Editor de Supabase.
--
-- REGLAS DE ORO del negocio:
--   * Solo los INTERESES se distribuyen; el capital recuperado vuelve 100% a Caja.
--   * Distribución de intereses: 60% carro / 25% reinversión / 10% ahorro / 5% gastos.
--   * El fondo del carro es independiente y NUNCA se usa para prestar.
-- ============================================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- CLIENTES — el capital humano del negocio: a quién le presto y qué tan
-- confiable es. El score (1-5) es la señal de riesgo que decide si vale la pena.
-- ---------------------------------------------------------------------------
create table if not exists clientes (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  dni          text,
  celular      text,
  direccion    text,
  trabajo      text,
  empresa      text,
  referido_por text,                                   -- quién lo trajo (red de referidos)
  score        int  not null default 3 check (score between 1 and 5),
  observaciones text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table clientes is 'Personas a las que se presta. El score 1-5 mide riesgo/puntualidad y guía la decisión de volver a prestar.';

-- ---------------------------------------------------------------------------
-- PRESTAMOS — el activo que genera renta. Un cliente puede tener varios.
-- capital_pendiente es lo que aún no regresa a Caja; el interés es la ganancia.
-- ---------------------------------------------------------------------------
create table if not exists prestamos (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references clientes(id) on delete restrict,
  capital          numeric(12,2) not null check (capital > 0),
  moneda           text not null default 'PEN' check (moneda in ('PEN','USD')),
  tasa_interes     numeric(5,2) not null default 20,   -- % mensual pactado
  interes_mensual  numeric(12,2) not null,             -- capital * tasa%
  dia_pago         int not null default 1 check (dia_pago between 1 and 28),
  fecha_inicio     date not null,
  fecha_vencimiento date,
  estado           text not null default 'activo' check (estado in ('activo','moroso','pagado')),
  capital_pendiente numeric(12,2) not null,            -- capital que aún no vuelve a Caja
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table prestamos is 'Préstamos colocados. Generan interés mensual (renta). capital_pendiente = capital que todavía no regresó a la Caja.';
create index if not exists idx_prestamos_cliente on prestamos(cliente_id);
create index if not exists idx_prestamos_estado on prestamos(estado);

-- ---------------------------------------------------------------------------
-- PAGOS — historial de cobros. tipo='interes' es ganancia distribuible;
-- tipo='capital' es devolución que vuelve ÍNTEGRA a la Caja (no se distribuye).
-- ---------------------------------------------------------------------------
create table if not exists pagos (
  id          uuid primary key default gen_random_uuid(),
  prestamo_id uuid not null references prestamos(id) on delete cascade,
  cliente_id  uuid not null references clientes(id) on delete restrict,
  fecha       date not null,
  monto       numeric(12,2) not null check (monto > 0),
  moneda      text not null default 'PEN' check (moneda in ('PEN','USD')),
  tipo        text not null default 'interes' check (tipo in ('interes','capital')),
  created_at  timestamptz not null default now()
);
comment on table pagos is 'Cobros recibidos. interes = ganancia (se distribuye 60/25/10/5). capital = devolución que regresa 100% a la Caja.';
create index if not exists idx_pagos_prestamo on pagos(prestamo_id);
create index if not exists idx_pagos_fecha on pagos(fecha);

-- ---------------------------------------------------------------------------
-- MOVIMIENTOS_CAJA — el libro mayor de la LIQUIDEZ del negocio. Toda entrada
-- y salida de la Caja (fondo de inversión). Aquí se ve de dónde sale el dinero
-- para prestar. No se mezcla con ahorro, carro ni gastos personales.
-- ---------------------------------------------------------------------------
create table if not exists movimientos_caja (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null default current_date,
  tipo        text not null check (tipo in (
                'aporte','capital_recuperado','interes_cobrado',
                'prestamo_colocado','amortizacion_carro','reinversion',
                'ahorro','gasto')),
  monto       numeric(12,2) not null,                  -- en PEN (consolidado)
  prestamo_id uuid references prestamos(id) on delete set null,
  descripcion text,
  created_at  timestamptz not null default now()
);
comment on table movimientos_caja is 'Libro de caja del fondo de inversión (liquidez). Entradas: aportes, capital recuperado, 25% reinversión. Salidas: préstamos, 60% carro, 10% ahorro, 5% gastos.';
create index if not exists idx_mov_fecha on movimientos_caja(fecha);
create index if not exists idx_mov_tipo on movimientos_caja(tipo);

-- ---------------------------------------------------------------------------
-- FONDO_CARRO — objetivo financiero independiente. Se alimenta del 60% de los
-- intereses cobrados y NUNCA se usa para prestar. Mide cuánto falta para saldar
-- la deuda del carro.
-- ---------------------------------------------------------------------------
create table if not exists fondo_carro (
  id            uuid primary key default gen_random_uuid(),
  deuda_total   numeric(12,2) not null,                -- deuda a saldar
  amortizado    numeric(12,2) not null default 0,      -- acumulado aportado (60%)
  updated_at    timestamptz not null default now()
);
comment on table fondo_carro is 'Fondo aislado para saldar la deuda del carro. Se nutre del 60% de los intereses. Nunca se presta desde aquí.';

-- ---------------------------------------------------------------------------
-- CONFIG — parámetros del negocio (tipo de cambio, aporte inicial, % de
-- distribución). Una sola fila.
-- ---------------------------------------------------------------------------
create table if not exists config (
  id                 int primary key default 1 check (id = 1),
  tipo_cambio        numeric(6,3) not null default 3.75,
  aporte_inicial     numeric(12,2) not null default 0,
  deuda_carro_total  numeric(12,2) not null default 0,
  pct_carro          numeric(4,3) not null default 0.60,
  pct_reinversion    numeric(4,3) not null default 0.25,
  pct_ahorro         numeric(4,3) not null default 0.10,
  pct_gastos         numeric(4,3) not null default 0.05
);
comment on table config is 'Parámetros globales del negocio: tipo de cambio, capital semilla y porcentajes de distribución de intereses.';

-- ---------------------------------------------------------------------------
-- VISTA monthly_stats — rentabilidad y salud por mes (para el dashboard).
-- Rentabilidad del mes = intereses cobrados / capital colocado promedio * 100.
-- ---------------------------------------------------------------------------
create or replace view monthly_stats as
with meses as (
  select date_trunc('month', fecha)::date as mes,
         sum(case when tipo='interes' then monto else 0 end) as intereses_cobrados,
         sum(case when tipo='capital' then monto else 0 end) as capital_recuperado
  from pagos
  group by 1
),
colocado as (
  select m.mes,
         coalesce(sum(p.capital_pendiente),0) as capital_colocado
  from meses m
  left join prestamos p on p.fecha_inicio <= (m.mes + interval '1 month - 1 day')
  group by m.mes
)
select
  m.mes,
  m.intereses_cobrados,
  m.capital_recuperado,
  c.capital_colocado,
  case when c.capital_colocado > 0
       then round(m.intereses_cobrados / c.capital_colocado * 100, 2)
       else 0 end as rentabilidad_pct,
  case when c.capital_colocado > 0
       then round(m.intereses_cobrados / c.capital_colocado * 100 * 12, 2)
       else 0 end as rentabilidad_anualizada_pct
from meses m
join colocado c on c.mes = m.mes
order by m.mes;
comment on view monthly_stats is 'Rentabilidad mensual = intereses cobrados / capital colocado promedio. Base del gráfico de barras del dashboard.';

-- ---------------------------------------------------------------------------
-- SEGURIDAD (RLS) — MVP con un solo usuario (el dueño). Habilitamos RLS y
-- permitimos todo a usuarios autenticados. Cuando haya multiusuario, se
-- restringe por owner_id.
-- ---------------------------------------------------------------------------
alter table clientes         enable row level security;
alter table prestamos        enable row level security;
alter table pagos            enable row level security;
alter table movimientos_caja enable row level security;
alter table fondo_carro      enable row level security;
alter table config           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['clientes','prestamos','pagos','movimientos_caja','fondo_carro','config']
  loop
    execute format(
      'create policy "auth_all_%1$s" on %1$s for all to authenticated using (true) with check (true);',
      t);
  end loop;
end $$;

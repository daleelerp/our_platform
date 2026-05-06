-- Job Roles data pipeline schema (raw -> normalized -> mart)
-- Run this once in Supabase SQL editor before running the ETL script.

create extension if not exists pgcrypto;

-- job_roles already exists (see learning_paths_system_schema.sql: title, title_ar, ...).
-- Extend it for the market ETL — do not recreate the table or CREATE TABLE IF NOT EXISTS will skip.
alter table public.job_roles
  add column if not exists slug text;

alter table public.job_roles
  add column if not exists pipeline_erp_vendor text;

alter table public.job_roles
  add column if not exists updated_at timestamptz default now();

-- Unique slug for pipeline roles; PostgreSQL allows multiple NULL slugs for legacy rows.
drop index if exists public.job_roles_slug_key;
create unique index if not exists job_roles_slug_key on public.job_roles (slug);

comment on column public.job_roles.slug is 'Stable key for ETL upserts and API (e.g. sap-fico-consultant).';
comment on column public.job_roles.pipeline_erp_vendor is 'Optional vendor label from job-market pipeline (SAP, Oracle, ...).';

create table if not exists public.job_locations (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  city text not null default 'Remote',
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  unique(country_code, city)
);

-- Location buckets (ETL also upserts these). Safe to re-run.
insert into public.job_locations (country_code, city, currency)
values ('global', 'Remote', 'USD'), ('eg', 'Egypt', 'EGP')
on conflict (country_code, city) do nothing;

create table if not exists public.job_postings_raw (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  payload_json jsonb not null,
  fetched_at timestamptz not null default now(),
  unique(source, external_id)
);

create table if not exists public.job_postings_normalized (
  id uuid primary key default gen_random_uuid(),
  raw_id uuid not null references public.job_postings_raw(id) on delete cascade,
  role_id uuid not null references public.job_roles(id),
  title text not null,
  company text,
  location_id uuid not null references public.job_locations(id),
  salary_min numeric,
  salary_max numeric,
  currency text not null default 'USD',
  posted_at timestamptz not null,
  url text not null,
  source text not null,
  dedupe_key text not null unique,
  is_active boolean not null default true,
  normalized_at timestamptz not null default now()
);

create index if not exists idx_job_postings_normalized_role_posted
  on public.job_postings_normalized(role_id, posted_at desc);
create index if not exists idx_job_postings_normalized_location
  on public.job_postings_normalized(location_id);

create table if not exists public.role_market_metrics (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.job_roles(id),
  location_id uuid not null references public.job_locations(id),
  metric_month date not null,
  openings_count integer not null default 0,
  growth_mom_pct numeric,
  remote_ratio numeric,
  updated_at timestamptz not null default now(),
  unique(role_id, location_id, metric_month)
);

create table if not exists public.role_salary_metrics (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.job_roles(id),
  location_id uuid not null references public.job_locations(id),
  metric_month date not null,
  salary_min numeric,
  salary_median numeric,
  salary_max numeric,
  sample_size integer not null default 0,
  currency text not null default 'USD',
  updated_at timestamptz not null default now(),
  unique(role_id, location_id, metric_month)
);

create table if not exists public.etl_runs (
  id uuid primary key default gen_random_uuid(),
  pipeline_name text not null,
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  stats_json jsonb not null default '{}'::jsonb,
  error_message text
);

create or replace view public.job_roles_overview_latest as
with latest_market as (
  select distinct on (m.role_id, m.location_id)
    m.role_id,
    m.location_id,
    m.metric_month,
    m.openings_count,
    m.growth_mom_pct,
    m.remote_ratio
  from public.role_market_metrics m
  order by m.role_id, m.location_id, m.metric_month desc
),
latest_salary as (
  select distinct on (s.role_id, s.location_id)
    s.role_id,
    s.location_id,
    s.metric_month,
    s.salary_min,
    s.salary_median,
    s.salary_max,
    s.sample_size,
    s.currency
  from public.role_salary_metrics s
  order by s.role_id, s.location_id, s.metric_month desc
)
select
  r.id as role_id,
  coalesce(
    nullif(trim(r.slug), ''),
    regexp_replace(lower(trim(r.title)), '[^a-z0-9]+', '-', 'g')
  ) as slug,
  r.title as name_en,
  r.title_ar as name_ar,
  r.pipeline_erp_vendor as erp_vendor,
  l.country_code,
  l.city,
  coalesce(lm.openings_count, 0) as openings_count,
  lm.growth_mom_pct,
  lm.remote_ratio,
  ls.salary_min,
  ls.salary_median,
  ls.salary_max,
  ls.sample_size,
  coalesce(ls.currency, l.currency) as currency,
  greatest(coalesce(lm.metric_month::timestamp, 'epoch'::timestamp), coalesce(ls.metric_month::timestamp, 'epoch'::timestamp)) as data_month
from public.job_roles r
cross join public.job_locations l
left join latest_market lm
  on lm.role_id = r.id and lm.location_id = l.id
left join latest_salary ls
  on ls.role_id = r.id and ls.location_id = l.id
where r.is_active = true;

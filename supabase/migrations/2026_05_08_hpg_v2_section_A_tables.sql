-- ============================================================
-- HPG ERP migration v2 (RECONCILED)
-- Section A: tables, FKs, indexes, triggers
-- Date: 2026-05-08
--
-- This version respects the actual state of hpg.part_catalog and
-- hpg.purchase_orders, which were already created by prior work.
--
-- Naming alignment with existing schema:
--   - part_catalog uses 'model_number' (not 'catalog_number')
--   - purchase_orders uses 'issued_date' (not 'po_date')
--   - purchase_orders uses 'total_amount' (not 'total')
--   - Specs (amp_rating, voltage, poles, frame_size, aic_rating, etc.)
--     live as keys in attributes JSONB, not flat columns
--
-- Changes:
--   1. ADD COLUMNs to existing hpg.part_catalog and hpg.purchase_orders
--   2. CREATE new tables: component_conditions, component_purchase_lines,
--      grade_pricing_rules
--   3. ALTER public.wes_vendors and public.wes_job_components (additive)
--
-- All operations idempotent. Existing rows preserved.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Prereqs
-- ------------------------------------------------------------
create schema if not exists hpg;

create or replace function hpg.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1. ADD COLUMNs to existing hpg.part_catalog
-- ------------------------------------------------------------
alter table hpg.part_catalog
  add column if not exists source        text not null default 'manual',
  add column if not exists needs_review  boolean not null default false;

-- Source values used by importer; not a hard constraint to allow future sources.
-- Documented values: 'manual', 'po_import', 'walkthrough', 'ebay_lister', 'quote_intake'

create index if not exists part_catalog_needs_review
  on hpg.part_catalog(needs_review) where needs_review = true;

create index if not exists part_catalog_source_idx
  on hpg.part_catalog(source);

-- ------------------------------------------------------------
-- 2. ADD COLUMNs to existing hpg.purchase_orders
-- ------------------------------------------------------------
alter table hpg.purchase_orders
  add column if not exists customer_po_number text,
  add column if not exists source             text not null default 'manual',
  add column if not exists source_uri         text,
  add column if not exists raw_vendor_name    text,
  add column if not exists raw_extraction     jsonb;

create index if not exists po_source_idx on hpg.purchase_orders(source);

-- ------------------------------------------------------------
-- 3. New table: component_conditions
-- ------------------------------------------------------------
create table if not exists hpg.component_conditions (
  code              text primary key,
  display_name      text not null,
  default_grade     text check (default_grade in ('A','B','C','D')),
  sort_order        int  not null default 100,
  active            bool not null default true,
  created_at        timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. New table: component_purchase_lines (COGS observations)
--    References part_catalog by id (FK), denormalizes po_date for
--    fast time-series queries without joining purchase_orders.
-- ------------------------------------------------------------
create table if not exists hpg.component_purchase_lines (
  id                   uuid primary key default gen_random_uuid(),
  po_id                text references hpg.purchase_orders(id) on delete cascade,
  line_no              int,
  part_catalog_id      uuid references hpg.part_catalog(id),
  vendor_id            uuid references public.wes_vendors(id),
  condition_raw        text,
  condition_code       text references hpg.component_conditions(code),
  qty                  numeric(12,3),
  unit_cost            numeric(12,4),
  extended_cost        numeric(14,2)
                       generated always as (round(qty * unit_cost, 2)) stored,
  po_date              date,                            -- denormalized from purchase_orders.issued_date
  raw_product_label    text,
  raw_description      text,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists cpl_part_idx        on hpg.component_purchase_lines(part_catalog_id);
create index if not exists cpl_vendor_idx      on hpg.component_purchase_lines(vendor_id);
create index if not exists cpl_po_idx          on hpg.component_purchase_lines(po_id);
create index if not exists cpl_part_cond_date  on hpg.component_purchase_lines(part_catalog_id, condition_code, po_date desc);
create index if not exists cpl_date_idx        on hpg.component_purchase_lines(po_date desc);

drop trigger if exists trg_cpl_updated on hpg.component_purchase_lines;
create trigger trg_cpl_updated
  before update on hpg.component_purchase_lines
  for each row execute function hpg.set_updated_at();

-- Optional uniqueness: prevent duplicate import of the same PO line
create unique index if not exists cpl_po_lineno_unique
  on hpg.component_purchase_lines(po_id, line_no)
  where po_id is not null and line_no is not null;

-- ------------------------------------------------------------
-- 5. New table: grade_pricing_rules
-- ------------------------------------------------------------
create table if not exists hpg.grade_pricing_rules (
  id                  uuid primary key default gen_random_uuid(),
  scope               text not null check (scope in ('equipment_type','part')),
  equipment_type_code text references hpg.equipment_types(code),
  part_catalog_id     uuid references hpg.part_catalog(id),
  base_grade          text not null default 'A' check (base_grade in ('A','B','C','D')),
  target_grade        text not null check (target_grade in ('A','B','C','D')),
  multiplier          numeric(6,4) not null check (multiplier >= 0),
  effective_from      date not null default current_date,
  effective_to        date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint gpr_scope_consistency check (
    (scope = 'equipment_type' and equipment_type_code is not null and part_catalog_id is null)
    or
    (scope = 'part' and part_catalog_id is not null)
  )
);

create index if not exists gpr_eq_type_idx on hpg.grade_pricing_rules(equipment_type_code) where scope = 'equipment_type';
create index if not exists gpr_part_idx    on hpg.grade_pricing_rules(part_catalog_id)     where scope = 'part';

drop trigger if exists trg_gpr_updated on hpg.grade_pricing_rules;
create trigger trg_gpr_updated
  before update on hpg.grade_pricing_rules
  for each row execute function hpg.set_updated_at();

-- ------------------------------------------------------------
-- 6. ALTER public.wes_vendors (additive)
-- ------------------------------------------------------------
alter table public.wes_vendors
  add column if not exists vendor_type      text,
  add column if not exists primary_category text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'wes_vendors_vendor_type_check'
  ) then
    alter table public.wes_vendors
      add constraint wes_vendors_vendor_type_check
      check (vendor_type is null or vendor_type in (
        'brokered_components','scrap','fab_supplier','consumables','service','rental','other'
      ));
  end if;
end $$;

create index if not exists wes_vendors_vendor_type_idx on public.wes_vendors(vendor_type);

-- ------------------------------------------------------------
-- 7. ALTER public.wes_job_components (additive)
-- ------------------------------------------------------------
alter table public.wes_job_components
  add column if not exists part_catalog_id                uuid references hpg.part_catalog(id),
  add column if not exists condition_code                 text references hpg.component_conditions(code),
  add column if not exists grade                          text check (grade is null or grade in ('A','B','C','D','ungraded')),
  add column if not exists acquisition_purchase_line_id   uuid references hpg.component_purchase_lines(id);

create index if not exists wjc_part_catalog_idx on public.wes_job_components(part_catalog_id);

-- ------------------------------------------------------------
-- 8. Grants for API access
-- ------------------------------------------------------------
grant usage on schema hpg to anon, authenticated, service_role;
grant select on all tables in schema hpg to anon, authenticated, service_role;
alter default privileges in schema hpg
  grant select on tables to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 9. Verification queries (commented; run manually after apply)
-- ------------------------------------------------------------
-- select table_name from information_schema.tables
--  where table_schema = 'hpg' order by table_name;
-- expect: component_conditions, component_purchase_lines, equipment_types,
--         grade_pricing_rules, part_catalog, purchase_orders
--         (plus any other prior hpg tables you already had)

-- select column_name from information_schema.columns
--  where table_schema = 'hpg' and table_name = 'part_catalog'
--    and column_name in ('source','needs_review');
-- expect: 2 rows

-- select column_name from information_schema.columns
--  where table_schema = 'hpg' and table_name = 'purchase_orders'
--    and column_name in ('customer_po_number','source','source_uri','raw_vendor_name','raw_extraction');
-- expect: 5 rows

-- select table_name, column_name from information_schema.columns
--  where table_schema = 'public'
--    and ((table_name = 'wes_vendors' and column_name in ('vendor_type','primary_category'))
--      or (table_name = 'wes_job_components' and column_name in ('part_catalog_id','condition_code','grade','acquisition_purchase_line_id')));
-- expect: 6 rows

-- End of Section A

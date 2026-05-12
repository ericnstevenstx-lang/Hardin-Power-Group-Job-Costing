-- ============================================================
-- HPG ERP migration v2 (RECONCILED)
-- Section B: views (rollups + public wrappers)
-- Date: 2026-05-08
--
-- Naming reconciliation:
--   - Underlying column is part_catalog.model_number
--     Views ALIAS this as catalog_number for app consumers
--     (so cogs.js and ComponentPicker can speak the user-facing term)
--   - Specs (amp_rating, voltage, poles, frame_size, aic_rating) are
--     extracted from part_catalog.attributes JSONB in v_part_catalog_searchable
--   - purchase_orders.issued_date used where joins are needed; the
--     component_purchase_lines.po_date column is denormalized at import
-- ============================================================

-- ------------------------------------------------------------
-- B1. cost history per part (all conditions combined)
-- ------------------------------------------------------------
create or replace view hpg.v_component_cogs_by_part as
select
  pc.id                                                  as part_catalog_id,
  pc.manufacturer,
  pc.model_number                                        as catalog_number,
  pc.equipment_type_code,
  pc.display_name,
  count(cpl.id)::int                                     as observation_count,
  sum(cpl.qty)                                           as total_qty_purchased,
  round(avg(cpl.unit_cost), 2)                           as avg_unit_cost,
  percentile_cont(0.5) within group (order by cpl.unit_cost) as median_unit_cost,
  min(cpl.unit_cost)                                     as min_unit_cost,
  max(cpl.unit_cost)                                     as max_unit_cost,
  max(cpl.po_date)                                       as last_po_date,
  count(distinct cpl.vendor_id)::int                     as distinct_vendors
from hpg.part_catalog pc
left join hpg.component_purchase_lines cpl on cpl.part_catalog_id = pc.id
group by pc.id, pc.manufacturer, pc.model_number, pc.equipment_type_code, pc.display_name;

-- ------------------------------------------------------------
-- B2. cost history split by condition
-- ------------------------------------------------------------
create or replace view hpg.v_component_cogs_by_part_condition as
select
  cpl.part_catalog_id,
  cpl.condition_code,
  cc.display_name                                        as condition_display,
  count(*)::int                                          as observation_count,
  sum(cpl.qty)                                           as total_qty,
  round(avg(cpl.unit_cost), 2)                           as avg_unit_cost,
  percentile_cont(0.5) within group (order by cpl.unit_cost) as median_unit_cost,
  min(cpl.unit_cost)                                     as min_unit_cost,
  max(cpl.unit_cost)                                     as max_unit_cost,
  max(cpl.po_date)                                       as last_po_date
from hpg.component_purchase_lines cpl
left join hpg.component_conditions cc on cc.code = cpl.condition_code
where cpl.part_catalog_id is not null
group by cpl.part_catalog_id, cpl.condition_code, cc.display_name;

-- ------------------------------------------------------------
-- B3. last paid per part+condition
-- ------------------------------------------------------------
create or replace view hpg.v_component_last_paid as
select distinct on (cpl.part_catalog_id, cpl.condition_code)
  cpl.part_catalog_id,
  cpl.condition_code,
  cpl.unit_cost                                          as last_unit_cost,
  cpl.qty                                                as last_qty,
  cpl.po_date                                            as last_po_date,
  cpl.vendor_id                                          as last_vendor_id,
  v.name                                                 as last_vendor_name,
  cpl.po_id                                              as last_po_id
from hpg.component_purchase_lines cpl
left join public.wes_vendors v on v.id = cpl.vendor_id
where cpl.part_catalog_id is not null
order by cpl.part_catalog_id, cpl.condition_code, cpl.po_date desc nulls last;

-- ------------------------------------------------------------
-- B4. cost by vendor
-- ------------------------------------------------------------
create or replace view hpg.v_component_cogs_by_vendor as
select
  cpl.part_catalog_id,
  cpl.vendor_id,
  v.name                                                 as vendor_name,
  count(*)::int                                          as observation_count,
  round(avg(cpl.unit_cost), 2)                           as avg_unit_cost,
  min(cpl.unit_cost)                                     as min_unit_cost,
  max(cpl.po_date)                                       as last_po_date
from hpg.component_purchase_lines cpl
left join public.wes_vendors v on v.id = cpl.vendor_id
where cpl.part_catalog_id is not null
group by cpl.part_catalog_id, cpl.vendor_id, v.name;

-- ------------------------------------------------------------
-- B5. resolved grade pricing
-- ------------------------------------------------------------
create or replace view hpg.v_grade_pricing_resolved as
with grades as (
  select unnest(array['A','B','C','D']) as target_grade
),
part_rules as (
  select gpr.part_catalog_id, gpr.target_grade, gpr.multiplier
  from hpg.grade_pricing_rules gpr
  where gpr.scope = 'part'
    and (gpr.effective_to is null or gpr.effective_to >= current_date)
    and gpr.effective_from <= current_date
),
type_rules as (
  select gpr.equipment_type_code, gpr.target_grade, gpr.multiplier
  from hpg.grade_pricing_rules gpr
  where gpr.scope = 'equipment_type'
    and (gpr.effective_to is null or gpr.effective_to >= current_date)
    and gpr.effective_from <= current_date
)
select
  pc.id                       as part_catalog_id,
  g.target_grade,
  coalesce(pr.multiplier, tr.multiplier) as multiplier,
  case
    when pr.multiplier is not null then 'part'
    when tr.multiplier is not null then 'equipment_type'
    else null
  end as source_scope
from hpg.part_catalog pc
cross join grades g
left join part_rules pr on pr.part_catalog_id = pc.id and pr.target_grade = g.target_grade
left join type_rules tr on tr.equipment_type_code = pc.equipment_type_code and tr.target_grade = g.target_grade;

-- ------------------------------------------------------------
-- B6. Part catalog searchable view
--     Pulls common specs out of attributes JSONB so the picker
--     can show them without parsing JSON client-side.
-- ------------------------------------------------------------
create or replace view hpg.v_part_catalog_searchable as
select
  pc.id,
  pc.manufacturer,
  pc.model_number                          as catalog_number,
  pc.equipment_type_code,
  et.display_name                          as equipment_type_display,
  et.category                              as equipment_category,
  pc.display_name,
  -- Specs extracted from attributes JSONB (NULL if key absent)
  nullif(pc.attributes->>'amp_rating','')::numeric  as amp_rating,
  pc.attributes->>'voltage'                          as voltage,
  nullif(pc.attributes->>'poles','')::int            as poles,
  pc.attributes->>'frame_size'                       as frame_size,
  pc.attributes->>'aic_rating'                       as aic_rating,
  pc.attributes->>'form_factor'                      as form_factor,
  pc.attributes->>'mounting_type'                    as mounting_type,
  pc.oem_status,
  (pc.oem_status = 'discontinued')         as discontinued,
  pc.needs_review,
  pc.source
from hpg.part_catalog pc
left join hpg.equipment_types et on et.code = pc.equipment_type_code;

-- ------------------------------------------------------------
-- B7. PUBLIC WRAPPERS for PostgREST (default 'public' schema only)
-- ------------------------------------------------------------
create or replace view public.v_component_cogs_by_part as
  select * from hpg.v_component_cogs_by_part;

create or replace view public.v_component_cogs_by_part_condition as
  select * from hpg.v_component_cogs_by_part_condition;

create or replace view public.v_component_last_paid as
  select * from hpg.v_component_last_paid;

create or replace view public.v_component_cogs_by_vendor as
  select * from hpg.v_component_cogs_by_vendor;

create or replace view public.v_grade_pricing_resolved as
  select * from hpg.v_grade_pricing_resolved;

create or replace view public.v_part_catalog_searchable as
  select * from hpg.v_part_catalog_searchable;

grant select on public.v_component_cogs_by_part            to anon, authenticated;
grant select on public.v_component_cogs_by_part_condition  to anon, authenticated;
grant select on public.v_component_last_paid               to anon, authenticated;
grant select on public.v_component_cogs_by_vendor          to anon, authenticated;
grant select on public.v_grade_pricing_resolved            to anon, authenticated;
grant select on public.v_part_catalog_searchable           to anon, authenticated;

-- ------------------------------------------------------------
-- B8. Verification (commented)
-- ------------------------------------------------------------
-- select table_name from information_schema.views
--  where table_schema = 'public' and table_name like 'v_%'
--  order by table_name;
-- expect: v_component_cogs_by_part, v_component_cogs_by_part_condition,
--         v_component_cogs_by_vendor, v_component_last_paid,
--         v_grade_pricing_resolved, v_part_catalog_searchable

-- select * from public.v_part_catalog_searchable limit 5;
-- expect: 0 rows until importer runs, but query succeeds with no error

-- End of Section B

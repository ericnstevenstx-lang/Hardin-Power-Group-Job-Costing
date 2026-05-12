-- ============================================================
-- HPG ERP migration v2 (RECONCILED)
-- Section C: seed data
-- Date: 2026-05-08
--
-- Only seeds the new hpg.component_conditions table.
-- hpg.equipment_types already has 29 rows from prior migration.
--
-- Decisions:
--   "New"           -> default grade A
--   "New Surplus"   -> NO default grade (requires QC at receipt)
--   "Used / tested" -> no default grade
--   "Refurbished"   -> default grade B
--   "Unspecified"   -> no default grade
-- ============================================================

insert into hpg.component_conditions (code, display_name, default_grade, sort_order) values
  ('new',          'New',           'A',  10),
  ('new_surplus',  'New Surplus',   null, 20),
  ('used',         'Used / tested', null, 30),
  ('refurbished',  'Refurbished',   'B',  40),
  ('unspecified',  'Unspecified',   null, 99)
on conflict (code) do update
  set display_name  = excluded.display_name,
      default_grade = excluded.default_grade,
      sort_order    = excluded.sort_order;

-- Verification:
-- select code, display_name, default_grade from hpg.component_conditions order by sort_order;
-- expect: 5 rows

-- End of Section C

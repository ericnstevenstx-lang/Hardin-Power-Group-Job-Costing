# HPG ERP v2 + Costing App integration - Apply order (RECONCILED)

Date: 2026-05-08
Target: Supabase project `ulyycjtrshpsjpvbztkr`

## Files

| # | file                                          | where                       |
|---|-----------------------------------------------|-----------------------------|
| 1 | `2026_05_08_hpg_v2_section_A_tables.sql`      | Supabase SQL Editor         |
| 2 | `2026_05_08_hpg_v2_section_B_views.sql`       | Supabase SQL Editor         |
| 3 | `2026_05_08_hpg_v2_section_C_seeds.sql`       | Supabase SQL Editor         |
| 4 | `2026_05_08_vendor_backfill.sql`              | Supabase SQL Editor         |
| 5 | `import_pos_2026_q1q2.js`                     | Costing repo `/scripts/`    |
| 6 | `po_line_items.csv`                           | Costing repo `/scripts/`    |
| 7 | `cogs.js`                                     | Costing repo `/lib/`        |
| 8 | `ComponentPicker.jsx`                         | Costing repo `/components/` |
| 9 | `PATCH_pages_index_js.md`                     | edit `/pages/index.js`      |

## What changed from the first attempt

After your verification query showed the existing schema state, three names
got aligned:

- `part_catalog.model_number` (not catalog_number)
- `purchase_orders.issued_date` (not po_date)
- `purchase_orders.total_amount` (not total)
- Specs live in `part_catalog.attributes` JSONB, extracted in
  `v_part_catalog_searchable` as if they were flat columns

The views alias `model_number` as `catalog_number` so the costing app code
speaks the user-facing term. No app-side code changes needed for this
naming difference.

## Order of operations

### Step 1 - Apply SQL in this order

1. Section A (tables, ALTERs)
2. Section B (views)
3. Section C (seeds: 5 conditions)
4. Vendor backfill

After each section, paste any errors back and stop.

### Step 2 - Verify

```sql
-- After Section A
select table_name from information_schema.tables
 where table_schema = 'hpg' order by table_name;
-- expect 6+ rows: component_conditions, component_purchase_lines,
-- equipment_types, grade_pricing_rules, part_catalog, purchase_orders
-- (plus any other prior hpg tables)

select column_name from information_schema.columns
 where table_schema = 'hpg' and table_name = 'part_catalog'
   and column_name in ('source','needs_review');
-- expect: 2 rows

select column_name from information_schema.columns
 where table_schema = 'hpg' and table_name = 'purchase_orders'
   and column_name in ('customer_po_number','source','source_uri','raw_vendor_name','raw_extraction');
-- expect: 5 rows

-- After Section B
select table_name from information_schema.views
 where table_schema = 'public' and table_name like 'v_%' order by table_name;
-- expect: v_component_cogs_by_part, v_component_cogs_by_part_condition,
--         v_component_cogs_by_vendor, v_component_last_paid,
--         v_grade_pricing_resolved, v_part_catalog_searchable

-- After Section C
select code, display_name, default_grade from hpg.component_conditions order by sort_order;
-- expect: 5 rows

-- After vendor backfill
select vendor_type, count(*) from public.wes_vendors group by vendor_type order by 2 desc;
```

### Step 3 - Run PO importer

```bash
cd Hardin-Power-Group-Job-Costing
mkdir -p scripts
cp /path/to/import_pos_2026_q1q2.js scripts/
cp /path/to/po_line_items.csv scripts/

export SUPABASE_URL='https://ulyycjtrshpsjpvbztkr.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='<service-role-key-from-supabase>'

# Dry run
node scripts/import_pos_2026_q1q2.js --dry-run --csv ./scripts/po_line_items.csv

# Inspect
cat /tmp/import_report.json | jq '{pos_processed, lines_inserted, parts_created, vendors_unmatched, errors}'

# Real run
node scripts/import_pos_2026_q1q2.js --csv ./scripts/po_line_items.csv
```

If `vendors_unmatched` is non-empty, add those vendors to `public.wes_vendors`
manually and re-run. The importer is idempotent on (po_id, line_no) so
re-runs only insert what's missing.

### Step 4 - Costing app code

```bash
cp /path/to/cogs.js lib/
cp /path/to/ComponentPicker.jsx components/
# Edit pages/index.js per PATCH_pages_index_js.md (3 edits)

git add lib/cogs.js components/ComponentPicker.jsx pages/index.js scripts/
git commit -m "PR3: COGS-aware component picker on costing app"
git push
```

Vercel auto-deploys.

## Rollback

Inverse order. The new tables drop cleanly. Column additions on
`part_catalog`, `purchase_orders`, `wes_vendors`, `wes_job_components`
need to be dropped one at a time if rolling back:

```sql
-- Section A reverse
drop view if exists public.v_part_catalog_searchable;
drop view if exists public.v_grade_pricing_resolved;
drop view if exists public.v_component_cogs_by_vendor;
drop view if exists public.v_component_last_paid;
drop view if exists public.v_component_cogs_by_part_condition;
drop view if exists public.v_component_cogs_by_part;

drop view if exists hpg.v_part_catalog_searchable;
drop view if exists hpg.v_grade_pricing_resolved;
drop view if exists hpg.v_component_cogs_by_vendor;
drop view if exists hpg.v_component_last_paid;
drop view if exists hpg.v_component_cogs_by_part_condition;
drop view if exists hpg.v_component_cogs_by_part;

alter table public.wes_job_components
  drop column if exists acquisition_purchase_line_id,
  drop column if exists grade,
  drop column if exists condition_code,
  drop column if exists part_catalog_id;

drop table if exists hpg.grade_pricing_rules cascade;
drop table if exists hpg.component_purchase_lines cascade;
drop table if exists hpg.component_conditions cascade;

-- Leave hpg.part_catalog and hpg.purchase_orders in place; just drop
-- the columns we added:
alter table hpg.part_catalog
  drop column if exists needs_review,
  drop column if exists source;

alter table hpg.purchase_orders
  drop column if exists raw_extraction,
  drop column if exists raw_vendor_name,
  drop column if exists source_uri,
  drop column if exists source,
  drop column if exists customer_po_number;
```

## What this doesn't touch

Walkthrough_PowerGate, QCChecklist, SupplyRequestForm, eBay lister, the ERP
repo (hpg-erp), price_book, existing wes_job_components rows, existing
hpg.part_catalog rows.

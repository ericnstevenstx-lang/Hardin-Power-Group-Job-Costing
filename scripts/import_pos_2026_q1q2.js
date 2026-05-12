#!/usr/bin/env node
/**
 * import_pos_2026_q1q2.js  (v2 RECONCILED)
 *
 * Historical PO importer. Reads pre-parsed po_line_items.csv and inserts
 * brokered + mixed PO lines into:
 *   hpg.purchase_orders            (PO header)
 *   hpg.part_catalog               (auto-creates rows when (mfr,model_number) missing)
 *   hpg.component_purchase_lines   (immutable COGS observation row)
 *
 * Naming aligned with actual schema:
 *   - part_catalog.model_number  (NOT catalog_number)
 *   - purchase_orders.issued_date (NOT po_date)
 *   - purchase_orders.total_amount (NOT total)
 *
 * USAGE:
 *   node scripts/import_pos_2026_q1q2.js --dry-run --csv ./po_line_items.csv
 *   node scripts/import_pos_2026_q1q2.js          --csv ./po_line_items.csv
 *
 * ENV:
 *   SUPABASE_URL                 e.g. https://ulyycjtrshpsjpvbztkr.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    service role key (NOT anon)
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const csvFlag = argv.indexOf('--csv');
const CSV_PATH = csvFlag >= 0 ? argv[csvFlag + 1] : './po_line_items.csv';
const REPORT_PATH = '/tmp/import_report.json';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  db:   { schema: 'public' },
});
const sbHpg = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  db:   { schema: 'hpg' },
});

// ---------- CSV parsing (handles quoted commas) ----------
function parseCsv(text) {
  const rows = [];
  let cur = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') {}
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  const headers = rows.shift();
  return rows.filter(r => r.length === headers.length)
             .map(r => Object.fromEntries(headers.map((h,i) => [h, r[i]])));
}

// ---------- Parsing helpers ----------
const BRAND_NORMALIZE = {
  'sqd': 'Square D', 'square d': 'Square D', 'squared': 'Square D', 'schneider': 'Square D',
  'ge': 'GE', 'general electric': 'GE',
  'eaton': 'Eaton',
  'cutler hammer': 'Cutler-Hammer', 'cutler-hammer': 'Cutler-Hammer', 'ch': 'Cutler-Hammer',
  'siemens': 'Siemens',
  'fpe': 'FPE', 'federal pacific': 'FPE',
  'ite': 'ITE',
  'hubbell': 'Hubbell',
  'abb': 'ABB',
  'westinghouse': 'Westinghouse',
};

const EQUIPMENT_TYPE_MAP = {
  'circuit breaker':     'circuit_breaker',
  'panels':              'panels',
  'panel':               'panelboard',
  'panelboard':          'panelboard',
  'switchgear':          'switchgear',
  'transformer':         'transformer',
  'disconnect':          'disconnect_switch',
  'disconnects':         'disconnect_switch',
  'disconnect switch':   'disconnect_switch',
  'fuses':               'fuses',
  'electrical equipment':'electrical_equipment',
  'meter':               'meter',
  'relay':               'relay',
  'mcc':                 'mcc',
  'bus duct':            'bus_duct',
  'ups':                 'ups',
  'pdu':                 'pdu',
  'ats':                 'ats',
  'vfd':                 'vfd',
  'motor starter':       'motor_starter',
};

const CONDITION_MAP = {
  'new':           'new',
  'new surplus':   'new_surplus',
  'used':          'used',
  'used/tested':   'used',
  'used / tested': 'used',
  'tested':        'used',
  'reconditioned': 'refurbished',
  'refurbished':   'refurbished',
  'refurb':        'refurbished',
};

function stripBrokeredPrefix(s) {
  if (!s) return s;
  return s.replace(/^\(B\)\s*-\s*/i, '').trim();
}

function parseProductColumn(rawProduct) {
  const stripped = stripBrokeredPrefix(rawProduct || '');
  const lower = stripped.toLowerCase();
  let eq = null, mfrHint = null;
  const eqKeys = Object.keys(EQUIPMENT_TYPE_MAP).sort((a,b) => b.length - a.length);
  for (const key of eqKeys) {
    if (lower.startsWith(key)) {
      eq = EQUIPMENT_TYPE_MAP[key];
      const tail = stripped.slice(key.length).trim();
      if (tail) {
        const firstTok = tail.split(/\s+/)[0].toLowerCase().replace(/[,.;]/g, '');
        if (BRAND_NORMALIZE[firstTok]) mfrHint = BRAND_NORMALIZE[firstTok];
        else mfrHint = tail.split(/\s+/)[0];
      }
      break;
    }
  }
  return { equipment_type_code: eq, manufacturer_hint: mfrHint };
}

function extractPartNumber(text) {
  if (!text) return null;
  const blocklist = new Set(['USED','NEW','RECONDITIONED','REFURBISHED','SURPLUS','TESTED','SPARE']);
  const matches = [...String(text).toUpperCase().matchAll(/\b[A-Z0-9][A-Z0-9\-/]{4,}\b/g)].map(m => m[0]);
  const candidates = matches.filter(c => /\d/.test(c) && !blocklist.has(c));
  if (!candidates.length) return null;
  candidates.sort((a,b) => b.length - a.length);
  return candidates[0];
}

function extractCondition(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  const order = ['new surplus','reconditioned','refurbished','refurb','used / tested','used/tested','tested','used','new'];
  for (const k of order) if (t.includes(k)) return CONDITION_MAP[k] || null;
  return null;
}

function parseDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [_, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
}

// ---------- Vendor cache ----------
const vendorCache = new Map();
async function resolveVendor(name) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (vendorCache.has(key)) return vendorCache.get(key);
  const { data, error } = await supabase
    .from('wes_vendors')
    .select('id, name')
    .ilike('name', name.trim())
    .limit(1);
  if (error) throw error;
  const id = data && data.length ? data[0].id : null;
  vendorCache.set(key, id);
  return id;
}

// ---------- Part catalog (find or create on model_number) ----------
const partCache = new Map();
async function findOrCreatePart({ manufacturer, model_number, equipment_type_code }) {
  const key = `${manufacturer}|${model_number}`;
  if (partCache.has(key)) return { id: partCache.get(key), created: false };

  const { data: found, error: findErr } = await sbHpg
    .from('part_catalog')
    .select('id')
    .eq('manufacturer', manufacturer)
    .eq('model_number', model_number)
    .limit(1);
  if (findErr) throw findErr;
  if (found && found.length) {
    partCache.set(key, found[0].id);
    return { id: found[0].id, created: false };
  }

  if (DRY_RUN) {
    partCache.set(key, '(dry-run-uuid)');
    return { id: '(dry-run-uuid)', created: true };
  }

  // equipment_type_code is NOT NULL in hpg.part_catalog. Fallback if unknown.
  const eqCode = equipment_type_code || 'other';

  const { data: created, error: insErr } = await sbHpg
    .from('part_catalog')
    .insert({
      manufacturer,
      model_number,
      equipment_type_code: eqCode,
      display_name: `${manufacturer} ${model_number}`,
      source: 'po_import',
      needs_review: true,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  partCache.set(key, created.id);
  return { id: created.id, created: true };
}

// ---------- Purchase orders header (find or create on id) ----------
const poCache = new Map();
async function findOrCreatePO({ po_number, vendor_id, po_date, total, raw_vendor_name }) {
  if (!po_number) return null;
  if (poCache.has(po_number)) return po_number;

  const { data: found, error: findErr } = await sbHpg
    .from('purchase_orders')
    .select('id')
    .eq('id', po_number)
    .maybeSingle();
  if (findErr && findErr.code !== 'PGRST116') throw findErr;
  if (found) { poCache.set(po_number, po_number); return po_number; }

  if (DRY_RUN) { poCache.set(po_number, po_number); return po_number; }

  const { error: insErr } = await sbHpg
    .from('purchase_orders')
    .insert({
      id:               po_number,
      vendor_id:        vendor_id,
      issued_date:      parseDate(po_date),       // actual column name
      total_amount:     total ? parseFloat(total) : null,
      status:           'received',                // historical POs are closed/received
      source:           'pdf_import',
      raw_vendor_name:  raw_vendor_name,
    });
  if (insErr) throw insErr;
  poCache.set(po_number, po_number);
  return po_number;
}

// ---------- Main ----------
async function main() {
  console.log(`\n[import_pos_2026_q1q2 v2] mode=${DRY_RUN ? 'DRY RUN' : 'WRITE'} csv=${CSV_PATH}`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = parseCsv(csvText);
  console.log(`Loaded ${lines.length} CSV rows`);

  const targets = lines.filter(l =>
    (l.po_category === 'brokered' || l.po_category === 'mixed') &&
    l.line_class === 'brokered' &&
    l.product && !l.product.startsWith('PARSE_ERROR')
  );
  console.log(`Filtered to ${targets.length} brokered component lines`);

  // Group by PO
  const byPo = new Map();
  for (const l of targets) {
    if (!l.po_number) continue;
    if (!byPo.has(l.po_number)) {
      byPo.set(l.po_number, {
        po_number: l.po_number,
        po_date:   l.po_date,
        vendor:    l.vendor,
        total:     0,
        lines:     [],
      });
    }
    const rec = byPo.get(l.po_number);
    rec.lines.push(l);
    rec.total += parseFloat(l.amount || 0);
  }
  console.log(`Grouped into ${byPo.size} POs`);

  const report = {
    started_at: new Date().toISOString(),
    mode: DRY_RUN ? 'dry_run' : 'write',
    pos_processed: 0, pos_skipped: 0,
    lines_inserted: 0, lines_skipped: 0,
    parts_created: 0, parts_reused: 0,
    vendors_unmatched: new Set(),
    errors: [],
    details: [],
  };

  for (const [poNumber, po] of byPo.entries()) {
    try {
      const vendorId = await resolveVendor(po.vendor);
      if (!vendorId) {
        report.vendors_unmatched.add(po.vendor);
        report.pos_skipped++;
        report.details.push({ po: poNumber, skipped: 'vendor not found', vendor: po.vendor });
        continue;
      }

      const poId = await findOrCreatePO({
        po_number:        poNumber,
        vendor_id:        vendorId,
        po_date:          po.po_date,
        total:            po.total,
        raw_vendor_name:  po.vendor,
      });
      report.pos_processed++;

      for (const line of po.lines) {
        const product = stripBrokeredPrefix(line.product);
        const { equipment_type_code, manufacturer_hint } = parseProductColumn(line.product);
        const partFromDesc = extractPartNumber(line.description);
        const partFromProd = extractPartNumber(product);
        const model_number = partFromDesc || partFromProd;
        const conditionCode = extractCondition(line.description) || extractCondition(product) || 'unspecified';
        const manufacturer = manufacturer_hint || '(unknown)';

        if (!model_number) {
          report.lines_skipped++;
          report.details.push({ po: poNumber, line: line.line_no, skipped: 'no part number extracted' });
          continue;
        }

        const { id: partId, created } = await findOrCreatePart({
          manufacturer,
          model_number,
          equipment_type_code,
        });
        if (created) report.parts_created++; else report.parts_reused++;

        // Idempotency: skip if (po_id, line_no) already inserted
        if (!DRY_RUN) {
          const { data: existing } = await sbHpg
            .from('component_purchase_lines')
            .select('id')
            .eq('po_id', poId)
            .eq('line_no', parseInt(line.line_no, 10))
            .maybeSingle();
          if (existing) { report.lines_skipped++; continue; }
        }

        if (!DRY_RUN) {
          const { error: insErr } = await sbHpg
            .from('component_purchase_lines')
            .insert({
              po_id:              poId,
              line_no:            parseInt(line.line_no, 10) || null,
              part_catalog_id:    partId === '(dry-run-uuid)' ? null : partId,
              vendor_id:          vendorId,
              condition_raw:      line.description || null,
              condition_code:     conditionCode,
              qty:                parseFloat(line.qty || 0) || null,
              unit_cost:          parseFloat(line.rate || 0) || null,
              po_date:            parseDate(line.po_date),
              raw_product_label:  line.product,
              raw_description:    line.description,
            });
          if (insErr) {
            report.errors.push({ po: poNumber, line: line.line_no, error: insErr.message });
            continue;
          }
        }
        report.lines_inserted++;
      }
    } catch (e) {
      report.errors.push({ po: poNumber, error: e.message });
    }
  }

  report.vendors_unmatched = [...report.vendors_unmatched];
  report.completed_at = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('\n=== IMPORT COMPLETE ===');
  console.log(`POs processed:     ${report.pos_processed}`);
  console.log(`POs skipped:       ${report.pos_skipped}`);
  console.log(`Lines inserted:    ${report.lines_inserted}`);
  console.log(`Lines skipped:     ${report.lines_skipped}`);
  console.log(`Parts created:     ${report.parts_created}`);
  console.log(`Parts reused:      ${report.parts_reused}`);
  console.log(`Vendors unmatched: ${report.vendors_unmatched.length}`);
  console.log(`Errors:            ${report.errors.length}`);
  console.log(`\nReport: ${REPORT_PATH}`);

  if (report.vendors_unmatched.length) {
    console.log('\nUnmatched vendors (need entries in wes_vendors before re-running):');
    for (const v of report.vendors_unmatched) console.log(`  - ${v}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

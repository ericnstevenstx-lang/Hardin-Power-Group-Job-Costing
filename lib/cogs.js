// lib/cogs.js
//
// COGS evidence queries for the Hardin Costing App.
// All views are wrapped in the public schema (see migration Section B)
// so we use the existing supabase client unchanged.
//
// Three evidence streams attach by part_catalog_id:
//   - COGS history (this module)
//   - price_book comps (existing module, unchanged)
//   - eBay 90d (existing module, unchanged)
//
// Note: the underlying column is part_catalog.model_number but the views
// alias it as catalog_number, which is what consumers see.

import { supabase } from './supabase';

/**
 * Search the part catalog. Used by the cascading dropdown.
 */
export async function searchPartCatalog({
  equipment_type_code,
  manufacturer,
  query,
  limit = 50,
} = {}) {
  let q = supabase
    .from('v_part_catalog_searchable')
    .select('id, manufacturer, catalog_number, equipment_type_code, equipment_type_display, equipment_category, display_name, amp_rating, voltage, poles, frame_size, aic_rating, discontinued, needs_review')
    .eq('discontinued', false)
    .order('manufacturer')
    .order('catalog_number')
    .limit(limit);

  if (equipment_type_code) q = q.eq('equipment_type_code', equipment_type_code);
  if (manufacturer)        q = q.eq('manufacturer', manufacturer);
  if (query) {
    const safe = query.replace(/[%_]/g, '\\$&');
    q = q.or(`catalog_number.ilike.%${safe}%,display_name.ilike.%${safe}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function listEquipmentTypes() {
  const { data, error } = await supabase
    .from('v_part_catalog_searchable')
    .select('equipment_type_code, equipment_type_display, equipment_category')
    .not('equipment_type_code', 'is', null);
  if (error) throw error;
  const seen = new Map();
  for (const r of data || []) {
    if (!seen.has(r.equipment_type_code)) seen.set(r.equipment_type_code, r);
  }
  return [...seen.values()].sort((a, b) =>
    (a.equipment_type_display || '').localeCompare(b.equipment_type_display || '')
  );
}

export async function listManufacturers(equipment_type_code) {
  let q = supabase
    .from('v_part_catalog_searchable')
    .select('manufacturer');
  if (equipment_type_code) q = q.eq('equipment_type_code', equipment_type_code);
  const { data, error } = await q;
  if (error) throw error;
  const set = new Set((data || []).map(r => r.manufacturer).filter(Boolean));
  return [...set].sort();
}

export async function getCogsEvidence(part_catalog_id) {
  if (!part_catalog_id) return null;

  const [summaryRes, byConditionRes, lastPaidRes, byVendorRes] = await Promise.all([
    supabase.from('v_component_cogs_by_part')
      .select('*').eq('part_catalog_id', part_catalog_id).maybeSingle(),
    supabase.from('v_component_cogs_by_part_condition')
      .select('*').eq('part_catalog_id', part_catalog_id),
    supabase.from('v_component_last_paid')
      .select('*').eq('part_catalog_id', part_catalog_id),
    supabase.from('v_component_cogs_by_vendor')
      .select('*').eq('part_catalog_id', part_catalog_id)
      .order('avg_unit_cost', { ascending: true }),
  ]);

  if (summaryRes.error)     throw summaryRes.error;
  if (byConditionRes.error) throw byConditionRes.error;
  if (lastPaidRes.error)    throw lastPaidRes.error;
  if (byVendorRes.error)    throw byVendorRes.error;

  return {
    summary:      summaryRes.data || null,
    by_condition: byConditionRes.data || [],
    last_paid:    lastPaidRes.data || [],
    by_vendor:    byVendorRes.data || [],
  };
}

export async function getGradeMultiplier(part_catalog_id, target_grade) {
  if (!part_catalog_id || !target_grade) return null;
  const { data, error } = await supabase
    .from('v_grade_pricing_resolved')
    .select('multiplier, source_scope')
    .eq('part_catalog_id', part_catalog_id)
    .eq('target_grade', target_grade)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listConditions() {
  return [
    { code: 'new',          display_name: 'New',           default_grade: 'A' },
    { code: 'new_surplus',  display_name: 'New Surplus',   default_grade: null },
    { code: 'used',         display_name: 'Used / tested', default_grade: null },
    { code: 'refurbished',  display_name: 'Refurbished',   default_grade: 'B' },
    { code: 'unspecified',  display_name: 'Unspecified',   default_grade: null },
  ];
}

export function suggestUnitCost(evidence, condition_code) {
  if (!evidence) return null;
  const lp = (evidence.last_paid || []).find(r => r.condition_code === condition_code);
  if (lp && lp.last_unit_cost != null) return Number(lp.last_unit_cost);
  const bc = (evidence.by_condition || []).find(r => r.condition_code === condition_code);
  if (bc && bc.avg_unit_cost != null) return Number(bc.avg_unit_cost);
  if (evidence.summary && evidence.summary.avg_unit_cost != null) return Number(evidence.summary.avg_unit_cost);
  return null;
}

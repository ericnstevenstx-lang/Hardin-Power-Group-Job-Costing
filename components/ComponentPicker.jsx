// components/ComponentPicker.jsx
//
// Cascading component picker for the Hardin Costing App.
// Replaces the free-text component entry in pages/index.js Section 3.
//
// Flow:
//   1. Equipment type dropdown
//   2. Manufacturer dropdown (filtered by type)
//   3. Part autocomplete (filtered by type + manufacturer)
//   4. Condition dropdown
//   5. Grade dropdown
//   6. Qty / Unit cost (auto-suggested from COGS)
//
// Emits a normalized component row via onAdd().

import { useState, useEffect, useCallback } from 'react';
import {
  listEquipmentTypes,
  listManufacturers,
  searchPartCatalog,
  getCogsEvidence,
  getGradeMultiplier,
  listConditions,
  suggestUnitCost,
} from '../lib/cogs';

function fmt(n) {
  if (n == null || isNaN(n)) return '-';
  return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function ComponentPicker({ onAdd, allowFreeText = true }) {
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [parts, setParts] = useState([]);
  const [conditions, setConditions] = useState([]);

  const [typeCode, setTypeCode] = useState('');
  const [mfr, setMfr] = useState('');
  const [partQuery, setPartQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState(null);

  const [conditionCode, setConditionCode] = useState('unspecified');
  const [grade, setGrade] = useState('');
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState('');
  const [unitCostSuggested, setUnitCostSuggested] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [gradeRule, setGradeRule] = useState(null);

  const [freeText, setFreeText] = useState(false);
  const [freeDesc, setFreeDesc] = useState('');

  useEffect(() => {
    listEquipmentTypes().then(setEquipmentTypes).catch(console.error);
    listConditions().then(setConditions).catch(console.error);
  }, []);

  useEffect(() => {
    if (!typeCode) { setManufacturers([]); setMfr(''); return; }
    listManufacturers(typeCode).then(setManufacturers).catch(console.error);
    setMfr('');
    setSelectedPart(null);
  }, [typeCode]);

  useEffect(() => {
    if (!typeCode && !mfr && !partQuery) { setParts([]); return; }
    searchPartCatalog({
      equipment_type_code: typeCode || undefined,
      manufacturer: mfr || undefined,
      query: partQuery || undefined,
    }).then(setParts).catch(console.error);
  }, [typeCode, mfr, partQuery]);

  useEffect(() => {
    if (!selectedPart) { setEvidence(null); setUnitCostSuggested(null); return; }
    getCogsEvidence(selectedPart.id)
      .then(ev => {
        setEvidence(ev);
        const suggested = suggestUnitCost(ev, conditionCode);
        setUnitCostSuggested(suggested);
        if (suggested != null && !unitCost) setUnitCost(String(suggested));
      })
      .catch(console.error);
  }, [selectedPart]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!evidence) return;
    const suggested = suggestUnitCost(evidence, conditionCode);
    setUnitCostSuggested(suggested);
    if (suggested != null) setUnitCost(String(suggested));
  }, [conditionCode, evidence]);

  useEffect(() => {
    const c = conditions.find(x => x.code === conditionCode);
    if (c && c.default_grade) setGrade(c.default_grade);
  }, [conditionCode, conditions]);

  useEffect(() => {
    if (!selectedPart || !grade) { setGradeRule(null); return; }
    getGradeMultiplier(selectedPart.id, grade).then(setGradeRule).catch(console.error);
  }, [selectedPart, grade]);

  const reset = () => {
    setTypeCode(''); setMfr(''); setPartQuery(''); setSelectedPart(null);
    setConditionCode('unspecified'); setGrade(''); setQty(1); setUnitCost('');
    setUnitCostSuggested(null); setEvidence(null); setGradeRule(null);
    setFreeText(false); setFreeDesc('');
  };

  const handleAdd = useCallback(() => {
    if (freeText) {
      if (!freeDesc || !qty || !unitCost) return;
      onAdd({
        part_catalog_id: null, condition_code: null, grade: null,
        description: freeDesc, manufacturer: null, catalog_number: null,
        qty: Number(qty), unit_cost: Number(unitCost),
      });
      reset();
      return;
    }
    if (!selectedPart || !qty || !unitCost) return;
    onAdd({
      part_catalog_id: selectedPart.id,
      condition_code: conditionCode || null,
      grade: grade || null,
      description: `${selectedPart.manufacturer} ${selectedPart.catalog_number}` +
                   (conditionCode && conditionCode !== 'unspecified' ? ` (${conditionCode})` : ''),
      manufacturer: selectedPart.manufacturer,
      catalog_number: selectedPart.catalog_number,
      qty: Number(qty),
      unit_cost: Number(unitCost),
    });
    reset();
  }, [freeText, freeDesc, selectedPart, conditionCode, grade, qty, unitCost, onAdd]);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, background: '#fafbfa' }}>
      {!freeText && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 8, marginBottom: 10 }}>
            <select value={typeCode} onChange={e => setTypeCode(e.target.value)} style={selStyle}>
              <option value="">All equipment types</option>
              {equipmentTypes.map(t => (
                <option key={t.equipment_type_code} value={t.equipment_type_code}>
                  {t.equipment_type_display}
                </option>
              ))}
            </select>

            <select value={mfr} onChange={e => setMfr(e.target.value)} style={selStyle} disabled={!typeCode}>
              <option value="">All manufacturers</option>
              {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <input
              type="text"
              placeholder="Search catalog number or display name"
              value={partQuery}
              onChange={e => setPartQuery(e.target.value)}
              style={inputStyle}
            />
          </div>

          {parts.length > 0 && (
            <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 4, marginBottom: 10, background: '#fff' }}>
              {parts.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPart(p)}
                  style={{
                    padding: '6px 10px', cursor: 'pointer',
                    background: selectedPart?.id === p.id ? '#578159' : 'transparent',
                    color: selectedPart?.id === p.id ? 'white' : 'inherit',
                    fontSize: 13, borderBottom: '1px solid #f1f1f1',
                  }}
                >
                  <strong>{p.manufacturer} {p.catalog_number}</strong>
                  {p.equipment_type_display && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>· {p.equipment_type_display}</span>}
                  {p.amp_rating && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>· {p.amp_rating}A</span>}
                  {p.poles && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>{p.poles}P</span>}
                  {p.needs_review && <span style={{ marginLeft: 8, fontSize: 10, color: '#b45309' }}>⚠ needs review</span>}
                </div>
              ))}
            </div>
          )}

          {selectedPart && (
            <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                {selectedPart.manufacturer} {selectedPart.catalog_number}
              </div>
              <EvidencePanel evidence={evidence} unitCostSuggested={unitCostSuggested} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.6fr 0.5fr 0.8fr 0.8fr', gap: 8, marginBottom: 8 }}>
            <select value={conditionCode} onChange={e => setConditionCode(e.target.value)} style={selStyle}>
              {conditions.map(c => <option key={c.code} value={c.code}>{c.display_name}</option>)}
            </select>
            <select value={grade} onChange={e => setGrade(e.target.value)} style={selStyle}>
              <option value="">Grade</option>
              {['A','B','C','D','ungraded'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <input type="number" min={1} step={1} value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" style={inputStyle} />
            <input
              type="number"
              step="0.01"
              value={unitCost}
              onChange={e => setUnitCost(e.target.value)}
              placeholder={unitCostSuggested != null ? `suggested ${fmt(unitCostSuggested)}` : 'Unit cost'}
              style={inputStyle}
            />
            <div style={{ fontSize: 13, padding: '6px 8px', alignSelf: 'center' }}>
              = <strong>{fmt(Number(qty) * Number(unitCost))}</strong>
            </div>
          </div>

          {gradeRule && gradeRule.multiplier != null && (
            <div style={{ fontSize: 11, color: '#555655', marginBottom: 8 }}>
              Grade {grade} pricing rule: <strong>{gradeRule.multiplier}x</strong> of grade A baseline
              ({gradeRule.source_scope === 'part' ? 'part-specific' : 'equipment-type-default'})
            </div>
          )}
        </>
      )}

      {freeText && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 0.8fr 0.8fr', gap: 8, marginBottom: 8 }}>
          <input type="text" placeholder="Description" value={freeDesc} onChange={e => setFreeDesc(e.target.value)} style={inputStyle} />
          <input type="number" min={1} step={1} value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" style={inputStyle} />
          <input type="number" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="Unit cost" style={inputStyle} />
          <div style={{ fontSize: 13, padding: '6px 8px', alignSelf: 'center' }}>
            = <strong>{fmt(Number(qty) * Number(unitCost))}</strong>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleAdd} style={btnPrimary}>+ Add component</button>
        {allowFreeText && (
          <button onClick={() => setFreeText(!freeText)} style={btnSecondary}>
            {freeText ? '← Catalog picker' : 'Free-text item'}
          </button>
        )}
      </div>
    </div>
  );
}

function EvidencePanel({ evidence }) {
  if (!evidence) return <div style={{ fontSize: 11, color: '#888' }}>Loading cost history...</div>;
  const s = evidence.summary;
  if (!s || !s.observation_count) {
    return <div style={{ fontSize: 12, color: '#888' }}>No COGS history yet for this part. Enter your own unit cost below.</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
      <div style={panelStyle}>
        <div style={panelLabel}>COGS history</div>
        <div>Observations: <strong>{s.observation_count}</strong></div>
        <div>Avg paid: <strong>{fmt(s.avg_unit_cost)}</strong></div>
        <div>Range: {fmt(s.min_unit_cost)} - {fmt(s.max_unit_cost)}</div>
        <div>Last PO: {s.last_po_date || '-'}</div>
      </div>
      <div style={panelStyle}>
        <div style={panelLabel}>By condition</div>
        {(evidence.by_condition || []).slice(0, 4).map(c => (
          <div key={c.condition_code}>
            {c.condition_display || c.condition_code}: <strong>{fmt(c.avg_unit_cost)}</strong>
            <span style={{ opacity: 0.6, marginLeft: 4 }}>(n={c.observation_count})</span>
          </div>
        ))}
      </div>
      <div style={panelStyle}>
        <div style={panelLabel}>Best vendor (cheapest)</div>
        {(evidence.by_vendor || []).slice(0, 3).map((v, i) => (
          <div key={i}>
            {v.vendor_name || '(no vendor)'}: <strong>{fmt(v.avg_unit_cost)}</strong>
            <span style={{ opacity: 0.6, marginLeft: 4 }}>(n={v.observation_count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = { padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 };
const selStyle   = { ...inputStyle, background: '#fff' };
const btnPrimary = { padding: '8px 16px', background: '#578159', color: 'white', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const btnSecondary = { padding: '8px 16px', background: 'transparent', color: '#555655', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, cursor: 'pointer' };
const panelStyle = { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, padding: '6px 8px', fontSize: 11, lineHeight: 1.6 };
const panelLabel = { fontWeight: 600, textTransform: 'uppercase', fontSize: 10, color: '#578159', letterSpacing: 0.5, marginBottom: 3 };

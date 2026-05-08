import { useState, useEffect, useCallback, Fragment } from 'react';
import { supabase } from '../lib/supabase';

function fmt(n) {
  return '$' + Number(n || 0).toFixed(4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

const UNITS = ['ft', 'cwt', 'pc', 'ea', 'lb', 'sqft', 'hr'];
const EMPTY = { name: '', spec: '', unit: 'ft', cost: '' };

const SOURCE_LABEL = {
  preferred_vendor_quote: { text: 'pref vendor', color: 'var(--green)' },
  latest_vendor_quote:    { text: 'vendor',      color: 'var(--blue)' },
  legacy_catalog:         { text: 'catalog',     color: 'var(--text3)' },
};

export default function MaterialsPage() {
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorById, setVendorById] = useState({});
  const [quotesByMat, setQuotesByMat] = useState({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [matsRes, vendorsRes] = await Promise.all([
      supabase.from('wes_materials_effective_cost').select('*').order('name').order('spec'),
      supabase.from('wes_vendors').select('id, name, active').eq('active', true).order('name'),
    ]);
    setRows(matsRes.data || []);
    setVendors(vendorsRes.data || []);
    setVendorById(Object.fromEntries((vendorsRes.data || []).map(v => [v.id, v])));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadQuotesFor(materialId) {
    if (quotesByMat[materialId]) return;
    const { data } = await supabase
      .from('wes_material_vendor_quotes')
      .select('*')
      .eq('material_id', materialId)
      .order('quote_date', { ascending: false });
    setQuotesByMat(prev => ({ ...prev, [materialId]: data || [] }));
  }

  function toggleExpand(materialId) {
    if (expandedId === materialId) {
      setExpandedId(null);
    } else {
      setExpandedId(materialId);
      loadQuotesFor(materialId);
    }
  }

  function openAdd() {
    setForm(EMPTY);
    setEditId(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(row) {
    setForm({ name: row.name, spec: row.spec, unit: row.unit, cost: row.legacy_cost });
    setEditId(row.id);
    setError('');
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditId(null);
    setError('');
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || form.cost === '') return setError('Name and cost are required.');
    setSaving(true);
    setError('');
    const row = { name: form.name.trim(), spec: form.spec.trim(), unit: form.unit, cost: parseFloat(form.cost) };
    let error;
    if (editId) {
      ({ error } = await supabase.from('wes_materials').update(row).eq('id', editId));
    } else {
      ({ error } = await supabase.from('wes_materials').insert(row));
    }
    setSaving(false);
    if (error) return setError(error.message);
    setShowForm(false);
    setEditId(null);
    load();
  }

  async function deleteMat(id) {
    if (!confirm('Delete this material? Existing job line items keep their persisted unit cost. Vendor quotes for this material will also be removed.')) return;
    await supabase.from('wes_materials').delete().eq('id', id);
    setRows(prev => prev.filter(m => m.id !== id));
  }

  async function setPreferredVendor(materialId, vendorId) {
    const { error } = await supabase
      .from('wes_materials')
      .update({ preferred_vendor_id: vendorId || null })
      .eq('id', materialId);
    if (error) return setError(error.message);
    load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Material library</h1>
          <div className="sub">{rows.length} materials · costs resolve from vendor quotes when available</div>
        </div>
        <button className="primary" onClick={openAdd}>+ Add material</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11, marginBottom: 16 }}>
            {editId ? 'Edit material' : 'Add material'}
          </div>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={save}>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div><label>Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. SQ Tube, Flat Plate, Caster" /></div>
              <div><label>Spec / description</label><input value={form.spec} onChange={e => setForm(p => ({ ...p, spec: e.target.value }))} placeholder='e.g. 2" 11GA, 6"x2" Poly Swivel' /></div>
            </div>
            <div className="grid2" style={{ marginBottom: 16 }}>
              <div>
                <label>Unit</label>
                <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label>Catalog/legacy cost ($) *</label>
                <input type="number" step="0.0001" min="0" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="0.00" />
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Used as fallback when no vendor quote is on file.</div>
              </div>
            </div>
            <div className="row">
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add material'}</button>
              <button type="button" onClick={cancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Spec</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Effective cost</th>
                <th>Source</th>
                <th>Preferred vendor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(m => {
                const sourceMeta = SOURCE_LABEL[m.cost_source] || SOURCE_LABEL.legacy_catalog;
                const sourcedVendor = m.sourced_vendor_id ? vendorById[m.sourced_vendor_id]?.name : null;
                const isOpen = expandedId === m.id;
                return (
                  <Fragment key={m.id}>
                    <tr>
                      <td style={{ width: 28 }}>
                        <button className="sm" onClick={() => toggleExpand(m.id)} style={{ padding: '2px 8px' }}>
                          {isOpen ? '−' : '+'}
                        </button>
                      </td>
                      <td style={{ fontWeight: 500 }}>{m.name}</td>
                      <td style={{ color: 'var(--text2)' }}>{m.spec || '—'}</td>
                      <td><span className="tag">{m.unit}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>
                        {fmt(m.effective_unit_cost)}/{m.unit}
                      </td>
                      <td>
                        <span className="tag" style={{ color: sourceMeta.color, borderColor: 'currentColor' }}>
                          {sourceMeta.text}
                        </span>
                        {sourcedVendor && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{sourcedVendor}</div>}
                      </td>
                      <td>
                        <select
                          value={m.preferred_vendor_id || ''}
                          onChange={e => setPreferredVendor(m.id, e.target.value)}
                          style={{ fontSize: 12, padding: '4px 6px' }}
                        >
                          <option value="">— none —</option>
                          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="sm" onClick={() => openEdit(m)} style={{ marginRight: 6 }}>Edit</button>
                        <button className="sm danger" onClick={() => deleteMat(m.id)}>Delete</button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ background: 'var(--surface2)' }}>
                        <td></td>
                        <td colSpan={7} style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>
                            Vendor quotes &nbsp; <span style={{ color: 'var(--text3)' }}>(legacy/catalog cost: {fmt(m.legacy_cost)}/{m.unit})</span>
                          </div>
                          {!quotesByMat[m.id] ? (
                            <div style={{ color: 'var(--text3)', fontSize: 12 }}>Loading quotes…</div>
                          ) : quotesByMat[m.id].length === 0 ? (
                            <div style={{ color: 'var(--text3)', fontSize: 12 }}>No vendor quotes on file. Effective cost falls back to catalog price.</div>
                          ) : (
                            <table style={{ marginTop: 4 }}>
                              <thead>
                                <tr>
                                  <th>Vendor</th>
                                  <th>Quote #</th>
                                  <th>Vendor item</th>
                                  <th style={{ textAlign: 'right' }}>Unit price</th>
                                  <th>Date</th>
                                  <th>Expires</th>
                                </tr>
                              </thead>
                              <tbody>
                                {quotesByMat[m.id].map(q => {
                                  const expired = q.expires_at && new Date(q.expires_at) < new Date();
                                  return (
                                    <tr key={q.id}>
                                      <td>{vendorById[q.vendor_id]?.name || q.vendor_id}</td>
                                      <td style={{ color: 'var(--text2)' }}>{q.vendor_quote_number || '—'}</td>
                                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                                        {q.vendor_item_code ? <code style={{ marginRight: 6 }}>{q.vendor_item_code}</code> : null}
                                        {q.vendor_item_desc || ''}
                                      </td>
                                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(q.unit_price)}/{q.unit}</td>
                                      <td>{q.quote_date}</td>
                                      <td style={{ color: expired ? 'var(--red)' : 'var(--text2)' }}>
                                        {q.expires_at || '—'}{expired ? ' (expired)' : ''}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

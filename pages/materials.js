import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

function fmt(n) { return '$' + Number(n || 0).toFixed(4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); }

const UNITS = ['ft', 'cwt', 'pc', 'ea', 'lb', 'sqft'];

const EMPTY = { name: '', spec: '', unit: 'ft', cost: '' };

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('wes_materials').select('*').order('name').order('spec');
    setMaterials(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm(EMPTY);
    setEditId(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(mat) {
    setForm({ name: mat.name, spec: mat.spec, unit: mat.unit, cost: mat.cost });
    setEditId(mat.id);
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
    if (!form.name.trim() || !form.cost) return setError('Name and cost are required.');
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
    if (!confirm('Delete this material? This will not affect existing job line items.')) return;
    await supabase.from('wes_materials').delete().eq('id', id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Material library</h1>
          <div className="sub">{materials.length} materials</div>
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
              <div><label>Unit cost ($) *</label><input type="number" step="0.0001" min="0" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="0.00" /></div>
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
                <th>Name</th>
                <th>Spec</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Unit cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {materials.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td style={{ color: 'var(--text2)' }}>{m.spec || '—'}</td>
                  <td><span className="tag">{m.unit}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmt(m.cost)}/{m.unit}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="sm" onClick={() => openEdit(m)} style={{ marginRight: 6 }}>Edit</button>
                    <button className="sm danger" onClick={() => deleteMat(m.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

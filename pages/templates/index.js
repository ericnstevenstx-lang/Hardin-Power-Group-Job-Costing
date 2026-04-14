import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const LABOR_RATE = 30;
function fmt(n) { return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

const CATEGORIES = ['spider-box', 'temp-skid', 'charging-station', 'general'];

function calcTemplateTotal(t) {
  const mat = (t.wes_template_materials || []).reduce((s, i) => s + i.qty * i.unit_cost, 0);
  const labor = (t.wes_template_labor || []).reduce((s, l) => s + l.hours * l.rate, 0);
  const comp = (t.wes_template_components || []).reduce((s, c) => s + c.qty * c.unit_cost, 0);
  return mat + labor + comp;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'general' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [spawning, setSpawning] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('wes_job_templates')
      .select(`*, wes_template_materials(*), wes_template_labor(*), wes_template_components(*)`)
      .order('category')
      .order('name');
    setTemplates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createTemplate(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required.');
    setSaving(true);
    const { data, error } = await supabase
      .from('wes_job_templates')
      .insert({ name: form.name.trim(), description: form.description.trim(), category: form.category })
      .select().single();
    setSaving(false);
    if (error) return setError(error.message);
    setShowForm(false);
    setForm({ name: '', description: '', category: 'general' });
    router.push('/templates/' + data.id);
  }

  async function spawnJob(template) {
    setSpawning(template.id);
    const customer = prompt('Customer name:') || '';
    const date = prompt('Date (e.g. 04/10/26):') || '';
    const { data: job, error: jobErr } = await supabase
      .from('wes_jobs')
      .insert({ name: template.name, customer, date, sell_price: 0 })
      .select().single();
    if (jobErr) { setSpawning(null); return alert(jobErr.message); }

    const matRows = (template.wes_template_materials || []).map(m => ({
      job_id: job.id, material_id: m.material_id,
      mat_name: m.mat_name, mat_spec: m.mat_spec,
      unit: m.unit, unit_cost: m.unit_cost, qty: m.qty,
    }));
    const laborRows = (template.wes_template_labor || []).map(l => ({
      job_id: job.id, description: l.description, hours: l.hours, rate: l.rate,
    }));
    const compRows = (template.wes_template_components || []).map(c => ({
      job_id: job.id, description: c.description, qty: c.qty, unit_cost: c.unit_cost,
    }));

    await Promise.all([
      matRows.length && supabase.from('wes_job_materials').insert(matRows),
      laborRows.length && supabase.from('wes_job_labor').insert(laborRows),
      compRows.length && supabase.from('wes_job_components').insert(compRows),
    ]);
    setSpawning(null);
    router.push('/jobs/' + job.id);
  }

  async function deleteTemplate(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this template?')) return;
    await supabase.from('wes_job_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = templates.filter(t => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Job templates</h1>
          <div className="sub">{templates.length} template{templates.length !== 1 ? 's' : ''} — click to edit BOM, use arrow to spawn job</div>
        </div>
        <button className="primary" onClick={() => setShowForm(true)}>+ New template</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11, marginBottom: 16 }}>New template</div>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={createTemplate}>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div><label>Template name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Temp Skid Frame 400A" /></div>
              <div>
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Description</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional notes about this unit type" />
            </div>
            <div className="row">
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setError(''); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>No templates yet.</div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="section-label">{cat.replace(/-/g, ' ')}</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Unit cost</th>
                    <th style={{ textAlign: 'right' }}>Lines</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(t => {
                    const total = calcTemplateTotal(t);
                    const lineCount = (t.wes_template_materials?.length || 0) + (t.wes_template_labor?.length || 0) + (t.wes_template_components?.length || 0);
                    return (
                      <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => router.push('/templates/' + t.id)}>
                        <td style={{ fontWeight: 500, color: 'var(--accent)' }}>{t.name}</td>
                        <td style={{ color: 'var(--text2)', fontSize: 12 }}>{t.description || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(total)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{lineCount}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="sm primary"
                            style={{ marginRight: 6 }}
                            disabled={spawning === t.id}
                            onClick={e => { e.stopPropagation(); spawnJob(t); }}
                          >
                            {spawning === t.id ? '...' : '→ New job'}
                          </button>
                          <button className="sm danger" onClick={e => deleteTemplate(t.id, e)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  );
}

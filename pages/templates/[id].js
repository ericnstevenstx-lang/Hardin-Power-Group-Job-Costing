import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

function fmt(n) { return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function fmtQty(n) { return parseFloat(Number(n).toFixed(4)).toString(); }

export default function TemplateDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [template, setTemplate] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [items, setItems] = useState([]);
  const [labor, setLabor] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [spawning, setSpawning] = useState(false);

  const [matForm, setMatForm] = useState({ material_id: '', qty: '', notes: '' });
  const [laborForm, setLaborForm] = useState({ description: '', hours: '', rate: '30' });
  const [compForm, setCompForm] = useState({ description: '', qty: '1', unit_cost: '' });
  const [saving, setSaving] = useState({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [tRes, matsRes, itemsRes, laborRes, compsRes] = await Promise.all([
      supabase.from('wes_job_templates').select('*').eq('id', id).single(),
      supabase.from('wes_materials').select('*').order('name'),
      supabase.from('wes_template_materials').select('*').eq('template_id', id),
      supabase.from('wes_template_labor').select('*').eq('template_id', id),
      supabase.from('wes_template_components').select('*').eq('template_id', id),
    ]);
    if (tRes.error) { setError('Template not found.'); setLoading(false); return; }
    setTemplate(tRes.data);
    setMaterials(matsRes.data || []);
    setItems(itemsRes.data || []);
    setLabor(laborRes.data || []);
    setComponents(compsRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const matTotal = items.reduce((s, i) => s + i.qty * i.unit_cost, 0);
  const laborTotal = labor.reduce((s, l) => s + l.hours * l.rate, 0);
  const compTotal = components.reduce((s, c) => s + c.qty * c.unit_cost, 0);
  const total = matTotal + laborTotal + compTotal;

  async function spawnJob() {
    setSpawning(true);
    const customer = prompt('Customer name:') || '';
    const date = prompt('Date (e.g. 04/10/26):') || '';
    const { data: job, error: jobErr } = await supabase
      .from('wes_jobs')
      .insert({ name: template.name, customer, date, sell_price: 0 })
      .select().single();
    if (jobErr) { setSpawning(false); return alert(jobErr.message); }
    const matRows = items.map(m => ({ job_id: job.id, material_id: m.material_id, mat_name: m.mat_name, mat_spec: m.mat_spec, unit: m.unit, unit_cost: m.unit_cost, qty: m.qty }));
    const laborRows = labor.map(l => ({ job_id: job.id, description: l.description, hours: l.hours, rate: l.rate }));
    const compRows = components.map(c => ({ job_id: job.id, description: c.description, qty: c.qty, unit_cost: c.unit_cost }));
    await Promise.all([
      matRows.length && supabase.from('wes_job_materials').insert(matRows),
      laborRows.length && supabase.from('wes_job_labor').insert(laborRows),
      compRows.length && supabase.from('wes_job_components').insert(compRows),
    ]);
    setSpawning(false);
    router.push('/jobs/' + job.id);
  }

  async function addMaterial(e) {
    e.preventDefault();
    const mat = materials.find(m => m.id === matForm.material_id);
    if (!mat || !matForm.qty) return setError('Select a material and enter quantity.');
    setSaving(p => ({ ...p, mat: true }));
    setError('');
    const row = { template_id: id, material_id: mat.id, mat_name: mat.name, mat_spec: mat.spec, unit: mat.unit, unit_cost: mat.cost, qty: parseFloat(matForm.qty), notes: matForm.notes };
    const { data, error } = await supabase.from('wes_template_materials').insert(row).select().single();
    setSaving(p => ({ ...p, mat: false }));
    if (error) return setError(error.message);
    setItems(prev => [...prev, data]);
    setMatForm({ material_id: matForm.material_id, qty: '', notes: '' });
  }

  async function addLabor(e) {
    e.preventDefault();
    if (!laborForm.hours) return setError('Enter hours.');
    setSaving(p => ({ ...p, labor: true }));
    setError('');
    const row = { template_id: id, description: laborForm.description || 'Labor', hours: parseFloat(laborForm.hours), rate: parseFloat(laborForm.rate) || 30 };
    const { data, error } = await supabase.from('wes_template_labor').insert(row).select().single();
    setSaving(p => ({ ...p, labor: false }));
    if (error) return setError(error.message);
    setLabor(prev => [...prev, data]);
    setLaborForm({ description: '', hours: '', rate: '30' });
  }

  async function addComponent(e) {
    e.preventDefault();
    if (!compForm.description || !compForm.unit_cost) return setError('Enter description and unit cost.');
    setSaving(p => ({ ...p, comp: true }));
    setError('');
    const row = { template_id: id, description: compForm.description, qty: parseFloat(compForm.qty) || 1, unit_cost: parseFloat(compForm.unit_cost) };
    const { data, error } = await supabase.from('wes_template_components').insert(row).select().single();
    setSaving(p => ({ ...p, comp: false }));
    if (error) return setError(error.message);
    setComponents(prev => [...prev, data]);
    setCompForm({ description: '', qty: '1', unit_cost: '' });
  }

  async function removeRow(table, rowId, setter) {
    await supabase.from(table).delete().eq('id', rowId);
    setter(prev => prev.filter(r => r.id !== rowId));
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!template) return <div className="alert error">{error || 'Template not found.'}</div>;

  const selectedMat = materials.find(m => m.id === matForm.material_id);

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 4 }}>
            <Link href="/templates">← Templates</Link>
          </div>
          <h1>{template.name}</h1>
          {template.description && <div className="sub">{template.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="tag" style={{ alignSelf: 'center' }}>{template.category}</span>
          <button className="primary" onClick={spawnJob} disabled={spawning}>
            {spawning ? 'Creating job...' : '→ Spawn new job'}
          </button>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid3" style={{ marginBottom: 28 }}>
        <div className="metric"><div className="label">Material</div><div className="value">{fmt(matTotal)}</div></div>
        <div className="metric"><div className="label">Labor</div><div className="value">{fmt(laborTotal)}</div></div>
        <div className="metric"><div className="label">Unit cost</div><div className="value" style={{ color: 'var(--accent)' }}>{fmt(total)}</div></div>
      </div>

      {/* MATERIALS */}
      <div className="section-label">Materials</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={addMaterial}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="grow">
              <select value={matForm.material_id} onChange={e => setMatForm(p => ({ ...p, material_id: e.target.value }))}>
                <option value="">Select material...</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} {m.spec} — {fmt(m.cost)}/{m.unit}</option>)}
              </select>
            </div>
            <div style={{ width: 110 }}>
              <input type="number" step="any" min="0" value={matForm.qty} onChange={e => setMatForm(p => ({ ...p, qty: e.target.value }))} placeholder={selectedMat ? `Qty (${selectedMat.unit})` : 'Qty'} />
            </div>
            <div style={{ width: 160 }}>
              <input value={matForm.notes} onChange={e => setMatForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" />
            </div>
            {selectedMat && matForm.qty && (
              <div style={{ width: 90, padding: '8px 0', color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                = {fmt(parseFloat(matForm.qty) * selectedMat.cost)}
              </div>
            )}
            <button type="submit" className="primary" disabled={saving.mat}>{saving.mat ? '...' : 'Add'}</button>
          </div>
        </form>
        {items.length > 0 ? (
          <table>
            <thead>
              <tr><th>Material</th><th style={{ textAlign: 'right' }}>Qty</th><th>Unit</th><th style={{ textAlign: 'right' }}>Unit cost</th><th style={{ textAlign: 'right' }}>Line total</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td>{i.mat_name} <span className="tag">{i.mat_spec}</span></td>
                  <td style={{ textAlign: 'right' }}>{fmtQty(i.qty)}</td>
                  <td style={{ color: 'var(--text2)' }}>{i.unit}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(i.unit_cost)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(i.qty * i.unit_cost)}</td>
                  <td style={{ color: 'var(--text2)', fontSize: 12 }}>{i.notes || '—'}</td>
                  <td><button className="sm danger" onClick={() => removeRow('wes_template_materials', i.id, setItems)}>×</button></td>
                </tr>
              ))}
              <tr style={{ background: 'var(--surface2)' }}>
                <td colSpan={4} style={{ textAlign: 'right', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subtotal</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmt(matTotal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        ) : <div style={{ color: 'var(--text3)', fontSize: 12, paddingTop: 4 }}>No materials added.</div>}
      </div>

      {/* LABOR */}
      <div className="section-label">Labor</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={addLabor}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="grow"><input value={laborForm.description} onChange={e => setLaborForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" /></div>
            <div style={{ width: 110 }}><input type="number" step="0.25" min="0" value={laborForm.hours} onChange={e => setLaborForm(p => ({ ...p, hours: e.target.value }))} placeholder="Hours" /></div>
            <div style={{ width: 100 }}><input type="number" step="0.01" min="0" value={laborForm.rate} onChange={e => setLaborForm(p => ({ ...p, rate: e.target.value }))} placeholder="Rate" /></div>
            {laborForm.hours && <div style={{ width: 90, padding: '8px 0', color: 'var(--text2)', fontSize: 12 }}>= {fmt(parseFloat(laborForm.hours) * (parseFloat(laborForm.rate) || 30))}</div>}
            <button type="submit" className="primary" disabled={saving.labor}>{saving.labor ? '...' : 'Add'}</button>
          </div>
        </form>
        {labor.length > 0 ? (
          <table>
            <thead><tr><th>Description</th><th style={{ textAlign: 'right' }}>Hours</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Line total</th><th></th></tr></thead>
            <tbody>
              {labor.map(l => (
                <tr key={l.id}>
                  <td>{l.description}</td>
                  <td style={{ textAlign: 'right' }}>{fmtQty(l.hours)} hr</td>
                  <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{fmt(l.rate)}/hr</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.hours * l.rate)}</td>
                  <td><button className="sm danger" onClick={() => removeRow('wes_template_labor', l.id, setLabor)}>×</button></td>
                </tr>
              ))}
              <tr style={{ background: 'var(--surface2)' }}>
                <td colSpan={3} style={{ textAlign: 'right', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subtotal</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmt(laborTotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        ) : <div style={{ color: 'var(--text3)', fontSize: 12, paddingTop: 4 }}>No labor added.</div>}
      </div>

      {/* COMPONENTS */}
      <div className="section-label">Components & misc</div>
      <div className="card">
        <form onSubmit={addComponent}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="grow"><input value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (e.g. 6&quot; rings, meter socket)" /></div>
            <div style={{ width: 80 }}><input type="number" step="1" min="1" value={compForm.qty} onChange={e => setCompForm(p => ({ ...p, qty: e.target.value }))} placeholder="Qty" /></div>
            <div style={{ width: 120 }}><input type="number" step="0.01" min="0" value={compForm.unit_cost} onChange={e => setCompForm(p => ({ ...p, unit_cost: e.target.value }))} placeholder="Unit cost" /></div>
            {compForm.qty && compForm.unit_cost && <div style={{ width: 90, padding: '8px 0', color: 'var(--text2)', fontSize: 12 }}>= {fmt(parseFloat(compForm.qty) * parseFloat(compForm.unit_cost))}</div>}
            <button type="submit" className="primary" disabled={saving.comp}>{saving.comp ? '...' : 'Add'}</button>
          </div>
        </form>
        {components.length > 0 ? (
          <table>
            <thead><tr><th>Description</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit cost</th><th style={{ textAlign: 'right' }}>Line total</th><th></th></tr></thead>
            <tbody>
              {components.map(c => (
                <tr key={c.id}>
                  <td>{c.description}</td>
                  <td style={{ textAlign: 'right' }}>{fmtQty(c.qty)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(c.unit_cost)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.qty * c.unit_cost)}</td>
                  <td><button className="sm danger" onClick={() => removeRow('wes_template_components', c.id, setComponents)}>×</button></td>
                </tr>
              ))}
              <tr style={{ background: 'var(--surface2)' }}>
                <td colSpan={3} style={{ textAlign: 'right', fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subtotal</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmt(compTotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        ) : <div style={{ color: 'var(--text3)', fontSize: 12, paddingTop: 4 }}>No components added.</div>}
      </div>
    </>
  );
}

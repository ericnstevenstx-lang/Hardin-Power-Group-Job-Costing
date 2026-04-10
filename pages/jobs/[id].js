import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const LABOR_RATE = 30;
function fmt(n) { return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function fmtQty(n) { return parseFloat(Number(n).toFixed(4)).toString(); }

export default function JobDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [job, setJob] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [items, setItems] = useState([]);
  const [labor, setLabor] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [matForm, setMatForm] = useState({ material_id: '', qty: '' });
  const [laborForm, setLaborForm] = useState({ description: '', hours: '' });
  const [compForm, setCompForm] = useState({ description: '', qty: '1', unit_cost: '' });
  const [sellPrice, setSellPrice] = useState('');
  const [saving, setSaving] = useState({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [jobRes, matsRes, itemsRes, laborRes, compsRes] = await Promise.all([
      supabase.from('wes_jobs').select('*').eq('id', id).single(),
      supabase.from('wes_materials').select('*').order('name'),
      supabase.from('wes_job_materials').select('*').eq('job_id', id).order('created_at'),
      supabase.from('wes_job_labor').select('*').eq('job_id', id).order('created_at'),
      supabase.from('wes_job_components').select('*').eq('job_id', id).order('created_at'),
    ]);
    if (jobRes.error) { setError('Job not found.'); setLoading(false); return; }
    setJob(jobRes.data);
    setSellPrice(jobRes.data.sell_price > 0 ? jobRes.data.sell_price : '');
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
  const sp = parseFloat(sellPrice) || 0;
  const margin = sp > 0 ? ((sp - total) / sp * 100) : null;

  async function updateSellPrice(val) {
    setSellPrice(val);
    const price = parseFloat(val) || 0;
    await supabase.from('wes_jobs').update({ sell_price: price }).eq('id', id);
    setJob(prev => ({ ...prev, sell_price: price }));
  }

  async function addMaterial(e) {
    e.preventDefault();
    if (!matForm.material_id || !matForm.qty) return setError('Select a material and enter quantity.');
    const mat = materials.find(m => m.id === matForm.material_id);
    if (!mat) return;
    setSaving(p => ({ ...p, mat: true }));
    setError('');
    const row = { job_id: id, material_id: mat.id, mat_name: mat.name, mat_spec: mat.spec, unit: mat.unit, unit_cost: mat.cost, qty: parseFloat(matForm.qty) };
    const { data, error } = await supabase.from('wes_job_materials').insert(row).select().single();
    setSaving(p => ({ ...p, mat: false }));
    if (error) return setError(error.message);
    setItems(prev => [...prev, data]);
    setMatForm({ material_id: matForm.material_id, qty: '' });
  }

  async function addLabor(e) {
    e.preventDefault();
    if (!laborForm.hours) return setError('Enter hours.');
    setSaving(p => ({ ...p, labor: true }));
    setError('');
    const row = { job_id: id, description: laborForm.description || 'Labor', hours: parseFloat(laborForm.hours), rate: LABOR_RATE };
    const { data, error } = await supabase.from('wes_job_labor').insert(row).select().single();
    setSaving(p => ({ ...p, labor: false }));
    if (error) return setError(error.message);
    setLabor(prev => [...prev, data]);
    setLaborForm({ description: '', hours: '' });
  }

  async function addComponent(e) {
    e.preventDefault();
    if (!compForm.description || !compForm.unit_cost) return setError('Enter description and unit cost.');
    setSaving(p => ({ ...p, comp: true }));
    setError('');
    const row = { job_id: id, description: compForm.description, qty: parseFloat(compForm.qty) || 1, unit_cost: parseFloat(compForm.unit_cost) };
    const { data, error } = await supabase.from('wes_job_components').insert(row).select().single();
    setSaving(p => ({ ...p, comp: false }));
    if (error) return setError(error.message);
    setComponents(prev => [...prev, data]);
    setCompForm({ description: '', qty: '1', unit_cost: '' });
  }

  async function removeRow(table, rowId, setter) {
    await supabase.from(table).delete().eq('id', rowId);
    setter(prev => prev.filter(r => r.id !== rowId));
  }

  async function createQuote() {
    const quoteNum = 'HPG-' + String(Date.now()).slice(-5);
    const { data: q, error: qErr } = await supabase.from('wes_quotes').insert({
      job_id: id, quote_number: quoteNum,
      customer: job.customer || '', date: job.date || '',
      status: 'draft',
    }).select().single();
    if (qErr) return alert(qErr.message);
    const qlines = [];
    let order = 0;
    items.forEach(m => qlines.push({ quote_id: q.id, sort_order: order++, item_type: 'material', description: (m.mat_name + ' ' + m.mat_spec).trim(), qty: m.qty, unit: m.unit, unit_price: m.unit_cost }));
    labor.forEach(l => qlines.push({ quote_id: q.id, sort_order: order++, item_type: 'labor', description: l.description, qty: l.hours, unit: 'hr', unit_price: l.rate }));
    components.forEach(c => qlines.push({ quote_id: q.id, sort_order: order++, item_type: 'component', description: c.description, qty: c.qty, unit: 'ea', unit_price: c.unit_cost }));
    if (qlines.length) await supabase.from('wes_quote_lines').insert(qlines);
    router.push('/quotes/' + q.id);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!job) return <div className="alert error">{error || 'Job not found.'}</div>;

  const selectedMat = materials.find(m => m.id === matForm.material_id);

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 4 }}>
            <Link href="/jobs">← Jobs</Link>
          </div>
          <h1>{job.name}</h1>
          {(job.customer || job.date) && (
            <div className="sub">{job.customer}{job.customer && job.date ? ' · ' : ''}{job.date}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <button onClick={createQuote} style={{ alignSelf: 'flex-end' }}>→ Create quote</button>
          <div>
          <label style={{ display: 'block', marginBottom: 5 }}>Sell price</label>
          <input
            type="number"
            step="0.01"
            value={sellPrice}
            onChange={e => setSellPrice(e.target.value)}
            onBlur={e => updateSellPrice(e.target.value)}
            placeholder="0.00"
            style={{ width: 160, textAlign: 'right' }}
          />
          </div>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid4" style={{ marginBottom: 28 }}>
        <div className="metric">
          <div className="label">Material</div>
          <div className="value">{fmt(matTotal)}</div>
        </div>
        <div className="metric">
          <div className="label">Labor</div>
          <div className="value">{fmt(laborTotal)}</div>
        </div>
        <div className="metric">
          <div className="label">Components</div>
          <div className="value">{fmt(compTotal)}</div>
        </div>
        <div className="metric">
          <div className="label">Total cost</div>
          <div className="value" style={{ color: 'var(--accent)' }}>{fmt(total)}</div>
        </div>
      </div>

      {sp > 0 && (
        <div className="grid2" style={{ marginBottom: 28 }}>
          <div className="metric">
            <div className="label">Gross profit</div>
            <div className={`value ${sp - total >= 0 ? 'green' : 'red'}`}>{fmt(sp - total)}</div>
          </div>
          <div className="metric">
            <div className="label">Margin</div>
            <div className={`value ${margin >= 0 ? 'green' : 'red'}`}>{margin !== null ? margin.toFixed(1) + '%' : '—'}</div>
          </div>
        </div>
      )}

      {/* MATERIALS */}
      <div className="section-label">Materials</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={addMaterial}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="grow">
              <select value={matForm.material_id} onChange={e => setMatForm(p => ({ ...p, material_id: e.target.value }))}>
                <option value="">Select material...</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} {m.spec} — {fmt(m.cost)}/{m.unit}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 120 }}>
              <input
                type="number"
                step="any"
                min="0"
                value={matForm.qty}
                onChange={e => setMatForm(p => ({ ...p, qty: e.target.value }))}
                placeholder={selectedMat ? `Qty (${selectedMat.unit})` : 'Qty'}
              />
            </div>
            {selectedMat && matForm.qty && (
              <div style={{ width: 100, padding: '8px 0', color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                = {fmt(parseFloat(matForm.qty) * selectedMat.cost)}
              </div>
            )}
            <button type="submit" className="primary" disabled={saving.mat}>{saving.mat ? '...' : 'Add'}</button>
          </div>
        </form>

        {items.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Unit cost</th>
                <th style={{ textAlign: 'right' }}>Line total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td>{i.mat_name} <span className="tag">{i.mat_spec}</span></td>
                  <td style={{ textAlign: 'right' }}>{fmtQty(i.qty)}</td>
                  <td style={{ color: 'var(--text2)' }}>{i.unit}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(i.unit_cost)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(i.qty * i.unit_cost)}</td>
                  <td><button className="sm danger" onClick={() => removeRow('wes_job_materials', i.id, setItems)}>×</button></td>
                </tr>
              ))}
              <tr style={{ background: 'var(--surface2)' }}>
                <td colSpan={4} style={{ textAlign: 'right', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text2)' }}>Subtotal</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmt(matTotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--text3)', fontSize: 12, paddingTop: 4 }}>No materials added.</div>
        )}
      </div>

      {/* LABOR */}
      <div className="section-label">Labor <span style={{ fontWeight: 400, color: 'var(--text3)' }}>@ {fmt(LABOR_RATE)}/hr</span></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={addLabor}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="grow">
              <input value={laborForm.description} onChange={e => setLaborForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional, e.g. welding, wiring)" />
            </div>
            <div style={{ width: 120 }}>
              <input type="number" step="0.25" min="0" value={laborForm.hours} onChange={e => setLaborForm(p => ({ ...p, hours: e.target.value }))} placeholder="Hours" />
            </div>
            {laborForm.hours && (
              <div style={{ width: 100, padding: '8px 0', color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                = {fmt(parseFloat(laborForm.hours) * LABOR_RATE)}
              </div>
            )}
            <button type="submit" className="primary" disabled={saving.labor}>{saving.labor ? '...' : 'Add'}</button>
          </div>
        </form>

        {labor.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Hours</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Line total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {labor.map(l => (
                <tr key={l.id}>
                  <td>{l.description}</td>
                  <td style={{ textAlign: 'right' }}>{fmtQty(l.hours)} hr</td>
                  <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{fmt(l.rate)}/hr</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.hours * l.rate)}</td>
                  <td><button className="sm danger" onClick={() => removeRow('wes_job_labor', l.id, setLabor)}>×</button></td>
                </tr>
              ))}
              <tr style={{ background: 'var(--surface2)' }}>
                <td colSpan={3} style={{ textAlign: 'right', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text2)' }}>Subtotal</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmt(laborTotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--text3)', fontSize: 12, paddingTop: 4 }}>No labor added.</div>
        )}
      </div>

      {/* COMPONENTS */}
      <div className="section-label">Components & misc</div>
      <div className="card">
        <form onSubmit={addComponent}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="grow">
              <input value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (e.g. 200A Main Breaker, meter socket)" />
            </div>
            <div style={{ width: 80 }}>
              <input type="number" step="1" min="1" value={compForm.qty} onChange={e => setCompForm(p => ({ ...p, qty: e.target.value }))} placeholder="Qty" />
            </div>
            <div style={{ width: 120 }}>
              <input type="number" step="0.01" min="0" value={compForm.unit_cost} onChange={e => setCompForm(p => ({ ...p, unit_cost: e.target.value }))} placeholder="Unit cost" />
            </div>
            {compForm.qty && compForm.unit_cost && (
              <div style={{ width: 100, padding: '8px 0', color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                = {fmt(parseFloat(compForm.qty) * parseFloat(compForm.unit_cost))}
              </div>
            )}
            <button type="submit" className="primary" disabled={saving.comp}>{saving.comp ? '...' : 'Add'}</button>
          </div>
        </form>

        {components.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit cost</th>
                <th style={{ textAlign: 'right' }}>Line total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {components.map(c => (
                <tr key={c.id}>
                  <td>{c.description}</td>
                  <td style={{ textAlign: 'right' }}>{fmtQty(c.qty)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(c.unit_cost)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.qty * c.unit_cost)}</td>
                  <td><button className="sm danger" onClick={() => removeRow('wes_job_components', c.id, setComponents)}>×</button></td>
                </tr>
              ))}
              <tr style={{ background: 'var(--surface2)' }}>
                <td colSpan={3} style={{ textAlign: 'right', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text2)' }}>Subtotal</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{fmt(compTotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--text3)', fontSize: 12, paddingTop: 4 }}>No components added.</div>
        )}
      </div>
    </>
  );
}

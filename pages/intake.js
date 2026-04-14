import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

function fmt(n) { return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

const PRODUCT_LABELS = {
  'spider-box': 'Spider Box Rack',
  'charging-station': 'Charging Station Frame',
  'temp-skid': 'Temp Power Skid Frame',
};

const COMPONENT_PRESETS = {
  'temp-skid': ['Transformer','Distribution panel','HV panel','LV panel','Disconnect switch','Meter socket','Main breaker','Bus bar','Cable tray'],
  'charging-station': ['EV charger unit','Distribution panel','Main breaker','Bus bar','Disconnect switch','Meter socket'],
  'spider-box': ['Spider box assembly','Outlet receptacles','GFCI breaker'],
};

const SYSTEM_PROMPT = `You are a fabrication BOM extraction engine for Hardin Power Group, Dallas TX.
You will be shown a hand-drawn or printed technical drawing of a Spider Box Rack, Charging Station Frame, or Temp Power Skid Frame.

Extract ALL dimensional data and return ONLY valid JSON in this exact structure:
{
  "product_type": "spider-box" | "charging-station" | "temp-skid",
  "confidence": 0.0-1.0,
  "dimensions": {
    "description": "brief summary of what you read",
    "members": [
      {"description": "e.g. 2x2 11GA SQ tube main rails", "qty": 2, "length_inches": 120, "unit": "each"}
    ],
    "notes": ["any flagged ambiguities or re-draw notes"]
  },
  "bom": [
    {
      "mat_name": "SQ Tube",
      "mat_spec": "2\\\" 11GA",
      "qty": 23.5,
      "unit": "ft",
      "unit_cost": 4.00,
      "line_total": 94.00,
      "source": "calculated from drawing"
    }
  ],
  "labor_hours": 12,
  "warnings": []
}

MATERIAL RATES (use exactly):
- SQ Tube 1-1/2" 11GA: $3.00/ft — spider box frame only
- SQ Tube 2" 11GA: $4.00/ft — charging station and temp skid frames
- Rec Tube 6x3 11GA: $9.32/ft — fork pockets
- Caster 6"x2" Poly Swivel w/Brake: $45.51/ea
- Caster 6"x2" Poly Rigid: $29.99/ea
- Powder Coat Polyester TGIC Gloss: $18.00/lb
- Consumables MIG wire gas grinder: $5.00/hr
- Plasma Consumables Tips electrodes gas: $8.00/hr
- 10GA 4x8 HR sheet: $75.00/cwt (180 lbs per sheet)
- 16GA 5x10 sheet: $95.00/pc
- Flat Plate 1/4" 4x8: $98.00/cwt
- Angle 2x2x1/8: $90.00/cwt

SPIDER BOX defaults (use if dims unclear): 23ft 1.5" tube, 2 swivel casters, 2 rigid casters, 6 rings $1.20ea, 0.5lb powder coat, 5hr labor, 0.25hr plasma rails.
CHARGING STATION defaults: 120"x2 + 116"x1 + 80"x5 + 56"x3 + 54"x1 + 44"x3 + 23"x2 + 21"x4 + 20"x2 (all 2"x2" 11GA), 4 swivel, 4 rigid casters, 0.5lb powder coat, 12hr labor.
TEMP SKID FRAME defaults: variable size, 2"x2" 11GA for all members, 6x3 rec tube for fork pockets, 4 swivel casters, 4 rigid casters, 0.5lb powder coat, 12hr labor. Extract actual footage from drawing if visible.

Convert all inch measurements to decimal feet for qty. Return ONLY the JSON object, no markdown, no preamble.`;

export default function DrawingIntakePage() {
  const router = useRouter();
  const fileRef = useRef();
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [fileType, setFileType] = useState('image');
  const [productType, setProductType] = useState('spider-box');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [editBom, setEditBom] = useState([]);
  const [components, setComponents] = useState([]);
  const [compForm, setCompForm] = useState({ description: '', qty: '1', unit_cost: '' });
  const [jobName, setJobName] = useState('');
  const [jobCustomer, setJobCustomer] = useState('');
  const [creating, setCreating] = useState(false);
  const [notes, setNotes] = useState('');

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    setFileType(isPdf ? 'pdf' : 'image');
    setImage(isPdf ? null : URL.createObjectURL(file));
    setResult(null);
    setError('');
    const reader = new FileReader();
    reader.onload = ev => setImageData(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  }

  async function parseDrawing() {
    if (!imageData) return setError('Upload an image first.');
    setParsing(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: [
              fileType === 'pdf'
                ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageData } }
                : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData } },
              { type: 'text', text: `Extract the frame BOM from this ${PRODUCT_LABELS[productType]} drawing. Return only the JSON.` }
            ]
          }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === 'text')?.text || '';
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setResult(parsed);
      setEditBom(parsed.bom || []);
      if (parsed.product_type) setProductType(parsed.product_type);
      setJobName(`${PRODUCT_LABELS[parsed.product_type || productType]} — ${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'2-digit'})}`);
    } catch (err) {
      setError('Parse failed: ' + err.message);
    }
    setParsing(false);
  }

  function updateBomLine(idx, field, val) {
    setEditBom(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const u = { ...l, [field]: (field === 'qty' || field === 'unit_cost') ? parseFloat(val) || 0 : val };
      u.line_total = parseFloat((u.qty * u.unit_cost).toFixed(2));
      return u;
    }));
  }

  function addComp(e) {
    e.preventDefault();
    if (!compForm.description) return;
    setComponents(prev => [...prev, {
      description: compForm.description,
      qty: parseFloat(compForm.qty) || 1,
      unit_cost: parseFloat(compForm.unit_cost) || 0,
    }]);
    setCompForm({ description: '', qty: '1', unit_cost: '' });
  }

  function updateComp(idx, field, val) {
    setComponents(prev => prev.map((c, i) => i !== idx ? c : { ...c, [field]: (field === 'qty' || field === 'unit_cost') ? parseFloat(val) || 0 : val }));
  }

  function usePreset(desc) {
    setCompForm(p => ({ ...p, description: desc }));
  }

  const matTotal = editBom.reduce((s, l) => s + (l.qty * l.unit_cost || 0), 0);
  const laborCost = (result?.labor_hours || 0) * 30;
  const consumablesCost = (result?.labor_hours || 0) * 5;
  const compTotal = components.reduce((s, c) => s + (c.qty * c.unit_cost || 0), 0);
  const grandTotal = matTotal + laborCost + consumablesCost + compTotal;
  const confidenceColor = result ? (result.confidence >= 0.8 ? 'var(--color-text-success)' : result.confidence >= 0.5 ? 'var(--color-text-warning)' : 'var(--color-text-danger)') : '';

  async function createJob() {
    if (!jobName.trim()) return setError('Enter a job name.');
    setCreating(true);
    setError('');

    const { data: intake } = await supabase.from('wes_drawing_intake').insert({
      product_type: productType,
      raw_extraction: result || {},
      confirmed_bom: editBom,
      status: 'confirmed',
      notes,
    }).select().single();

    const { data: job, error: jobErr } = await supabase.from('wes_jobs').insert({
      name: jobName.trim(),
      customer: jobCustomer.trim(),
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      sell_price: 0,
    }).select().single();

    if (jobErr) { setCreating(false); return setError(jobErr.message); }
    await supabase.from('wes_drawing_intake').update({ job_id: job.id }).eq('id', intake.id);

    const matRows = [];
    for (const l of editBom) {
      const { data: mat } = await supabase.from('wes_materials').select('id').eq('name', l.mat_name).eq('spec', l.mat_spec || '').maybeSingle();
      matRows.push({ job_id: job.id, material_id: mat?.id || null, mat_name: l.mat_name, mat_spec: l.mat_spec || '', unit: l.unit, unit_cost: l.unit_cost, qty: l.qty });
    }
    if (matRows.length) await supabase.from('wes_job_materials').insert(matRows);

    if (result?.labor_hours) {
      await supabase.from('wes_job_labor').insert({ job_id: job.id, description: 'Fabrication', hours: result.labor_hours, rate: 30 });
      await supabase.from('wes_job_materials').insert({ job_id: job.id, material_id: null, mat_name: 'Consumables', mat_spec: 'MIG wire, gas, grinder wheels, tips', unit: 'hr', unit_cost: 5, qty: result.labor_hours });
    }

    if (components.length) {
      const compRows = components.map(c => ({ job_id: job.id, description: c.description, qty: c.qty, unit_cost: c.unit_cost }));
      await supabase.from('wes_job_components').insert(compRows);
    }

    setCreating(false);
    router.push('/jobs/' + job.id);
  }

  const presets = COMPONENT_PRESETS[productType] || [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Drawing intake</h1>
          <div className="sub">Upload drawing → extract frame BOM → add components → create job</div>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid2" style={{ marginBottom: 20, alignItems: 'start' }}>
        <div className="card">
          <div className="section-label">1. Upload drawing</div>
          <div style={{ marginBottom: 12 }}>
            <label>Product type</label>
            <select value={productType} onChange={e => setProductType(e.target.value)} style={{ marginTop: 5 }}>
              <option value="spider-box">Spider Box Rack</option>
              <option value="charging-station">Charging Station Frame</option>
              <option value="temp-skid">Temp Power Skid Frame</option>
            </select>
          </div>
          <div onClick={() => fileRef.current.click()} style={{ border: '1px dashed var(--color-border-secondary)', borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', marginBottom: 12, minHeight: 120, background: (image || imageData) ? 'transparent' : 'var(--color-background-secondary)' }}>
            {image
              ? <img src={image} alt="Drawing" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 4 }} />
              : imageData && fileType === 'pdf'
              ? <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>PDF loaded — ready to extract</div>
              : <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Tap to upload drawing<br /><span style={{ fontSize: 11 }}>JPG, PNG, screenshot, or PDF</span></div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFile} style={{ display: 'none' }} />
          <button className="primary" onClick={parseDrawing} disabled={!imageData || parsing} style={{ width: '100%' }}>
            {parsing ? 'Extracting frame BOM...' : 'Extract frame BOM from drawing'}
          </button>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-tertiary)' }}>Frame materials only. Electrical components added in step 4.</div>
        </div>

        <div className="card">
          <div className="section-label">Extraction result</div>
          {!result ? (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12, paddingTop: 8 }}>Upload a drawing and click Extract.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div className="metric" style={{ flex: 1 }}><div className="label">Confidence</div><div className="value" style={{ color: confidenceColor, fontSize: 16 }}>{Math.round((result.confidence || 0) * 100)}%</div></div>
                <div className="metric" style={{ flex: 1 }}><div className="label">BOM lines</div><div className="value" style={{ fontSize: 16 }}>{editBom.length}</div></div>
                <div className="metric" style={{ flex: 1 }}><div className="label">Labor hrs</div><div className="value" style={{ fontSize: 16 }}>{result.labor_hours || 0}</div></div>
              </div>
              {result.dimensions?.description && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', background: 'var(--color-background-secondary)', padding: '8px 12px', borderRadius: 6, marginBottom: 10 }}>{result.dimensions.description}</div>}
              {[...(result.warnings || []), ...(result.dimensions?.notes || [])].length > 0 && (
                <div style={{ background: 'var(--color-background-warning)', border: '0.5px solid var(--color-border-warning)', borderRadius: 6, padding: '8px 12px' }}>
                  {[...(result.warnings || []), ...(result.dimensions?.notes || [])].map((w, i) => <div key={i} style={{ fontSize: 12, color: 'var(--color-text-warning)' }}>{w}</div>)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {result && (
        <>
          <div className="section-label">2. Review frame BOM</div>
          <div className="card" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr><th>Material</th><th>Spec</th><th style={{ textAlign: 'right' }}>Qty</th><th>Unit</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr>
              </thead>
              <tbody>
                {editBom.map((l, i) => (
                  <tr key={i}>
                    <td><input value={l.mat_name} onChange={e => updateBomLine(i, 'mat_name', e.target.value)} style={{ width: '100%' }} /></td>
                    <td><input value={l.mat_spec || ''} onChange={e => updateBomLine(i, 'mat_spec', e.target.value)} style={{ width: '100%' }} /></td>
                    <td><input type="number" step="any" value={l.qty} onChange={e => updateBomLine(i, 'qty', e.target.value)} style={{ width: 80, textAlign: 'right' }} /></td>
                    <td><input value={l.unit} onChange={e => updateBomLine(i, 'unit', e.target.value)} style={{ width: 50 }} /></td>
                    <td><input type="number" step="0.01" value={l.unit_cost} onChange={e => updateBomLine(i, 'unit_cost', e.target.value)} style={{ width: 90, textAlign: 'right' }} /></td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(l.qty * l.unit_cost)}</td>
                    <td><button className="sm danger" onClick={() => setEditBom(p => p.filter((_, j) => j !== i))}>×</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--color-background-secondary)' }}>
                  <td colSpan={5} style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Frame material subtotal</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(matTotal)}</td><td></td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Labor ({result.labor_hours}hr @ $30)</td>
                  <td style={{ textAlign: 'right' }}>{fmt(laborCost)}</td><td></td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Consumables ({result.labor_hours}hr @ $5)</td>
                  <td style={{ textAlign: 'right' }}>{fmt(consumablesCost)}</td><td></td>
                </tr>
              </tfoot>
            </table>
            <button className="sm" onClick={() => setEditBom(p => [...p, { mat_name: '', mat_spec: '', qty: 1, unit: 'ft', unit_cost: 0, line_total: 0, source: 'manual' }])} style={{ marginTop: 10 }}>+ Add line</button>
          </div>

          <div className="section-label">3. Electrical components &amp; misc</div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              Add transformer, panels, disconnects, and any other components priced separately from the frame.
            </div>
            {presets.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>Quick add:</span>
                {presets.map(p => (
                  <button key={p} className="sm" onClick={() => usePreset(p)} style={{ fontSize: 11 }}>{p}</button>
                ))}
              </div>
            )}
            <form onSubmit={addComp}>
              <div className="row" style={{ marginBottom: 12 }}>
                <div className="grow"><input value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. 167kVA transformer, 400A distribution panel" /></div>
                <div style={{ width: 70 }}><input type="number" step="1" min="1" value={compForm.qty} onChange={e => setCompForm(p => ({ ...p, qty: e.target.value }))} placeholder="Qty" /></div>
                <div style={{ width: 120 }}><input type="number" step="0.01" min="0" value={compForm.unit_cost} onChange={e => setCompForm(p => ({ ...p, unit_cost: e.target.value }))} placeholder="Unit cost" /></div>
                <button type="submit" className="primary">Add</button>
              </div>
            </form>
            {components.length > 0 ? (
              <table>
                <thead><tr><th>Description</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit cost</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
                <tbody>
                  {components.map((c, i) => (
                    <tr key={i}>
                      <td><input value={c.description} onChange={e => updateComp(i, 'description', e.target.value)} style={{ width: '100%' }} /></td>
                      <td><input type="number" step="1" value={c.qty} onChange={e => updateComp(i, 'qty', e.target.value)} style={{ width: 70, textAlign: 'right' }} /></td>
                      <td><input type="number" step="0.01" value={c.unit_cost} onChange={e => updateComp(i, 'unit_cost', e.target.value)} style={{ width: 110, textAlign: 'right' }} /></td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(c.qty * c.unit_cost)}</td>
                      <td><button className="sm danger" onClick={() => setComponents(p => p.filter((_, j) => j !== i))}>×</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-background-secondary)' }}>
                    <td colSpan={3} style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Components subtotal</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(compTotal)}</td><td></td>
                  </tr>
                </tfoot>
              </table>
            ) : <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>No components added.</div>}
          </div>

          <div className="card" style={{ marginBottom: 20, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Total job cost</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-warning)' }}>{fmt(grandTotal)}</span>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              <span>Frame: {fmt(matTotal + laborCost + consumablesCost)}</span>
              <span>Components: {fmt(compTotal)}</span>
            </div>
          </div>

          <div className="section-label">4. Create job</div>
          <div className="card">
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div><label>Job name</label><input value={jobName} onChange={e => setJobName(e.target.value)} placeholder="e.g. Temp Skid — Southland Industries" style={{ marginTop: 5 }} /></div>
              <div><label>Customer</label><input value={jobCustomer} onChange={e => setJobCustomer(e.target.value)} placeholder="Customer name" style={{ marginTop: 5 }} /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Drawing notes, special requirements, re-draw flags..." style={{ marginTop: 5 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="primary" onClick={createJob} disabled={creating}>{creating ? 'Creating job...' : '→ Confirm + create job'}</button>
              <button onClick={() => { setResult(null); setImage(null); setImageData(null); setEditBom([]); setComponents([]); }}>Start over</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

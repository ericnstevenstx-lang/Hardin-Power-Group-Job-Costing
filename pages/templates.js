import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

function fmt(n) {
  return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('wes_job_templates')
      .select('*, wes_template_materials(*), wes_template_labor(*), wes_template_components(*)')
      .order('name');
    setTemplates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function estimatedCost(t) {
    const mat = (t.wes_template_materials || []).reduce((s, m) => s + m.qty * m.unit_cost, 0);
    const labor = (t.wes_template_labor || []).reduce((s, l) => s + l.hours * l.rate, 0);
    const comp = (t.wes_template_components || []).reduce((s, c) => s + c.qty * c.unit_cost, 0);
    return mat + labor + comp;
  }

  async function applyTemplate(t) {
    if (!confirm('Create a new job from template "' + t.name + '"?')) return;
    setApplying(t.id);
    const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const { data: job, error: jobErr } = await supabase
      .from('wes_jobs')
      .insert({ name: t.name, customer: '', date: today, sell_price: 0 })
      .select().single();
    if (jobErr) { alert(jobErr.message); setApplying(null); return; }

    const matRows = (t.wes_template_materials || []).map(m => ({
      job_id: job.id, material_id: m.material_id || null,
      mat_name: m.mat_name, mat_spec: m.mat_spec, unit: m.unit, unit_cost: m.unit_cost, qty: m.qty,
    }));
    const laborRows = (t.wes_template_labor || []).map(l => ({
      job_id: job.id, description: l.description, hours: l.hours, rate: l.rate,
    }));
    const compRows = (t.wes_template_components || []).map(c => ({
      job_id: job.id, description: c.description, qty: c.qty, unit_cost: c.unit_cost,
    }));

    await Promise.all([
      matRows.length ? supabase.from('wes_job_materials').insert(matRows) : Promise.resolve(),
      laborRows.length ? supabase.from('wes_job_labor').insert(laborRows) : Promise.resolve(),
      compRows.length ? supabase.from('wes_job_components').insert(compRows) : Promise.resolve(),
    ]);

    setApplying(null);
    router.push('/jobs/' + job.id);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Templates</h1>
          <div className="sub">{templates.length} template{templates.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : templates.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                {(t.wes_template_materials || []).length} materials &middot;&nbsp;
                {(t.wes_template_labor || []).length} labor &middot;&nbsp;
                {(t.wes_template_components || []).length} components &middot;&nbsp;
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{fmt(estimatedCost(t))}</span> est. cost
              </div>
              {t.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{t.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sm" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                {expanded === t.id ? 'Hide' : 'View'}
              </button>
              <button className="primary sm" onClick={() => applyTemplate(t)} disabled={applying === t.id}>
                {applying === t.id ? '...' : '+ New job'}
              </button>
            </div>
          </div>
          {expanded === t.id && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {(t.wes_template_materials || []).length > 0 && (
                <>
                  <div className="section-label" style={{ marginBottom: 8 }}>Materials</div>
                  <table style={{ marginBottom: 16 }}>
                    <thead><tr><th>Name</th><th>Spec</th><th style={{ textAlign: 'right' }}>Qty</th><th>Unit</th><th style={{ textAlign: 'right' }}>Unit cost</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                    <tbody>
                      {t.wes_template_materials.map(m => (
                        <tr key={m.id}>
                          <td>{m.mat_name}</td><td style={{ color: 'var(--text2)' }}>{m.mat_spec}</td>
                          <td style={{ textAlign: 'right' }}>{Number(m.qty)}</td><td>{m.unit}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(m.unit_cost)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(m.qty * m.unit_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {(t.wes_template_labor || []).length > 0 && (
                <>
                  <div className="section-label" style={{ marginBottom: 8 }}>Labor</div>
                  <table style={{ marginBottom: 16 }}>
                    <thead><tr><th>Description</th><th style={{ textAlign: 'right' }}>Hours</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                    <tbody>
                      {t.wes_template_labor.map(l => (
                        <tr key={l.id}>
                          <td>{l.description}</td>
                          <td style={{ textAlign: 'right' }}>{Number(l.hours)} hr</td>
                          <td style={{ textAlign: 'right' }}>{fmt(l.rate)}/hr</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.hours * l.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {(t.wes_template_components || []).length > 0 && (
                <>
                  <div className="section-label" style={{ marginBottom: 8 }}>Components</div>
                  <table>
                    <thead><tr><th>Description</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit cost</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                    <tbody>
                      {t.wes_template_components.map(c => (
                        <tr key={c.id}>
                          <td>{c.description}</td>
                          <td style={{ textAlign: 'right' }}>{Number(c.qty)}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(c.unit_cost)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.qty * c.unit_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

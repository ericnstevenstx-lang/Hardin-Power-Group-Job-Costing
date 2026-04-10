import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const LABOR_RATE = 30;

function fmt(n) {
  return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function calcTotals(job) {
  const mat = (job.wes_job_materials || []).reduce((s, i) => s + i.qty * i.unit_cost, 0);
  const labor = (job.wes_job_labor || []).reduce((s, l) => s + l.hours * l.rate, 0);
  const comp = (job.wes_job_components || []).reduce((s, c) => s + c.qty * c.unit_cost, 0);
  const total = mat + labor + comp;
  const margin = job.sell_price > 0 ? ((job.sell_price - total) / job.sell_price * 100) : null;
  return { mat, labor, comp, total, margin };
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', customer: '', date: '', sell_price: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wes_jobs')
      .select(`*, wes_job_materials(*), wes_job_labor(*), wes_job_components(*)`)
      .order('created_at', { ascending: false });
    if (!error) setJobs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  async function createJob(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Job name is required.');
    setSaving(true);
    setError('');
    const { data, error } = await supabase
      .from('wes_jobs')
      .insert({ name: form.name.trim(), customer: form.customer.trim(), date: form.date.trim(), sell_price: parseFloat(form.sell_price) || 0 })
      .select()
      .single();
    setSaving(false);
    if (error) return setError(error.message);
    setShowForm(false);
    setForm({ name: '', customer: '', date: '', sell_price: '' });
    router.push('/jobs/' + data.id);
  }

  async function deleteJob(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this job and all its cost data?')) return;
    await supabase.from('wes_jobs').delete().eq('id', id);
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  const totalSpend = jobs.reduce((s, j) => s + calcTotals(j).total, 0);
  const totalRevenue = jobs.reduce((s, j) => s + (j.sell_price || 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Jobs</h1>
          <div className="sub">{jobs.length} job{jobs.length !== 1 ? 's' : ''} tracked</div>
        </div>
        <button className="primary" onClick={() => setShowForm(true)}>+ New job</button>
      </div>

      <div className="grid3" style={{ marginBottom: 24 }}>
        <div className="metric"><div className="label">Total jobs</div><div className="value">{jobs.length}</div></div>
        <div className="metric"><div className="label">Total cost</div><div className="value">{fmt(totalSpend)}</div></div>
        <div className="metric"><div className="label">Total revenue</div><div className="value" style={{ color: 'var(--blue)' }}>{fmt(totalRevenue)}</div></div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11, marginBottom: 16 }}>New job</div>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={createJob}>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div><label>Job name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Morley Moss — Temp Skid #4" /></div>
              <div><label>Customer</label><input value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))} placeholder="e.g. Royal Electric" /></div>
            </div>
            <div className="grid2" style={{ marginBottom: 16 }}>
              <div><label>Date</label><input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="e.g. 04/10/26" /></div>
              <div><label>Sell price ($)</label><input type="number" step="0.01" value={form.sell_price} onChange={e => setForm(p => ({ ...p, sell_price: e.target.value }))} placeholder="0.00" /></div>
            </div>
            <div className="row">
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Creating...' : 'Create job'}</button>
              <button type="button" onClick={() => { setShowForm(false); setError(''); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
          No jobs yet. Create one to start tracking costs.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Job name</th>
                <th>Customer</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Material</th>
                <th style={{ textAlign: 'right' }}>Labor</th>
                <th style={{ textAlign: 'right' }}>Total cost</th>
                <th style={{ textAlign: 'right' }}>Sell price</th>
                <th style={{ textAlign: 'right' }}>Margin</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const { mat, labor, total, margin } = calcTotals(job);
                return (
                  <tr key={job.id} style={{ cursor: 'pointer' }} onClick={() => router.push('/jobs/' + job.id)}>
                    <td style={{ fontWeight: 500, color: 'var(--accent)' }}>{job.name}</td>
                    <td style={{ color: 'var(--text2)' }}>{job.customer || '—'}</td>
                    <td style={{ color: 'var(--text2)' }}>{job.date || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(mat)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(labor)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(total)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--blue)' }}>{job.sell_price > 0 ? fmt(job.sell_price) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {margin !== null ? (
                        <span style={{ color: margin >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                          {margin.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <button className="sm danger" onClick={e => deleteJob(job.id, e)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

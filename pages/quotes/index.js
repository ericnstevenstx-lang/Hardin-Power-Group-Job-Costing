import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

function fmt(n) { return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

const STATUS_COLORS = {
  draft: 'var(--text3)',
  sent: 'var(--blue)',
  accepted: 'var(--green)',
  declined: 'var(--red)',
};

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ job_id: '', customer: '', date: '', valid_until: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [quotesRes, jobsRes] = await Promise.all([
      supabase.from('wes_quotes')
        .select(`*, wes_quote_lines(amount)`)
        .order('created_at', { ascending: false }),
      supabase.from('wes_jobs').select('id, name, customer').order('created_at', { ascending: false }),
    ]);
    setQuotes(quotesRes.data || []);
    setJobs(jobsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pre-fill customer from selected job
  function onJobChange(jobId) {
    const job = jobs.find(j => j.id === jobId);
    setForm(p => ({ ...p, job_id: jobId, customer: job?.customer || p.customer }));
  }

  async function createQuote(e) {
    e.preventDefault();
    if (!form.customer.trim()) return setError('Customer is required.');
    setSaving(true);
    setError('');

    // Get next quote number
    const { data: seqData } = await supabase.rpc('nextval', { sequence_name: 'wes_quote_number_seq' }).single().catch(() => ({ data: null }));
    const quoteNum = 'HPG-' + String(Date.now()).slice(-5);

    const { data, error } = await supabase.from('wes_quotes').insert({
      job_id: form.job_id || null,
      quote_number: quoteNum,
      customer: form.customer.trim(),
      date: form.date || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      valid_until: form.valid_until,
      notes: form.notes,
      status: 'draft',
    }).select().single();

    setSaving(false);
    if (error) return setError(error.message);

    // If linked to a job, pre-populate lines from job cost
    if (form.job_id) {
      const [matsRes, laborRes, compsRes] = await Promise.all([
        supabase.from('wes_job_materials').select('*').eq('job_id', form.job_id),
        supabase.from('wes_job_labor').select('*').eq('job_id', form.job_id),
        supabase.from('wes_job_components').select('*').eq('job_id', form.job_id),
      ]);
      const lines = [];
      let order = 0;
      (matsRes.data || []).forEach(m => lines.push({ quote_id: data.id, sort_order: order++, item_type: 'material', description: `${m.mat_name} ${m.mat_spec}`.trim(), qty: m.qty, unit: m.unit, unit_price: m.unit_cost }));
      (laborRes.data || []).forEach(l => lines.push({ quote_id: data.id, sort_order: order++, item_type: 'labor', description: l.description, qty: l.hours, unit: 'hr', unit_price: l.rate }));
      (compsRes.data || []).forEach(c => lines.push({ quote_id: data.id, sort_order: order++, item_type: 'component', description: c.description, qty: c.qty, unit: 'ea', unit_price: c.unit_cost }));
      if (lines.length) await supabase.from('wes_quote_lines').insert(lines);
    }

    setShowForm(false);
    router.push('/quotes/' + data.id);
  }

  async function deleteQuote(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this quote?')) return;
    await supabase.from('wes_quotes').delete().eq('id', id);
    setQuotes(prev => prev.filter(q => q.id !== id));
  }

  const totalsByStatus = quotes.reduce((acc, q) => {
    const total = (q.wes_quote_lines || []).reduce((s, l) => s + (l.amount || 0), 0);
    acc[q.status] = (acc[q.status] || 0) + total;
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Quotes</h1>
          <div className="sub">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="primary" onClick={() => setShowForm(true)}>+ New quote</button>
      </div>

      <div className="grid4" style={{ marginBottom: 24 }}>
        {['draft','sent','accepted','declined'].map(s => (
          <div className="metric" key={s}>
            <div className="label">{s}</div>
            <div className="value" style={{ color: STATUS_COLORS[s], fontSize: 16 }}>
              {quotes.filter(q => q.status === s).length} / {fmt(totalsByStatus[s] || 0)}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11, marginBottom: 16 }}>New quote</div>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={createQuote}>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div>
                <label>Link to job (optional)</label>
                <select value={form.job_id} onChange={e => onJobChange(e.target.value)}>
                  <option value="">No linked job</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.name}{j.customer ? ` — ${j.customer}` : ''}</option>)}
                </select>
              </div>
              <div><label>Customer *</label><input value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))} placeholder="Customer name" /></div>
            </div>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div><label>Quote date</label><input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="04/10/26" /></div>
              <div><label>Valid until</label><input value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} placeholder="05/10/26" /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Notes</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional scope notes" />
            </div>
            <div className="row">
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Creating...' : 'Create quote'}</button>
              <button type="button" onClick={() => { setShowForm(false); setError(''); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : quotes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>No quotes yet.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Valid until</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => {
                const total = (q.wes_quote_lines || []).reduce((s, l) => s + (l.amount || 0), 0);
                return (
                  <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => router.push('/quotes/' + q.id)}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{q.quote_number}</td>
                    <td>{q.customer}</td>
                    <td style={{ color: 'var(--text2)' }}>{q.date}</td>
                    <td style={{ color: 'var(--text2)' }}>{q.valid_until || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(total)}</td>
                    <td><span style={{ color: STATUS_COLORS[q.status], fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{q.status}</span></td>
                    <td><button className="sm danger" onClick={e => deleteQuote(q.id, e)}>Delete</button></td>
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

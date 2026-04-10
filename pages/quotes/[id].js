import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

function fmt(n) {
  return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
const STATUSES = ['draft', 'sent', 'accepted', 'rejected'];

export default function QuoteDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [quote, setQuote] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customer: '', customer_email: '', date: '', valid_until: '', notes: '', status: 'draft' });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [qRes, lRes] = await Promise.all([
      supabase.from('wes_quotes').select('*').eq('id', id).single(),
      supabase.from('wes_quote_lines').select('*').eq('quote_id', id).order('sort_order'),
    ]);
    if (qRes.error) { setError('Quote not found.'); setLoading(false); return; }
    setQuote(qRes.data);
    setForm({ customer: qRes.data.customer, customer_email: qRes.data.customer_email, date: qRes.data.date, valid_until: qRes.data.valid_until, notes: qRes.data.notes, status: qRes.data.status });
    setLines(lRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('wes_quotes').update({ ...form, updated_at: new Date().toISOString() }).eq('id', id);
    setSaving(false);
    if (error) setError(error.message);
    else setQuote(prev => ({ ...prev, ...form }));
  }

  async function removeRow(lineId) {
    await supabase.from('wes_quote_lines').delete().eq('id', lineId);
    setLines(prev => prev.filter(l => l.id !== lineId));
  }

  const total = lines.reduce((s, l) => s + Number(l.amount || 0), 0);

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!quote) return <div className="alert error">{error || 'Quote not found.'}</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 4 }}>
            <Link href="/quotes">← Quotes</Link>
          </div>
          <h1>{quote.quote_number}</h1>
          {quote.customer && <div className="sub">{quote.customer}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()}>Print / PDF</button>
          <button className="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="grid2" style={{ marginBottom: 12 }}>
          <div><label>Customer</label><input value={form.customer} onChange={e => setForm(p => ({ ...p, customer: e.target.value }))} /></div>
          <div><label>Customer email</label><input value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} /></div>
        </div>
        <div className="grid2" style={{ marginBottom: 12 }}>
          <div><label>Date</label><input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="e.g. 04/10/26" /></div>
          <div><label>Valid until</label><input value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} placeholder="e.g. 04/24/26" /></div>
        </div>
        <div className="grid2" style={{ marginBottom: 12 }}>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label>Notes</label><input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Description</th><th style={{ textAlign: 'right' }}>Qty</th><th>Unit</th>
              <th style={{ textAlign: 'right' }}>Unit price</th><th style={{ textAlign: 'right' }}>Amount</th><th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map(l => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td style={{ textAlign: 'right' }}>{Number(l.qty)}</td>
                <td style={{ color: 'var(--text2)' }}>{l.unit}</td>
                <td style={{ textAlign: 'right' }}>{fmt(l.unit_price)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.amount)}</td>
                <td><button className="sm danger" onClick={() => removeRow(l.id)}>×</button></td>
              </tr>
            ))}
            <tr style={{ background: 'var(--surface2)' }}>
              <td colSpan={4} style={{ textAlign: 'right', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text2)' }}>Total</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>{fmt(total)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

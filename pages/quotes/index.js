import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

function fmt(n) {
  return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
const STATUS_COLOR = { draft: 'var(--text3)', sent: 'var(--blue)', accepted: 'var(--green)', rejected: 'var(--red)' };

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('wes_quotes')
      .select('*, wes_quote_lines(*)')
      .order('created_at', { ascending: false });
    setQuotes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function total(q) {
    return (q.wes_quote_lines || []).reduce((s, l) => s + Number(l.amount || 0), 0);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Quotes</h1>
          <div className="sub">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : quotes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
          No quotes yet. Open a job and click &ldquo;&rarr; Create quote&rdquo;.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Quote #</th><th>Customer</th><th>Date</th><th>Valid until</th>
                <th style={{ textAlign: 'right' }}>Total</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => router.push('/quotes/' + q.id)}>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{q.quote_number}</td>
                  <td>{q.customer || '—'}</td>
                  <td style={{ color: 'var(--text2)' }}>{q.date || '—'}</td>
                  <td style={{ color: 'var(--text2)' }}>{q.valid_until || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(total(q))}</td>
                  <td><span style={{ color: STATUS_COLOR[q.status] || 'var(--text2)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{q.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

function fmt(n) { return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function fmtQty(n) { return parseFloat(Number(n).toFixed(4)).toString(); }

const STATUS_OPTIONS = ['draft', 'sent', 'accepted', 'declined'];
const STATUS_COLORS = { draft: 'var(--text3)', sent: 'var(--blue)', accepted: 'var(--green)', declined: 'var(--red)' };
const ITEM_TYPES = ['service', 'material', 'labor', 'component'];

export default function QuoteDetail() {
  const router = useRouter();
  const { id } = router.query;
  const printRef = useRef();

  const [quote, setQuote] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lineForm, setLineForm] = useState({ item_type: 'service', description: '', qty: '1', unit: 'ea', unit_price: '' });
  const [saving, setSaving] = useState({});
  const [editingLine, setEditingLine] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [qRes, lRes] = await Promise.all([
      supabase.from('wes_quotes').select('*').eq('id', id).single(),
      supabase.from('wes_quote_lines').select('*').eq('quote_id', id).order('sort_order'),
    ]);
    if (qRes.error) { setError('Quote not found.'); setLoading(false); return; }
    setQuote(qRes.data);
    setLines(lRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const subtotal = lines.reduce((s, l) => s + (l.amount || 0), 0);

  async function updateQuoteField(field, value) {
    setQuote(prev => ({ ...prev, [field]: value }));
    await supabase.from('wes_quotes').update({ [field]: value }).eq('id', id);
  }

  async function addLine(e) {
    e.preventDefault();
    if (!lineForm.description || !lineForm.unit_price) return setError('Description and unit price are required.');
    setSaving(p => ({ ...p, line: true }));
    setError('');
    const row = {
      quote_id: id,
      sort_order: lines.length,
      item_type: lineForm.item_type,
      description: lineForm.description,
      qty: parseFloat(lineForm.qty) || 1,
      unit: lineForm.unit,
      unit_price: parseFloat(lineForm.unit_price),
    };
    const { data, error } = await supabase.from('wes_quote_lines').insert(row).select().single();
    setSaving(p => ({ ...p, line: false }));
    if (error) return setError(error.message);
    setLines(prev => [...prev, data]);
    setLineForm({ item_type: 'service', description: '', qty: '1', unit: 'ea', unit_price: '' });
  }

  async function updateLine(lineId, field, value) {
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, [field]: value, amount: field === 'unit_price' ? (l.qty * parseFloat(value || 0)) : (parseFloat(value || 0) * l.unit_price) } : l));
    await supabase.from('wes_quote_lines').update({ [field]: field === 'qty' || field === 'unit_price' ? parseFloat(value) : value }).eq('id', lineId);
  }

  async function removeLine(lineId) {
    await supabase.from('wes_quote_lines').delete().eq('id', lineId);
    setLines(prev => prev.filter(l => l.id !== lineId));
  }

  function handlePrint() {
    window.print();
  }

  function exportXLS() {
    // Build QB-compatible estimate CSV
    const rows = [
      ['Customer', 'Estimate Date', 'Estimate #', 'Item', 'Description', 'Qty', 'Rate', 'Amount'],
    ];
    lines.forEach(l => {
      rows.push([
        quote.customer,
        quote.date,
        quote.quote_number,
        l.item_type,
        l.description,
        fmtQty(l.qty),
        Number(l.unit_price).toFixed(2),
        Number(l.amount || l.qty * l.unit_price).toFixed(2),
      ]);
    });
    // Add totals row
    rows.push(['', '', '', '', '', '', 'TOTAL', Number(subtotal).toFixed(2)]);
    if (quote.notes) rows.push(['', '', '', '', 'Notes: ' + quote.notes, '', '', '']);

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quote.quote_number}_${quote.customer.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!quote) return <div className="alert error">{error || 'Quote not found.'}</div>;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-area { color: black !important; }
          table th, table td { color: black !important; border-color: #ccc !important; }
        }
      `}</style>

      {/* HEADER -- no print */}
      <div className="page-header no-print">
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 4 }}>
            <Link href="/quotes">← Quotes</Link>
          </div>
          <h1>{quote.quote_number}</h1>
          <div className="sub">{quote.customer}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={quote.status}
            onChange={e => updateQuoteField('status', e.target.value)}
            style={{ width: 120, color: STATUS_COLORS[quote.status], fontWeight: 600 }}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={exportXLS}>↓ Export CSV</button>
          <button onClick={handlePrint}>⎙ Print / PDF</button>
        </div>
      </div>

      {error && <div className="alert error no-print" style={{ marginBottom: 16 }}>{error}</div>}

      {/* QUOTE DOCUMENT */}
      <div className="print-area" ref={printRef}>

        {/* Quote header info */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 4 }}>ESTIMATE</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{quote.quote_number}</div>
              <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>HARDIN POWER GROUP</div>
              <div style={{ color: 'var(--text2)', fontSize: 12 }}>Dallas, TX</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: 'var(--text3)', marginRight: 8 }}>CUSTOMER</span>
                <input
                  className="no-print"
                  value={quote.customer}
                  onChange={e => setQuote(p => ({ ...p, customer: e.target.value }))}
                  onBlur={e => updateQuoteField('customer', e.target.value)}
                  style={{ width: 200, textAlign: 'right' }}
                />
                <span className="print-only" style={{ display: 'none', fontWeight: 600 }}>{quote.customer}</span>
              </div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: 'var(--text3)', marginRight: 8 }}>DATE</span>
                <input className="no-print" value={quote.date} onChange={e => setQuote(p => ({ ...p, date: e.target.value }))} onBlur={e => updateQuoteField('date', e.target.value)} style={{ width: 120, textAlign: 'right' }} />
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text3)', marginRight: 8 }}>VALID UNTIL</span>
                <input className="no-print" value={quote.valid_until} onChange={e => setQuote(p => ({ ...p, valid_until: e.target.value }))} onBlur={e => updateQuoteField('valid_until', e.target.value)} style={{ width: 120, textAlign: 'right' }} placeholder="—" />
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Description</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th className="no-print"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id} onDoubleClick={() => setEditingLine(l.id)}>
                  {editingLine === l.id ? (
                    <>
                      <td><input defaultValue={l.description} onBlur={e => { updateLine(l.id, 'description', e.target.value); setEditingLine(null); }} autoFocus style={{ width: '100%' }} /></td>
                      <td>
                        <select defaultValue={l.item_type} onBlur={e => updateLine(l.id, 'item_type', e.target.value)} style={{ width: '100%' }}>
                          {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td><input type="number" defaultValue={l.qty} onBlur={e => { updateLine(l.id, 'qty', e.target.value); setEditingLine(null); }} style={{ width: 80, textAlign: 'right' }} /></td>
                      <td><input defaultValue={l.unit} onBlur={e => updateLine(l.id, 'unit', e.target.value)} style={{ width: 60 }} /></td>
                      <td><input type="number" defaultValue={l.unit_price} onBlur={e => { updateLine(l.id, 'unit_price', e.target.value); setEditingLine(null); }} style={{ width: 100, textAlign: 'right' }} /></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.qty * l.unit_price)}</td>
                      <td className="no-print"><button className="sm danger" onClick={() => { removeLine(l.id); setEditingLine(null); }}>×</button></td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 500 }}>{l.description}</td>
                      <td><span className="tag">{l.item_type}</span></td>
                      <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{fmtQty(l.qty)}</td>
                      <td style={{ color: 'var(--text2)' }}>{l.unit}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(l.unit_price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.amount || l.qty * l.unit_price)}</td>
                      <td className="no-print"><button className="sm" onClick={() => setEditingLine(l.id)}>Edit</button></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--surface2)' }}>
                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text2)' }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>{fmt(subtotal)}</td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Add line form */}
        <div className="card no-print" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Add line</div>
          <form onSubmit={addLine}>
            <div className="row" style={{ marginBottom: 8 }}>
              <div style={{ width: 120 }}>
                <select value={lineForm.item_type} onChange={e => setLineForm(p => ({ ...p, item_type: e.target.value }))}>
                  {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grow">
                <input value={lineForm.description} onChange={e => setLineForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
              </div>
              <div style={{ width: 80 }}>
                <input type="number" step="any" min="0" value={lineForm.qty} onChange={e => setLineForm(p => ({ ...p, qty: e.target.value }))} placeholder="Qty" />
              </div>
              <div style={{ width: 70 }}>
                <input value={lineForm.unit} onChange={e => setLineForm(p => ({ ...p, unit: e.target.value }))} placeholder="Unit" />
              </div>
              <div style={{ width: 120 }}>
                <input type="number" step="0.01" min="0" value={lineForm.unit_price} onChange={e => setLineForm(p => ({ ...p, unit_price: e.target.value }))} placeholder="Rate" />
              </div>
              {lineForm.qty && lineForm.unit_price && (
                <div style={{ width: 90, padding: '8px 0', color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                  = {fmt(parseFloat(lineForm.qty) * parseFloat(lineForm.unit_price))}
                </div>
              )}
              <button type="submit" className="primary" disabled={saving.line}>{saving.line ? '...' : 'Add'}</button>
            </div>
          </form>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Tip: double-click any line to edit it inline.</div>
        </div>

        {/* Notes */}
        <div className="card">
          <label style={{ marginBottom: 6 }}>Notes / scope</label>
          <textarea
            value={quote.notes}
            onChange={e => setQuote(p => ({ ...p, notes: e.target.value }))}
            onBlur={e => updateQuoteField('notes', e.target.value)}
            placeholder="Scope of work, exclusions, terms..."
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

      </div>
    </>
  );
}

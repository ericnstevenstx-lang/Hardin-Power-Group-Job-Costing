import { useState, useEffect, useCallback, Fragment } from 'react';
import { supabase } from '../lib/supabase';

function fmt(n) {
  return '$' + Number(n || 0).toFixed(4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

const EMPTY = {
  name: '', contact_name: '', phone: '', email: '', address: '',
  customer_id_at_vendor: '', tax_id_used: '', notes: '',
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [quoteCounts, setQuoteCounts] = useState({});
  const [quotesByVendor, setQuotesByVendor] = useState({});
  const [materialsById, setMaterialsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [vendorsRes, quotesRes, matsRes] = await Promise.all([
      supabase.from('wes_vendors').select('*').order('name'),
      supabase.from('wes_material_vendor_quotes').select('vendor_id'),
      supabase.from('wes_materials').select('id, name, spec'),
    ]);
    setVendors(vendorsRes.data || []);
    const counts = {};
    (quotesRes.data || []).forEach(q => { counts[q.vendor_id] = (counts[q.vendor_id] || 0) + 1; });
    setQuoteCounts(counts);
    setMaterialsById(Object.fromEntries((matsRes.data || []).map(m => [m.id, m])));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadQuotesFor(vendorId) {
    if (quotesByVendor[vendorId]) return;
    const { data } = await supabase
      .from('wes_material_vendor_quotes')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('quote_date', { ascending: false });
    setQuotesByVendor(prev => ({ ...prev, [vendorId]: data || [] }));
  }

  function toggleExpand(vendorId) {
    if (expandedId === vendorId) {
      setExpandedId(null);
    } else {
      setExpandedId(vendorId);
      loadQuotesFor(vendorId);
    }
  }

  function openAdd() {
    setForm(EMPTY);
    setEditId(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(v) {
    setForm({
      name: v.name || '', contact_name: v.contact_name || '', phone: v.phone || '',
      email: v.email || '', address: v.address || '',
      customer_id_at_vendor: v.customer_id_at_vendor || '',
      tax_id_used: v.tax_id_used || '', notes: v.notes || '',
    });
    setEditId(v.id);
    setError('');
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditId(null);
    setError('');
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Vendor name is required.');
    setSaving(true);
    setError('');
    const row = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      customer_id_at_vendor: form.customer_id_at_vendor.trim() || null,
      tax_id_used: form.tax_id_used.trim() || null,
      notes: form.notes.trim() || null,
    };
    let error;
    if (editId) {
      ({ error } = await supabase.from('wes_vendors').update(row).eq('id', editId));
    } else {
      ({ error } = await supabase.from('wes_vendors').insert(row));
    }
    setSaving(false);
    if (error) return setError(error.message);
    setShowForm(false);
    setEditId(null);
    load();
  }

  async function toggleActive(v) {
    await supabase.from('wes_vendors').update({ active: !v.active }).eq('id', v.id);
    load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Vendors</h1>
          <div className="sub">{vendors.length} vendors · vendor quotes feed material costing</div>
        </div>
        <button className="primary" onClick={openAdd}>+ Add vendor</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11, marginBottom: 16 }}>
            {editId ? 'Edit vendor' : 'Add vendor'}
          </div>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={save}>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div><label>Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Eagle National Steel, Ltd." /></div>
              <div><label>Contact name</label><input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="Salesperson" /></div>
            </div>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div><label>Phone</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(972) 555-0000" /></div>
              <div><label>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Address</label>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Street, city, state, zip" />
            </div>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div><label>Our customer ID at this vendor</label><input value={form.customer_id_at_vendor} onChange={e => setForm(p => ({ ...p, customer_id_at_vendor: e.target.value }))} placeholder="e.g. 236288" /></div>
              <div><label>Tax ID on file</label><input value={form.tax_id_used} onChange={e => setForm(p => ({ ...p, tax_id_used: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Notes</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Terms, lead time, etc." />
            </div>
            <div className="row">
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add vendor'}</button>
              <button type="button" onClick={cancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : vendors.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
          No vendors yet.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th style={{ textAlign: 'right' }}>Quotes</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map(v => {
                const isOpen = expandedId === v.id;
                const count = quoteCounts[v.id] || 0;
                return (
                  <Fragment key={v.id}>
                    <tr>
                      <td style={{ width: 28 }}>
                        <button className="sm" onClick={() => toggleExpand(v.id)} style={{ padding: '2px 8px' }}>
                          {isOpen ? '−' : '+'}
                        </button>
                      </td>
                      <td style={{ fontWeight: 500 }}>{v.name}</td>
                      <td style={{ color: 'var(--text2)' }}>{v.contact_name || '—'}</td>
                      <td style={{ color: 'var(--text2)' }}>{v.phone || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{count}</td>
                      <td>
                        <span className="tag" style={{ color: v.active ? 'var(--green)' : 'var(--text3)' }}>
                          {v.active ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="sm" onClick={() => openEdit(v)} style={{ marginRight: 6 }}>Edit</button>
                        <button className="sm" onClick={() => toggleActive(v)}>{v.active ? 'Deactivate' : 'Reactivate'}</button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ background: 'var(--surface2)' }}>
                        <td></td>
                        <td colSpan={6} style={{ padding: '10px 12px' }}>
                          {(v.address || v.email || v.customer_id_at_vendor || v.notes) && (
                            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                              {v.address && <span><strong>Addr:</strong> {v.address}</span>}
                              {v.email && <span><strong>Email:</strong> {v.email}</span>}
                              {v.customer_id_at_vendor && <span><strong>Cust ID:</strong> {v.customer_id_at_vendor}</span>}
                              {v.tax_id_used && <span><strong>Tax ID:</strong> {v.tax_id_used}</span>}
                              {v.notes && <span><strong>Notes:</strong> {v.notes}</span>}
                            </div>
                          )}
                          <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>
                            Quotes from this vendor
                          </div>
                          {!quotesByVendor[v.id] ? (
                            <div style={{ color: 'var(--text3)', fontSize: 12 }}>Loading…</div>
                          ) : quotesByVendor[v.id].length === 0 ? (
                            <div style={{ color: 'var(--text3)', fontSize: 12 }}>No quotes recorded for this vendor.</div>
                          ) : (
                            <table style={{ marginTop: 4 }}>
                              <thead>
                                <tr>
                                  <th>Material</th>
                                  <th>Quote #</th>
                                  <th>Vendor item</th>
                                  <th style={{ textAlign: 'right' }}>Unit price</th>
                                  <th>Date</th>
                                  <th>Expires</th>
                                </tr>
                              </thead>
                              <tbody>
                                {quotesByVendor[v.id].map(q => {
                                  const m = materialsById[q.material_id];
                                  const expired = q.expires_at && new Date(q.expires_at) < new Date();
                                  return (
                                    <tr key={q.id}>
                                      <td>{m ? `${m.name} ${m.spec || ''}`.trim() : q.material_id}</td>
                                      <td style={{ color: 'var(--text2)' }}>{q.vendor_quote_number || '—'}</td>
                                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                                        {q.vendor_item_code ? <code style={{ marginRight: 6 }}>{q.vendor_item_code}</code> : null}
                                        {q.vendor_item_desc || ''}
                                      </td>
                                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(q.unit_price)}/{q.unit}</td>
                                      <td>{q.quote_date}</td>
                                      <td style={{ color: expired ? 'var(--red)' : 'var(--text2)' }}>
                                        {q.expires_at || '—'}{expired ? ' (expired)' : ''}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

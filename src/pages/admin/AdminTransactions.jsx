import { useState, useEffect, useRef } from 'react';
import {
  adminGetReported, adminApprove, adminReverse,
  adminCancelTransaction, adminCreateTransaction,
  adminBulkDebit, adminBulkCredit,
  adminGetTransactionLedger, adminGetUsers,
} from '../../api/client';
import { Card, Btn, Badge, Table, Modal, Input, Select, useToast, Toast, Spinner } from '../../components/UI';
import { Plus, Download, CheckCircle, XCircle, RotateCcw, Search, ChevronDown } from 'lucide-react';

/* ── Searchable user-picker dropdown ──────────────────────────────────────── */
function UserPicker({ users, value, onChange }) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState('');
  const ref = useRef(null);

  /* close on outside click */
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = users.find(u => u.id === value);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase()) ||
    u.phone?.includes(query) ||
    String(u.id)?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 30);

  const pick = u => {
    onChange(u.id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ marginBottom:'16px', position:'relative' }}>
      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--text-secondary)', marginBottom:'6px' }}>
        User
      </label>

      {/* trigger */}
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-sm)', padding:'10px 14px',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize:'13px', cursor:'pointer', textAlign:'left',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px',
        }}>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
          {selected
            ? <span>
                <strong>{selected.name}</strong>
                <span style={{ color:'var(--text-muted)', marginLeft:8, fontFamily:'monospace', fontSize:'11px' }}>
                  {String(selected.id).slice(0, 8)}…
                </span>
                <span style={{ color:'var(--text-secondary)', marginLeft:8, fontSize:'12px' }}>
                  {selected.email || selected.phone}
                </span>
              </span>
            : 'Select a user…'}
        </span>
        <ChevronDown size={14} style={{ flexShrink:0, transition:'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}/>
      </button>

      {/* dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:999,
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-sm)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
          maxHeight:'260px', overflow:'hidden', display:'flex', flexDirection:'column',
        }}>
          {/* search inside dropdown */}
          <div style={{ padding:'8px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'8px' }}>
            <Search size={13} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
            <input
              autoFocus
              placeholder="Search by name, email, phone or UUID…"
              value={query} onChange={e => setQuery(e.target.value)}
              style={{
                flex:1, background:'transparent', border:'none', outline:'none',
                color:'var(--text-primary)', fontSize:'13px',
              }}/>
          </div>

          {/* list */}
          <div style={{ overflowY:'auto', flex:1 }}>
            {filtered.length === 0
              ? <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>No users found</div>
              : filtered.map(u => (
                <button
                  key={u.id} type="button"
                  onClick={() => pick(u)}
                  style={{
                    width:'100%', background: u.id === value ? 'rgba(59,130,246,0.1)' : 'transparent',
                    border:'none', cursor:'pointer', padding:'10px 14px', textAlign:'left',
                    borderBottom:'1px solid rgba(30,45,69,0.3)',
                    transition:'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = u.id === value ? 'rgba(59,130,246,0.1)' : 'transparent'}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px' }}>
                    <div>
                      <span style={{ fontSize:'13px', fontWeight:'600', color:'var(--text-primary)' }}>{u.name}</span>
                      <span style={{ fontSize:'12px', color:'var(--text-secondary)', marginLeft:8 }}>
                        {u.email || u.phone}
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                      <span style={{ fontFamily:'monospace', fontSize:'10px', color:'var(--text-muted)' }}>
                        {String(u.id).slice(0, 8)}…
                      </span>
                      <span style={{ fontSize:'11px', fontWeight:'700', color:'var(--accent-green)' }}>
                        ₹{(u.account_balance || 0).toLocaleString('en-IN', { maximumFractionDigits:0 })}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */
export default function AdminTransactions() {
  const [reported,    setReported]    = useState([]);
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [bulkModal,   setBulkModal]   = useState({ open:false, type:'debit' });
  const [cancelModal, setCancelModal] = useState({ open:false, txId:null });
  const [ledgerModal, setLedgerModal] = useState({ open:false, data:[] });
  const [txForm,      setTxForm]      = useState({ user_id:'', amount:'', transaction_duration:'1', location:'', channel:'web' });
  const [bulkText,    setBulkText]    = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const { toast, show, clear } = useToast();

  /* ── load reported txns + users list ── */
  const load = async () => {
    setLoading(true);
    try {
      const [rpt, usr] = await Promise.all([
        adminGetReported(1, 50),
        adminGetUsers(),
      ]);
      setReported(Array.isArray(rpt.data?.data) ? rpt.data.data : Array.isArray(rpt.data) ? rpt.data : []);
      setUsers(Array.isArray(usr.data) ? usr.data : []);
    } catch { show('Failed to load data — please refresh', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ── approve / reverse ── */
  const act = async (fn, label, id) => {
    try { await fn(id); show(`${label} successful`, 'success'); load(); }
    catch(e) { show(e.response?.data?.detail || `${label} failed`, 'error'); }
  };

  /* ── create transaction ── */
  const doCreate = async e => {
    e.preventDefault();
    if (!txForm.user_id) return show('Please select a user', 'error');
    setSubmitting(true);
    const selectedUser = users.find(u => u.id === txForm.user_id);
    try {
      await adminCreateTransaction({
        ...txForm,
        amount: parseFloat(txForm.amount),
        transaction_duration: parseFloat(txForm.transaction_duration),
      });
      show(`✅ Transaction of ₹${parseFloat(txForm.amount).toLocaleString('en-IN')} created for ${selectedUser?.name || 'user'}`, 'success');
      setCreateModal(false);
      setTxForm({ user_id:'', amount:'', transaction_duration:'1', location:'', channel:'web' });
      load();
    } catch(e) { show(e.response?.data?.detail || 'Transaction creation failed', 'error'); }
    finally { setSubmitting(false); }
  };

  /* ── bulk ── */
  const doBulk = async () => {
    setSubmitting(true);
    try {
      const lines = bulkText.trim().split('\n').filter(Boolean);
      const txns  = lines.map(l => {
        const [user_id, amount, location, channel] = l.split(',').map(s => s.trim());
        return { user_id, amount: parseFloat(amount), transaction_duration:1, location, channel };
      });
      const fn = bulkModal.type === 'debit' ? adminBulkDebit : adminBulkCredit;
      const r  = await fn({ transactions: txns });
      show(`✅ Bulk ${bulkModal.type}: ${r.data.succeeded} succeeded, ${r.data.failed} failed`, 'success');
      setBulkModal({ open:false, type:'debit' }); setBulkText('');
    } catch(e) { show(e.response?.data?.detail || 'Bulk operation failed', 'error'); }
    finally { setSubmitting(false); }
  };

  /* ── cancel ── */
  const doCancel = async () => {
    if (!cancelReason || cancelReason.length < 5) return show('Reason must be at least 5 characters', 'error');
    setSubmitting(true);
    try {
      await adminCancelTransaction(cancelModal.txId, { reason: cancelReason });
      show('✅ Transaction cancelled and refund issued to user', 'success');
      setCancelModal({ open:false, txId:null }); setCancelReason(''); load();
    } catch(e) { show(e.response?.data?.detail || 'Cancellation failed', 'error'); }
    finally { setSubmitting(false); }
  };

  /* ── ledger ── */
  const openLedger = async txId => {
    setLedgerModal({ open:true, data:[] });
    try {
      const r = await adminGetTransactionLedger(txId);
      setLedgerModal(m => ({ ...m, data: Array.isArray(r.data) ? r.data : r.data?.data || [] }));
    } catch { show('Ledger not available for this transaction', 'error'); }
  };

  /* helper: resolve user name from UUID stored in the transaction */
  const userName = uid => {
    if (!uid) return '—';
    const u = users.find(u => String(u.id) === String(uid));
    return u ? u.name : `${String(uid).slice(0, 8)}…`;
  };

  if (loading) return <Spinner/>;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Transactions</h2>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>Manage and review transactions</p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <Btn color="ghost"  onClick={() => setBulkModal({ open:true, type:'debit' })}><Download size={14}/>Bulk Debit</Btn>
          <Btn color="green"  onClick={() => setBulkModal({ open:true, type:'credit' })}><Plus size={14}/>Bulk Credit</Btn>
          <Btn                onClick={() => setCreateModal(true)}><Plus size={14}/>Admin Transaction</Btn>
        </div>
      </div>

      {/* ── Reported transactions ── */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700' }}>🚨 Reported Transactions</h3>
          <Badge color="red">{reported.length} pending</Badge>
        </div>
        <Table
          cols={['Transaction ID', 'User', 'Status', 'Reported At', 'Actions']}
          rows={reported.map(r => (
            <>
              <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:'11px', color:'var(--accent-blue)' }}>
                {r.transaction_id || r.id || '—'}
              </td>
              <td style={{ padding:'10px 14px', fontSize:'13px' }}>
                <div style={{ fontWeight:'600' }}>{userName(r.user_id)}</div>
                <div style={{ fontFamily:'monospace', fontSize:'10px', color:'var(--text-muted)', marginTop:'2px' }}>
                  {r.user_id ? `${String(r.user_id).slice(0,8)}…` : '—'}
                </div>
              </td>
              <td style={{ padding:'10px 14px' }}><Badge color="amber">{r.status || 'REPORTED'}</Badge></td>
              <td style={{ padding:'10px 14px', fontSize:'12px', color:'var(--text-muted)' }}>
                {r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '—'}
              </td>
              <td style={{ padding:'10px 14px' }}>
                <div style={{ display:'flex', gap:'4px' }}>
                  <Btn size="sm" color="green" onClick={() => act(adminApprove, 'Transaction approved', r.transaction_id || r.id)}>
                    <CheckCircle size={12}/>Approve
                  </Btn>
                  <Btn size="sm" color="blue" onClick={() => act(adminReverse, 'Transaction reversed', r.transaction_id || r.id)}>
                    <RotateCcw size={12}/>Reverse
                  </Btn>
                  <Btn size="sm" color="red" onClick={() => setCancelModal({ open:true, txId: r.transaction_id || r.id })}>
                    <XCircle size={12}/>Cancel
                  </Btn>
                  <Btn size="sm" color="ghost" onClick={() => openLedger(r.transaction_id || r.id)}>Ledger</Btn>
                </div>
              </td>
            </>
          ))}
          empty="✅ No reported transactions to review"/>
      </Card>

      {/* ── Create Transaction modal ── */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Admin Transaction">
        <form onSubmit={doCreate}>
          {/* User dropdown — replaces free-text UUID input */}
          <UserPicker
            users={users}
            value={txForm.user_id}
            onChange={uid => setTxForm(f => ({ ...f, user_id: uid }))}/>

          {/* Show selected user's UUID for reference */}
          {txForm.user_id && (
            <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.18)',
              borderRadius:6, padding:'8px 12px', marginBottom:'14px', fontSize:'11px',
              fontFamily:'monospace', color:'var(--text-muted)', wordBreak:'break-all' }}>
              UUID: {txForm.user_id}
            </div>
          )}

          <Input
            label="Amount (₹)" type="number" step="0.01" placeholder="e.g. 1000.00"
            value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount:e.target.value }))} required/>
          <Input
            label="Location" placeholder="e.g. Mumbai, India"
            value={txForm.location} onChange={e => setTxForm(f => ({ ...f, location:e.target.value }))} required/>
          <Select label="Channel" value={txForm.channel} onChange={e => setTxForm(f => ({ ...f, channel:e.target.value }))}>
            <option value="web">Web</option>
            <option value="mobile">Mobile</option>
            <option value="atm">ATM</option>
          </Select>
          <Input
            label="Duration (seconds)" type="number" placeholder="e.g. 1"
            value={txForm.transaction_duration} onChange={e => setTxForm(f => ({ ...f, transaction_duration:e.target.value }))} required/>

          <Btn type="submit" loading={submitting} size="lg" style={{ width:'100%', justifyContent:'center' }}>
            Submit Transaction
          </Btn>
        </form>
      </Modal>

      {/* ── Bulk modal ── */}
      <Modal
        open={bulkModal.open}
        onClose={() => setBulkModal({ open:false, type:'debit' })}
        title={`Bulk ${bulkModal.type === 'debit' ? 'Debit' : 'Credit'}`}>
        <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginBottom:'12px' }}>
          One row per line:&nbsp;
          <code style={{ background:'var(--bg-input)', padding:'2px 6px', borderRadius:4 }}>
            user_uuid,amount,location,channel
          </code>
        </p>
        <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={8}
          placeholder={"550e8400-...,500,Mumbai,web\n550e8401-...,250,Delhi,mobile"}
          style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', padding:'10px', color:'var(--text-primary)',
            fontSize:'12px', fontFamily:'monospace', outline:'none', resize:'vertical', marginBottom:'12px' }}/>
        <Btn loading={submitting} onClick={doBulk}
          color={bulkModal.type === 'debit' ? 'red' : 'green'} size="lg"
          style={{ width:'100%', justifyContent:'center' }}>
          Process Bulk {bulkModal.type === 'debit' ? 'Debit' : 'Credit'}
        </Btn>
      </Modal>

      {/* ── Cancel modal ── */}
      <Modal
        open={cancelModal.open}
        onClose={() => { setCancelModal({ open:false, txId:null }); setCancelReason(''); }}
        title="Cancel Transaction">
        <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
          borderRadius:8, padding:'12px 14px', marginBottom:'16px', fontSize:'13px', color:'var(--accent-red)' }}>
          ⚠ This will cancel the transaction and immediately refund the user.
        </div>
        <Input
          label="Cancellation Reason (min 5 characters)"
          placeholder="e.g. Duplicate transaction"
          value={cancelReason} onChange={e => setCancelReason(e.target.value)} required/>
        <Btn loading={submitting} onClick={doCancel} color="red" size="lg" style={{ width:'100%', justifyContent:'center' }}>
          Cancel &amp; Refund
        </Btn>
      </Modal>

      {/* ── Ledger modal ── */}
      <Modal open={ledgerModal.open} onClose={() => setLedgerModal({ open:false, data:[] })} title="Transaction Ledger">
        {ledgerModal.data.length > 0 ? (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Type','Amount','Direction','Balanced','Created'].map(h =>
                    <th key={h} style={{ padding:'8px', textAlign:'left', color:'var(--text-muted)', fontWeight:'600' }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {ledgerModal.data.map((l, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid rgba(30,45,69,0.4)' }}>
                    <td style={{ padding:'8px' }}>{l.entry_type || l.type || '—'}</td>
                    <td style={{ padding:'8px', fontWeight:'700', color:l.direction==='credit'?'var(--accent-green)':'var(--accent-red)' }}>
                      ₹{(l.amount || 0).toLocaleString('en-IN', { minimumFractionDigits:2 })}
                    </td>
                    <td style={{ padding:'8px' }}>
                      <Badge color={l.direction === 'credit' ? 'green' : 'red'}>{l.direction || '—'}</Badge>
                    </td>
                    <td style={{ padding:'8px' }}>
                      {l.balanced ? <Badge color="green">✓</Badge> : <Badge color="red">✗</Badge>}
                    </td>
                    <td style={{ padding:'8px', color:'var(--text-muted)' }}>
                      {l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px' }}>No ledger entries found</p>
        )}
      </Modal>
    </div>
  );
}

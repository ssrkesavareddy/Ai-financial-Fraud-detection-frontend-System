import { useState, useEffect } from 'react';
import { adminGetUsers, adminBlockUser, adminUnblockUser, adminActivateUser, adminDeactivateUser, adminUpdateBalance, adminCreateUser, adminGetUserLedger } from '../../api/client';
import { Card, Btn, Badge, Table, Modal, Input, useToast, Toast, Spinner } from '../../components/UI';
import { UserPlus, Search, Copy, CheckCheck, Eye, EyeOff } from 'lucide-react';

/* ── UUID cell: truncated by default, expand on click, one-click copy ─── */
function UUIDCell({ value }) {
  const [expanded, setExpanded] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const copy = e => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}>
      <span
        onClick={() => setExpanded(v => !v)}
        title={expanded ? 'Click to collapse' : 'Click to see full UUID'}
        style={{
          fontFamily: 'monospace', fontSize: '11px',
          color: 'var(--accent-blue)',
          cursor: 'pointer',
          userSelect: 'text',
          whiteSpace: 'nowrap',
        }}>
        {expanded ? value : `${value.slice(0, 8)}…`}
      </span>

      <button onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand UUID'}
        style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', display:'inline-flex', color:'var(--text-muted)' }}>
        {expanded ? <EyeOff size={11}/> : <Eye size={11}/>}
      </button>

      <button onClick={copy} title={copied ? 'Copied!' : 'Copy UUID'}
        style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', display:'inline-flex',
          color: copied ? 'var(--accent-green)' : 'var(--text-muted)' }}>
        {copied ? <CheckCheck size={11}/> : <Copy size={11}/>}
      </button>
    </span>
  );
}

export default function AdminUsers() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [createModal,  setCreateModal]  = useState(false);
  const [balanceModal, setBalanceModal] = useState({ open:false, user:null });
  const [ledgerModal,  setLedgerModal]  = useState({ open:false, user:null, data:[] });
  const [createForm,   setCreateForm]   = useState({ name:'', email:'', password:'', phone:'', dob:'' });
  const [balanceAmt,   setBalanceAmt]   = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const { toast, show, clear } = useToast();

  /* ── data ── */
  const load = async () => {
    setLoading(true);
    try { const r = await adminGetUsers(); setUsers(Array.isArray(r.data) ? r.data : []); }
    catch { show('Failed to load users — please refresh the page', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ── generic action ── */
  const action = async (fn, successMsg, ...args) => {
    setSubmitting(true);
    try { await fn(...args); show(successMsg, 'success'); load(); }
    catch(e) { show(e.response?.data?.detail || 'Action failed — please try again', 'error'); }
    finally { setSubmitting(false); }
  };

  /* ── create ── */
  const doCreate = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      await adminCreateUser(createForm);
      show(`✅ User "${createForm.name}" created successfully`, 'success');
      setCreateModal(false);
      setCreateForm({ name:'', email:'', password:'', phone:'', dob:'' });
      load();
    } catch(e) { show(e.response?.data?.detail || 'Failed to create user', 'error'); }
    finally { setSubmitting(false); }
  };

  /* ── balance ── */
  const doBalance = async e => {
    e.preventDefault(); setSubmitting(true);
    const amt = parseFloat(balanceAmt);
    try {
      await adminUpdateBalance(balanceModal.user.id, { amount: amt });
      show(
        amt >= 0
          ? `✅ ₹${amt.toLocaleString('en-IN')} credited to ${balanceModal.user.name}`
          : `✅ ₹${Math.abs(amt).toLocaleString('en-IN')} debited from ${balanceModal.user.name}`,
        'success'
      );
      setBalanceModal({ open:false, user:null }); setBalanceAmt(''); load();
    } catch(e) { show(e.response?.data?.detail || 'Balance update failed', 'error'); }
    finally { setSubmitting(false); }
  };

  /* ── ledger ── */
  const openLedger = async u => {
    setLedgerModal({ open:true, user:u, data:[] });
    try {
      const r = await adminGetUserLedger(u.id, 1, 20);
      setLedgerModal(m => ({
        ...m,
        data: Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [],
      }));
    } catch { show('Failed to load ledger entries', 'error'); }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search) ||
    String(u.id)?.toLowerCase().includes(search.toLowerCase()) ||
    u.public_id?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner/>;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Users</h2>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{users.length} registered accounts</p>
        </div>
        <Btn onClick={() => setCreateModal(true)}><UserPlus size={14}/>Create User</Btn>
      </div>

      <Card>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input
              placeholder="Search by name, email, phone or UUID…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)',
                borderRadius:'var(--radius-sm)', padding:'9px 14px 9px 34px',
                color:'var(--text-primary)', fontSize:'13px', outline:'none' }}/>
          </div>
          <Badge color="blue">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Badge>
        </div>

        <Table
          cols={['User ID (UUID)', 'Name', 'Email', 'Phone', 'Balance', 'Role', 'Status', 'Actions']}
          rows={filtered.map(u => (
            <>
              <td style={{ padding:'10px 14px' }}>
                <UUIDCell value={String(u.id)}/>
              </td>
              <td style={{ padding:'10px 14px', fontWeight:'600', fontSize:'13px' }}>{u.name}</td>
              <td style={{ padding:'10px 14px', fontSize:'13px', color:'var(--text-secondary)' }}>{u.email || '—'}</td>
              <td style={{ padding:'10px 14px', fontSize:'12px', fontFamily:'monospace' }}>{u.phone}</td>
              <td style={{ padding:'10px 14px', fontWeight:'700', color:'var(--accent-green)' }}>
                ₹{(u.account_balance || 0).toLocaleString('en-IN', { minimumFractionDigits:2 })}
              </td>
              <td style={{ padding:'10px 14px' }}>
                <Badge color={u.role === 'admin' ? 'purple' : 'blue'}>{u.role}</Badge>
              </td>
              <td style={{ padding:'10px 14px' }}>
                {u.is_blocked
                  ? <Badge color="red">🔒 Blocked</Badge>
                  : !u.is_active
                    ? <Badge color="amber">⏸ Inactive</Badge>
                    : u.is_verified
                      ? <Badge color="green">✅ Active</Badge>
                      : <Badge color="amber">⚠ Unverified</Badge>}
              </td>
              <td style={{ padding:'10px 14px' }}>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                  <Btn size="sm" color="ghost" onClick={() => setBalanceModal({ open:true, user:u })}>Balance</Btn>
                  <Btn size="sm" color="ghost" onClick={() => openLedger(u)}>Ledger</Btn>

                  {/* Block / Unblock */}
                  {u.is_blocked
                    ? <Btn size="sm" color="green" onClick={() => action(adminUnblockUser, `${u.name} has been unblocked`, u.id)}>Unblock</Btn>
                    : <Btn size="sm" color="red"   onClick={() => action(adminBlockUser,   `${u.name} has been blocked`,   u.id)}>Block</Btn>}

                  {/* Activate / Deactivate — correctly uses is_active */}
                  {u.is_active
                    ? <Btn size="sm" color="amber" onClick={() => action(adminDeactivateUser, `${u.name} has been deactivated`, u.id)}>Deactivate</Btn>
                    : <Btn size="sm" color="green" onClick={() => action(adminActivateUser,   `${u.name} has been activated`,   u.id)}>Activate</Btn>}
                </div>
              </td>
            </>
          ))}
          empty="No users found"/>
      </Card>

      {/* ── Create User ── */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create New User">
        <form onSubmit={doCreate}>
          <Input label="Full Name" placeholder="John Doe"
            value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name:e.target.value }))} required/>
          <Input label="Email" type="email" placeholder="john@example.com"
            value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email:e.target.value }))} required/>
          <Input label="Phone" placeholder="+91XXXXXXXXXX"
            value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone:e.target.value }))} required/>
          <Input label="Password" type="password" placeholder="Min 8 characters"
            value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password:e.target.value }))} required/>
          <Input label="Date of Birth" type="date"
            value={createForm.dob} onChange={e => setCreateForm(f => ({ ...f, dob:e.target.value }))} required/>
          <Btn type="submit" loading={submitting} size="lg" style={{ width:'100%', justifyContent:'center' }}>
            Create User
          </Btn>
        </form>
      </Modal>

      {/* ── Update Balance ── */}
      <Modal
        open={balanceModal.open}
        onClose={() => { setBalanceModal({ open:false, user:null }); setBalanceAmt(''); }}
        title={`Update Balance — ${balanceModal.user?.name}`}>
        <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'14px 16px', marginBottom:'20px' }}>
          <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'4px' }}>Current Balance</p>
          <p style={{ fontSize:'24px', fontWeight:'800', color:'var(--accent-green)' }}>
            ₹{(balanceModal.user?.account_balance || 0).toLocaleString('en-IN', { minimumFractionDigits:2 })}
          </p>
          <p style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'6px', fontFamily:'monospace' }}>
            UUID: {balanceModal.user?.id}
          </p>
        </div>
        <form onSubmit={doBalance}>
          <Input
            label="Amount (positive = add funds, negative = deduct funds)"
            type="number" step="0.01" placeholder="e.g. 500 or -200"
            value={balanceAmt} onChange={e => setBalanceAmt(e.target.value)} required/>
          <Btn type="submit" loading={submitting} size="lg" style={{ width:'100%', justifyContent:'center' }}>
            Update Balance
          </Btn>
        </form>
      </Modal>

      {/* ── Ledger ── */}
      <Modal
        open={ledgerModal.open}
        onClose={() => setLedgerModal({ open:false, user:null, data:[] })}
        title={`Ledger — ${ledgerModal.user?.name}`}>
        {ledgerModal.data.length > 0 ? (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Entry Type','Amount','Direction','Created'].map(h =>
                    <th key={h} style={{ padding:'8px', textAlign:'left', color:'var(--text-muted)', fontWeight:'600' }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {ledgerModal.data.map((l, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid rgba(30,45,69,0.4)' }}>
                    <td style={{ padding:'8px', textTransform:'capitalize' }}>{l.entry_type || l.type || '—'}</td>
                    <td style={{ padding:'8px', fontWeight:'700', color:l.direction==='credit'?'var(--accent-green)':'var(--accent-red)' }}>
                      ₹{(l.amount || 0).toLocaleString('en-IN', { minimumFractionDigits:2 })}
                    </td>
                    <td style={{ padding:'8px' }}>
                      <Badge color={l.direction === 'credit' ? 'green' : 'red'}>{l.direction || '—'}</Badge>
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

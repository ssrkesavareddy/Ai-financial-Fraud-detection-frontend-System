import { useState, useEffect } from 'react';
import { adminGetUsers, adminBlockUser, adminUnblockUser, adminActivateUser, adminDeactivateUser, adminUpdateBalance, adminCreateUser, adminGetUserLedger } from '../../api/client';
import { Card, Btn, Badge, Table, Modal, Input, useToast, Toast, Spinner } from '../../components/UI';
import { UserPlus, Search } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [balanceModal, setBalanceModal] = useState({ open:false, user:null });
  const [ledgerModal, setLedgerModal] = useState({ open:false, user:null, data:[] });
  const [createForm, setCreateForm] = useState({ name:'', email:'', password:'', phone:'', dob:'' });
  const [balanceAmt, setBalanceAmt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, show, clear } = useToast();

  const load = async () => { setLoading(true); try { const r=await adminGetUsers(); setUsers(Array.isArray(r.data)?r.data:[]); } catch{ show('Failed to load users','error'); } finally{ setLoading(false); }};
  useEffect(()=>{ load(); },[]);

  const action = async (fn, ...args) => { setSubmitting(true); try{ await fn(...args); show('Done','success'); load(); }catch(e){ show(e.response?.data?.detail||'Error','error'); } finally{ setSubmitting(false); }};

  const doCreate = async e => {
    e.preventDefault(); setSubmitting(true);
    try{ await adminCreateUser(createForm); show('User created','success'); setCreateModal(false); load(); }
    catch(e){ show(e.response?.data?.detail||'Error','error'); } finally{ setSubmitting(false); }
  };

  const doBalance = async e => {
    e.preventDefault(); setSubmitting(true);
    try{ await adminUpdateBalance(balanceModal.user.id, { amount: parseFloat(balanceAmt) }); show('Balance updated','success'); setBalanceModal({open:false,user:null}); setBalanceAmt(''); load(); }
    catch(e){ show(e.response?.data?.detail||'Error','error'); } finally{ setSubmitting(false); }
  };

  const openLedger = async u => {
    setLedgerModal({ open:true, user:u, data:[] });
    try{ const r=await adminGetUserLedger(u.id,1,20); setLedgerModal(m=>({...m,data:Array.isArray(r.data?.data)?r.data.data:Array.isArray(r.data)?r.data:[]})); }
    catch{ show('Failed to load ledger','error'); }
  };

  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.includes(search) || u.phone?.includes(search));

  if (loading) return <Spinner/>;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div><h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Users</h2><p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{users.length} registered accounts</p></div>
        <Btn onClick={()=>setCreateModal(true)}><UserPlus size={14}/>Create User</Btn>
      </div>

      <Card>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
            <input placeholder="Search by name, email or phone..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'9px 14px 9px 34px', color:'var(--text-primary)', fontSize:'13px', outline:'none' }}/>
          </div>
          <Badge color="blue">{filtered.length} results</Badge>
        </div>
        <Table
          cols={['Name','Email','Phone','Balance','Role','Status','Actions']}
          rows={filtered.map(u => (
            <><td style={{padding:'10px 14px',fontWeight:'600',fontSize:'13px'}}>{u.name}</td>
            <td style={{padding:'10px 14px',fontSize:'13px',color:'var(--text-secondary)'}}>{u.email||'—'}</td>
            <td style={{padding:'10px 14px',fontSize:'12px',fontFamily:'monospace'}}>{u.phone}</td>
            <td style={{padding:'10px 14px',fontWeight:'700',color:'var(--accent-green)'}}>₹{(u.account_balance||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
            <td style={{padding:'10px 14px'}}><Badge color={u.role==='admin'?'purple':'blue'}>{u.role}</Badge></td>
            <td style={{padding:'10px 14px'}}>
              {u.is_blocked?<Badge color="red">Blocked</Badge>:u.is_verified?<Badge color="green">Active</Badge>:<Badge color="amber">Unverified</Badge>}
            </td>
            <td style={{padding:'10px 14px'}}>
              <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                <Btn size="sm" color="ghost" onClick={()=>setBalanceModal({open:true,user:u})}>Balance</Btn>
                <Btn size="sm" color="ghost" onClick={()=>openLedger(u)}>Ledger</Btn>
                {u.is_blocked
                  ? <Btn size="sm" color="green" onClick={()=>action(adminUnblockUser,u.id)}>Unblock</Btn>
                  : <Btn size="sm" color="red" onClick={()=>action(adminBlockUser,u.id)}>Block</Btn>}
                {u.is_verified
                  ? <Btn size="sm" color="amber" onClick={()=>action(adminDeactivateUser,u.id)}>Deactivate</Btn>
                  : <Btn size="sm" color="green" onClick={()=>action(adminActivateUser,u.id)}>Activate</Btn>}
              </div>
            </td></>
          ))}
          empty="No users found"/>
      </Card>

      {/* Create user modal */}
      <Modal open={createModal} onClose={()=>setCreateModal(false)} title="Create User">
        <form onSubmit={doCreate}>
          <Input label="Full Name" value={createForm.name} onChange={e=>setCreateForm(f=>({...f,name:e.target.value}))} required/>
          <Input label="Email" type="email" value={createForm.email} onChange={e=>setCreateForm(f=>({...f,email:e.target.value}))} required/>
          <Input label="Phone (+91XXXXXXXXXX)" value={createForm.phone} onChange={e=>setCreateForm(f=>({...f,phone:e.target.value}))} required/>
          <Input label="Password" type="password" value={createForm.password} onChange={e=>setCreateForm(f=>({...f,password:e.target.value}))} required/>
          <Input label="Date of Birth" type="date" value={createForm.dob} onChange={e=>setCreateForm(f=>({...f,dob:e.target.value}))} required/>
          <Btn type="submit" loading={submitting} size="lg" style={{ width:'100%', justifyContent:'center' }}>Create</Btn>
        </form>
      </Modal>

      {/* Balance modal */}
      <Modal open={balanceModal.open} onClose={()=>setBalanceModal({open:false,user:null})} title={`Update Balance — ${balanceModal.user?.name}`}>
        <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginBottom:'16px' }}>Current balance: <strong style={{color:'var(--accent-green)'}}>₹{(balanceModal.user?.account_balance||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong></p>
        <form onSubmit={doBalance}>
          <Input label="Amount (positive = add, negative = deduct)" type="number" step="0.01" placeholder="500 or -200" value={balanceAmt} onChange={e=>setBalanceAmt(e.target.value)} required/>
          <Btn type="submit" loading={submitting} size="lg" style={{ width:'100%', justifyContent:'center' }}>Update Balance</Btn>
        </form>
      </Modal>

      {/* Ledger modal */}
      <Modal open={ledgerModal.open} onClose={()=>setLedgerModal({open:false,user:null,data:[]})} title={`Ledger — ${ledgerModal.user?.name}`}>
        {ledgerModal.data.length > 0 ? (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead><tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Entry Type','Amount','Direction','Created'].map(h=><th key={h} style={{ padding:'8px', textAlign:'left', color:'var(--text-muted)', fontWeight:'600' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {ledgerModal.data.map((l,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid rgba(30,45,69,0.4)' }}>
                    <td style={{ padding:'8px', textTransform:'capitalize' }}>{l.entry_type||l.type||'—'}</td>
                    <td style={{ padding:'8px', fontWeight:'700', color:l.direction==='credit'?'var(--accent-green)':'var(--accent-red)' }}>₹{(l.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td style={{ padding:'8px' }}><Badge color={l.direction==='credit'?'green':'red'}>{l.direction||'—'}</Badge></td>
                    <td style={{ padding:'8px', color:'var(--text-muted)' }}>{l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px' }}>No ledger entries</p>}
      </Modal>
    </div>
  );
}

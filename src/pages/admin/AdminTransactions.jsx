import { useState, useEffect } from 'react';
import { adminGetReported, adminApprove, adminReverse, adminCancelTransaction, adminCreateTransaction, adminBulkDebit, adminBulkCredit, adminGetTransactionLedger } from '../../api/client';
import { Card, Btn, Badge, Table, Modal, Input, Select, useToast, Toast, Spinner } from '../../components/UI';
import { Plus, Download, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

export default function AdminTransactions() {
  const [reported, setReported] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [bulkModal, setBulkModal] = useState({ open:false, type:'debit' });
  const [cancelModal, setCancelModal] = useState({ open:false, txId:null });
  const [ledgerModal, setLedgerModal] = useState({ open:false, data:[] });
  const [txForm, setTxForm] = useState({ user_id:'', amount:'', transaction_duration:'1', location:'', channel:'web' });
  const [bulkText, setBulkText] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, show, clear } = useToast();

  const load = async () => { setLoading(true); try{ const r=await adminGetReported(1,50); setReported(Array.isArray(r.data?.data)?r.data.data:Array.isArray(r.data)?r.data:[]); }catch{ show('Failed','error'); }finally{ setLoading(false); }};
  useEffect(()=>{ load(); },[]);

  const act = async (fn, id) => { try{ await fn(id); show('Done','success'); load(); }catch(e){ show(e.response?.data?.detail||'Error','error'); }};

  const doCreate = async e => {
    e.preventDefault(); setSubmitting(true);
    try{ await adminCreateTransaction({...txForm, amount:parseFloat(txForm.amount), transaction_duration:parseFloat(txForm.transaction_duration)}); show('Transaction created','success'); setCreateModal(false); }
    catch(e){ show(e.response?.data?.detail||'Error','error'); } finally{ setSubmitting(false); }
  };

  const doBulk = async () => {
    setSubmitting(true);
    try{
      const lines = bulkText.trim().split('\n').filter(Boolean);
      const txns = lines.map(l => { const [user_id,amount,location,channel]=l.split(',').map(s=>s.trim()); return { user_id, amount:parseFloat(amount), transaction_duration:1, location, channel }; });
      const fn = bulkModal.type==='debit' ? adminBulkDebit : adminBulkCredit;
      const r = await fn({ transactions: txns });
      show(`Done: ${r.data.succeeded} succeeded, ${r.data.failed} failed`,'success');
      setBulkModal({open:false,type:'debit'}); setBulkText('');
    }catch(e){ show(e.response?.data?.detail||'Error','error'); } finally{ setSubmitting(false); }
  };

  const doCancel = async () => {
    if(!cancelReason||cancelReason.length<5) return show('Reason must be at least 5 chars','error');
    setSubmitting(true);
    try{ await adminCancelTransaction(cancelModal.txId,{reason:cancelReason}); show('Cancelled & refunded','success'); setCancelModal({open:false,txId:null}); setCancelReason(''); load(); }
    catch(e){ show(e.response?.data?.detail||'Error','error'); } finally{ setSubmitting(false); }
  };

  const openLedger = async (txId) => {
    setLedgerModal({open:true,data:[]});
    try{ const r=await adminGetTransactionLedger(txId); setLedgerModal(m=>({...m,data:Array.isArray(r.data)?r.data:r.data?.data||[]})); }
    catch{ show('Ledger not available','error'); }
  };

  if (loading) return <Spinner/>;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div><h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Transactions</h2><p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>Manage and review transactions</p></div>
        <div style={{ display:'flex', gap:'8px' }}>
          <Btn color="ghost" onClick={()=>setBulkModal({open:true,type:'debit'})}><Download size={14}/>Bulk Debit</Btn>
          <Btn color="green" onClick={()=>setBulkModal({open:true,type:'credit'})}><Plus size={14}/>Bulk Credit</Btn>
          <Btn onClick={()=>setCreateModal(true)}><Plus size={14}/>Admin Transaction</Btn>
        </div>
      </div>

      {/* Reported */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700' }}>🚨 Reported Transactions</h3>
          <Badge color="red">{reported.length} pending</Badge>
        </div>
        <Table
          cols={['Transaction ID','User ID','Status','Reported At','Actions']}
          rows={reported.map(r => (
            <><td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:'11px',color:'var(--accent-blue)'}}>{r.transaction_id||r.id||'—'}</td>
            <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:'11px',color:'var(--text-muted)'}}>{r.user_id||'—'}</td>
            <td style={{padding:'10px 14px'}}><Badge color="amber">{r.status||'REPORTED'}</Badge></td>
            <td style={{padding:'10px 14px',fontSize:'12px',color:'var(--text-muted)'}}>{r.created_at?new Date(r.created_at).toLocaleString():'—'}</td>
            <td style={{padding:'10px 14px'}}>
              <div style={{ display:'flex', gap:'4px' }}>
                <Btn size="sm" color="green" onClick={()=>act(adminApprove,r.transaction_id||r.id)}><CheckCircle size={12}/>Approve</Btn>
                <Btn size="sm" color="blue" onClick={()=>act(adminReverse,r.transaction_id||r.id)}><RotateCcw size={12}/>Reverse</Btn>
                <Btn size="sm" color="red" onClick={()=>setCancelModal({open:true,txId:r.transaction_id||r.id})}><XCircle size={12}/>Cancel</Btn>
                <Btn size="sm" color="ghost" onClick={()=>openLedger(r.transaction_id||r.id)}>Ledger</Btn>
              </div>
            </td></>
          ))}
          empty="No reported transactions to review ✅"/>
      </Card>

      {/* Create modal */}
      <Modal open={createModal} onClose={()=>setCreateModal(false)} title="Admin Transaction">
        <form onSubmit={doCreate}>
          <Input label="User ID (UUID)" value={txForm.user_id} onChange={e=>setTxForm(f=>({...f,user_id:e.target.value}))} required/>
          <Input label="Amount (₹)" type="number" step="0.01" value={txForm.amount} onChange={e=>setTxForm(f=>({...f,amount:e.target.value}))} required/>
          <Input label="Location" value={txForm.location} onChange={e=>setTxForm(f=>({...f,location:e.target.value}))} required/>
          <Select label="Channel" value={txForm.channel} onChange={e=>setTxForm(f=>({...f,channel:e.target.value}))}>
            <option value="web">Web</option><option value="mobile">Mobile</option><option value="atm">ATM</option>
          </Select>
          <Input label="Duration (seconds)" type="number" value={txForm.transaction_duration} onChange={e=>setTxForm(f=>({...f,transaction_duration:e.target.value}))} required/>
          <Btn type="submit" loading={submitting} size="lg" style={{ width:'100%', justifyContent:'center' }}>Submit</Btn>
        </form>
      </Modal>

      {/* Bulk modal */}
      <Modal open={bulkModal.open} onClose={()=>setBulkModal({open:false,type:'debit'})} title={`Bulk ${bulkModal.type==='debit'?'Debit':'Credit'}`}>
        <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginBottom:'12px' }}>
          One row per line: <code style={{ background:'var(--bg-input)', padding:'2px 6px', borderRadius:4 }}>user_uuid,amount,location,channel</code>
        </p>
        <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} rows={8}
          placeholder={"550e8400-...,500,Mumbai,web\n550e8401-...,250,Delhi,mobile"}
          style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'10px', color:'var(--text-primary)', fontSize:'12px', fontFamily:'monospace', outline:'none', resize:'vertical', marginBottom:'12px' }}/>
        <Btn loading={submitting} onClick={doBulk} color={bulkModal.type==='debit'?'red':'green'} size="lg" style={{ width:'100%', justifyContent:'center' }}>
          Process Bulk {bulkModal.type==='debit'?'Debit':'Credit'}
        </Btn>
      </Modal>

      {/* Cancel modal */}
      <Modal open={cancelModal.open} onClose={()=>setCancelModal({open:false,txId:null})} title="Cancel Transaction">
        <p style={{ color:'var(--accent-amber)', fontSize:'13px', marginBottom:'16px' }}>⚠ This will cancel the transaction and immediately refund the user.</p>
        <Input label="Cancellation Reason (min 5 chars)" value={cancelReason} onChange={e=>setCancelReason(e.target.value)} required/>
        <Btn loading={submitting} onClick={doCancel} color="red" size="lg" style={{ width:'100%', justifyContent:'center' }}>Cancel & Refund</Btn>
      </Modal>

      {/* Ledger modal */}
      <Modal open={ledgerModal.open} onClose={()=>setLedgerModal({open:false,data:[]})} title="Transaction Ledger">
        {ledgerModal.data.length > 0 ? (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead><tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Type','Amount','Direction','Balanced','Created'].map(h=><th key={h} style={{ padding:'8px', textAlign:'left', color:'var(--text-muted)', fontWeight:'600' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {ledgerModal.data.map((l,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid rgba(30,45,69,0.4)' }}>
                    <td style={{ padding:'8px' }}>{l.entry_type||l.type||'—'}</td>
                    <td style={{ padding:'8px', fontWeight:'700', color:l.direction==='credit'?'var(--accent-green)':'var(--accent-red)' }}>₹{(l.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td style={{ padding:'8px' }}><Badge color={l.direction==='credit'?'green':'red'}>{l.direction||'—'}</Badge></td>
                    <td style={{ padding:'8px' }}>{l.balanced ? <Badge color="green">✓</Badge> : <Badge color="red">✗</Badge>}</td>
                    <td style={{ padding:'8px', color:'var(--text-muted)' }}>{l.created_at?new Date(l.created_at).toLocaleDateString():'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px' }}>No ledger entries found</p>}
      </Modal>
    </div>
  );
}

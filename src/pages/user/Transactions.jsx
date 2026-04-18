import { useState, useEffect } from 'react';
import { getMyTransactions } from '../../api/client';
import { Card, Badge, Table, Btn, Spinner, useToast, Toast, Modal } from '../../components/UI';
import { reportTransaction, verifyReport } from '../../api/client';
import { Filter, ArrowDownLeft, ArrowUpRight, AlertTriangle } from 'lucide-react';

const typeColor = t => ['credit','admin_credit','bulk_credit','refund'].includes(t)?'green':'red';
const statusColor = s => ({COMPLETED:'green',DELAYED:'amber',REPORTED:'red',REVERSED:'blue',CANCELLED:'gray',PENDING:'amber'})[s]||'gray';

export default function UserTransactions() {
  const [txns, setTxns] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reportModal, setReportModal] = useState({ open:false, tx:null, step:'confirm' });
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, show, clear } = useToast();

  const load = async () => {
    setLoading(true);
    try { const r = await getMyTransactions(filter||null); setTxns(Array.isArray(r.data)?r.data:[]); }
    catch { show('Failed to load transactions','error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const doReport = async () => {
    setSubmitting(true);
    try {
      await reportTransaction(reportModal.tx.id || reportModal.tx.public_id);
      show('OTP sent to your email','success');
      setReportModal(m => ({...m, step:'otp'}));
    } catch(e) { show(e.response?.data?.detail||'Error','error'); }
    finally { setSubmitting(false); }
  };

  const doVerify = async () => {
    if (!otp) return show('Enter OTP','error');
    setSubmitting(true);
    try {
      await verifyReport(reportModal.tx.id || reportModal.tx.public_id, { otp });
      show('Fraud report submitted!','success');
      setReportModal({ open:false, tx:null, step:'confirm' }); setOtp(''); load();
    } catch(e) { show(e.response?.data?.detail||'Invalid OTP','error'); }
    finally { setSubmitting(false); }
  };

  const TYPES = ['','debit','credit','admin_credit','admin_debit','bulk_debit','bulk_credit','refund','reversal'];

  if (loading) return <Spinner/>;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ marginBottom:'24px' }}>
        <h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>My Transactions</h2>
        <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{txns.length} transactions found</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Total', val:txns.length, color:'blue', icon:'📊' },
          { label:'Completed', val:txns.filter(t=>t.status==='COMPLETED').length, color:'green', icon:'✅' },
          { label:'Delayed/Reported', val:txns.filter(t=>['DELAYED','REPORTED'].includes(t.status)).length, color:'amber', icon:'⏳' },
          { label:'Fraud Flagged', val:txns.filter(t=>t.is_fraud).length, color:'red', icon:'🚨' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:`var(--accent-${s.color})` }}/>
            <div style={{ fontSize:'22px', marginBottom:'4px' }}>{s.icon}</div>
            <div style={{ fontSize:'22px', fontWeight:'800' }}>{s.val}</div>
            <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Card>
        {/* Filters */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          {TYPES.map(t => (
            <button key={t} onClick={()=>setFilter(t)}
              style={{ padding:'6px 14px', borderRadius:'999px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'600', transition:'all 0.15s',
                background: filter===t?'var(--accent-blue)':'var(--bg-input)',
                color: filter===t?'white':'var(--text-secondary)' }}>
              {t||'All'}
            </button>
          ))}
        </div>

        <Table
          cols={['Public ID','Type','Direction','Amount','Status','Fraud Score','Date','Action']}
          rows={txns.map(t => {
            const isIn = ['credit','admin_credit','bulk_credit','refund'].includes(t.transaction_type);
            return (
              <><td style={{padding:'10px 14px'}}>
                <button onClick={()=>setSelected(t)} style={{ background:'none',border:'none',cursor:'pointer',fontFamily:'monospace',fontSize:'11px',color:'var(--accent-blue)',textDecoration:'underline' }}>{t.public_id||'—'}</button>
              </td>
              <td style={{padding:'10px 14px'}}><Badge color={typeColor(t.transaction_type)}>{t.transaction_type||'—'}</Badge></td>
              <td style={{padding:'10px 14px',fontSize:'13px'}}>
                <span style={{ display:'flex',alignItems:'center',gap:'4px',color:isIn?'var(--accent-green)':'var(--accent-red)',fontWeight:'600' }}>
                  {isIn?<ArrowDownLeft size={14}/>:<ArrowUpRight size={14}/>}{isIn?'In':'Out'}
                </span>
              </td>
              <td style={{padding:'10px 14px',fontWeight:'700',color:isIn?'var(--accent-green)':'var(--accent-red)'}}>
                {isIn?'+':'-'}₹{(t.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}
              </td>
              <td style={{padding:'10px 14px'}}><Badge color={statusColor(t.status)}>{t.status}</Badge></td>
              <td style={{padding:'10px 14px'}}>
                <span style={{ color: (t.fraud_score||0)>0.7?'var(--accent-red)':(t.fraud_score||0)>0.4?'var(--accent-amber)':'var(--accent-green)', fontWeight:'700', fontSize:'13px' }}>
                  {(t.fraud_score||0).toFixed(2)}
                </span>
              </td>
              <td style={{padding:'10px 14px',fontSize:'12px',color:'var(--text-muted)'}}>{t.created_at?new Date(t.created_at).toLocaleDateString('en-IN'):'—'}</td>
              <td style={{padding:'10px 14px'}}>
                {t.status==='DELAYED' && <Btn size="sm" color="amber" onClick={()=>setReportModal({open:true,tx:t,step:'confirm'})}><AlertTriangle size={12}/>Report</Btn>}
              </td></>
            );
          })}
          empty="No transactions found for this filter"/>
      </Card>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Transaction — ${selected?.public_id}`}>
        {selected && (
          <div style={{ display:'grid', gap:'8px' }}>
            {[
              ['Public ID', selected.public_id],
              ['Type', selected.transaction_type],
              ['Direction', selected.direction||(['credit','admin_credit','bulk_credit','refund'].includes(selected.transaction_type)?'in':'out')],
              ['Amount', `₹${(selected.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}`],
              ['Status', selected.status],
              ['Fraud Score', (selected.fraud_score||0).toFixed(4)],
              ['Is Fraud', selected.is_fraud?'⚠ Yes':'✅ No'],
              ['Location', selected.location||'—'],
              ['Channel', selected.channel||'—'],
              ['IP Address', selected.ip_address||'—'],
              ['Device ID', selected.device_id||'—'],
              ['Model Version', selected.model_version||'v1.0'],
              ['Created', selected.created_at?new Date(selected.created_at).toLocaleString('en-IN'):'—'],
              ...(selected.cancel_reason?[['Cancel Reason', selected.cancel_reason]]:[]),
              ...(selected.reasons?.length?[['Fraud Reasons', Array.isArray(selected.reasons)?selected.reasons.join(', '):selected.reasons]]:[]),
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'var(--bg-input)', borderRadius:6, fontSize:'13px' }}>
                <span style={{ color:'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight:'600', maxWidth:'60%', textAlign:'right', wordBreak:'break-all' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Report modal */}
      <Modal open={reportModal.open} onClose={()=>{ setReportModal({open:false,tx:null,step:'confirm'}); setOtp(''); }} title="Report Fraudulent Transaction">
        {reportModal.step==='confirm'?(
          <div>
            <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, padding:'14px', marginBottom:'16px', fontSize:'13px', color:'var(--accent-amber)' }}>
              ⚠ You are reporting this transaction as fraudulent. An OTP will be sent to your registered email to confirm.
            </div>
            <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'12px', marginBottom:'16px', fontSize:'13px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ color:'var(--text-muted)' }}>Transaction</span>
                <span style={{ fontFamily:'monospace', color:'var(--accent-blue)' }}>{reportModal.tx?.public_id}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--text-muted)' }}>Amount</span>
                <span style={{ fontWeight:'700' }}>₹{(reportModal.tx?.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
              </div>
            </div>
            <Btn loading={submitting} onClick={doReport} color="amber" size="lg" style={{ width:'100%', justifyContent:'center' }}>Send OTP & Confirm Report</Btn>
          </div>
        ):(
          <div>
            <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginBottom:'16px' }}>Enter the 6-digit OTP sent to your registered email.</p>
            <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="123456" maxLength={6}
              style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'12px', color:'var(--text-primary)', fontSize:'28px', fontWeight:'800', textAlign:'center', letterSpacing:'8px', outline:'none', marginBottom:'16px' }}/>
            <Btn loading={submitting} onClick={doVerify} color="red" size="lg" style={{ width:'100%', justifyContent:'center' }}>Confirm Fraud Report</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}

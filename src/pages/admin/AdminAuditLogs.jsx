import { useState, useEffect } from 'react';
import { adminGetAuditLogs, adminValidateLedger } from '../../api/client';
import { Card, Badge, Table, Btn, Spinner, useToast, Toast, StatCard } from '../../components/UI';
import { Shield, CheckCircle, XCircle, RefreshCw, Search } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total:0, pages:1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [ledgerValidation, setLedgerValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const { toast, show, clear } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminGetAuditLogs(page, 20, null, filterAction||null);
      setLogs(Array.isArray(r.data?.data) ? r.data.data : []);
      setMeta({ total: r.data?.total||0, pages: r.data?.pages||1 });
    } catch { show('Failed to load audit logs','error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, filterAction]);

  const doValidateLedger = async () => {
    setValidating(true);
    try {
      const r = await adminValidateLedger();
      setLedgerValidation(r.data);
      show(`Ledger validation: ${r.data.status}`, r.data.status==='OK'?'success':'error');
    } catch(e) { show(e.response?.data?.detail||'Validation failed','error'); }
    finally { setValidating(false); }
  };

  const ACTION_FILTERS = ['','approve','reverse','block','unblock','balance_update','create_user','cancel','bulk_debit','bulk_credit'];
  const actionColor = a => a.includes('block')?'red':a.includes('reverse')||a.includes('cancel')?'amber':a.includes('approve')||a.includes('credit')?'green':'blue';

  if (loading && !logs.length) return <Spinner/>;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Audit Logs</h2>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{meta.total} total admin actions recorded</p>
        </div>
        <Btn color="amber" loading={validating} onClick={doValidateLedger}><Shield size={14}/>Validate Ledger</Btn>
      </div>

      {/* Ledger validation result */}
      {ledgerValidation && (
        <div style={{ background: ledgerValidation.status==='OK'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${ledgerValidation.status==='OK'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:'var(--radius)', padding:'16px', marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
            {ledgerValidation.status==='OK' ? <CheckCircle size={20} color="var(--accent-green)"/> : <XCircle size={20} color="var(--accent-red)"/>}
            <span style={{ fontWeight:'700', color: ledgerValidation.status==='OK'?'var(--accent-green)':'var(--accent-red)', fontSize:'15px' }}>
              Ledger {ledgerValidation.status==='OK'?'Balanced ✓':'IMBALANCED ✗'}
            </span>
          </div>
          <div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>
            Checked {ledgerValidation.total_transactions_checked} transactions. 
            {ledgerValidation.imbalanced?.length>0 && <span style={{ color:'var(--accent-red)', fontWeight:'600' }}> {ledgerValidation.imbalanced.length} imbalanced found!</span>}
          </div>
          {ledgerValidation.imbalanced?.length>0 && (
            <div style={{ marginTop:'12px', overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                <thead><tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Transaction ID','Debit','Credit','Delta'].map(h=><th key={h} style={{ padding:'6px 10px',textAlign:'left',color:'var(--text-muted)',fontWeight:'600' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {ledgerValidation.imbalanced.map((row,i)=>(
                    <tr key={i}><td style={{ padding:'6px 10px',fontFamily:'monospace',fontSize:'11px',color:'var(--accent-blue)' }}>{row.transaction_id}</td>
                    <td style={{ padding:'6px 10px',fontWeight:'600',color:'var(--accent-red)' }}>₹{(row.total_debit||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td style={{ padding:'6px 10px',fontWeight:'600',color:'var(--accent-green)' }}>₹{(row.total_credit||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td style={{ padding:'6px 10px',fontWeight:'700',color:'var(--accent-red)' }}>₹{Math.abs(row.delta||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Action filter */}
      <Card>
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          {ACTION_FILTERS.map(a => (
            <button key={a} onClick={()=>{ setFilterAction(a); setPage(1); }}
              style={{ padding:'5px 12px', borderRadius:'999px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'600', transition:'all 0.15s',
                background: filterAction===a?'var(--accent-blue)':'var(--bg-input)',
                color: filterAction===a?'white':'var(--text-secondary)' }}>
              {a||'All Actions'}
            </button>
          ))}
        </div>

        <Table
          cols={['Admin','Action','Target User','Details','Timestamp']}
          rows={logs.map((l,i) => (
            <><td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:'11px',color:'var(--text-muted)'}}>{l.admin_id?.slice(0,8)}…</td>
            <td style={{padding:'10px 14px'}}><Badge color={actionColor(l.action||'')}>{l.action}</Badge></td>
            <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:'11px',color:'var(--text-muted)'}}>{l.target_user_id?.slice(0,8)}…</td>
            <td style={{padding:'10px 14px',fontSize:'12px',color:'var(--text-secondary)',maxWidth:'280px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.details||'—'}</td>
            <td style={{padding:'10px 14px',fontSize:'12px',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{l.created_at?new Date(l.created_at).toLocaleString('en-IN'):'—'}</td></>
          ))}
          empty="No audit logs found"/>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginTop:'16px', alignItems:'center' }}>
            <Btn size="sm" color="ghost" onClick={()=>setPage(p=>Math.max(1,p-1))} style={{ opacity:page===1?0.4:1 }}>← Prev</Btn>
            <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>Page {page} of {meta.pages}</span>
            <Btn size="sm" color="ghost" onClick={()=>setPage(p=>Math.min(meta.pages,p+1))} style={{ opacity:page===meta.pages?0.4:1 }}>Next →</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from 'recharts';
import { TrendingUp, TrendingDown, CreditCard, AlertTriangle, ArrowUpRight, ArrowDownLeft, Send, Plus } from 'lucide-react';
import { useAuth } from '../../store/auth.jsx';
import { getMyTransactions, getMyDebits, getMyCredits, createTransaction, reportTransaction, verifyReport } from '../../api/client';
import { StatCard, Card, Modal, Input, Select, Btn, Badge, Table, useToast, Toast, Spinner } from '../../components/UI';

const COLORS = ['#3b82f6','#10b981','#ef4444','#f59e0b','#8b5cf6','#06b6d4'];
const statusColor = s => s==='COMPLETED'?'green':s==='DELAYED'?'amber':s==='REVERSED'?'blue':s==='REPORTED'?'red':'gray';

export default function UserDashboard() {
  const { user, setUser } = useAuth();
  const [txns, setTxns] = useState([]);
  const [debits, setDebits] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txModal, setTxModal] = useState(false);
  const [reportModal, setReportModal] = useState({ open:false, txId:null, step:'report' });
  const [otp, setOtp] = useState('');
  const [txForm, setTxForm] = useState({ amount:'', transaction_type:'debit', ip_address:'127.0.0.1', device_id:'web-001', location:'', channel:'web', transaction_duration:'1.5' });
  const [submitting, setSubmitting] = useState(false);
  const { toast, show, clear } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [t, d, c] = await Promise.all([getMyTransactions(), getMyDebits(), getMyCredits()]);
      setTxns(Array.isArray(t.data) ? t.data : []);
      setDebits(Array.isArray(d.data) ? d.data : []);
      setCredits(Array.isArray(c.data) ? c.data : []);
    } catch { show('Failed to load transactions','error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalDebited = debits.reduce((s,t) => s + (t.amount||0), 0);
  const totalCredited = credits.reduce((s,t) => s + (t.amount||0), 0);
  const fraudCount = txns.filter(t=>t.is_fraud).length;

  // Pie: transaction type breakdown
  const byType = txns.reduce((acc,t) => { acc[t.transaction_type||'other'] = (acc[t.transaction_type||'other']||0)+1; return acc; }, {});
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  // Status breakdown
  const byStatus = txns.reduce((acc,t) => { acc[t.status||'UNKNOWN'] = (acc[t.status||'UNKNOWN']||0)+1; return acc; }, {});
  const statusPie = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

  // Area chart: last 10 transactions amount
  const areaData = [...txns].reverse().slice(-15).map((t,i) => ({
    i: i+1, amount: t.amount, fraud: t.is_fraud?t.amount:0
  }));

  const doCreate = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTransaction({ ...txForm, amount: parseFloat(txForm.amount), transaction_duration: parseFloat(txForm.transaction_duration) });
      show('Transaction submitted!','success');
      setTxModal(false);
      setTxForm({ amount:'', transaction_type:'debit', ip_address:'127.0.0.1', device_id:'web-001', location:'', channel:'web', transaction_duration:'1.5' });
      load();
    } catch(err) { show(err.response?.data?.detail || 'Failed','error'); }
    finally { setSubmitting(false); }
  };

  const doReport = async () => {
    setSubmitting(true);
    try {
      await reportTransaction(reportModal.txId);
      show('OTP sent to your email','success');
      setReportModal(m=>({...m, step:'otp'}));
    } catch(err) { show(err.response?.data?.detail||'Error','error'); }
    finally { setSubmitting(false); }
  };

  const doVerifyReport = async () => {
    if (!otp) return show('Enter OTP','error');
    setSubmitting(true);
    try {
      await verifyReport(reportModal.txId, { otp });
      show('Fraud report submitted!','success');
      setReportModal({ open:false, txId:null, step:'report' });
      setOtp('');
      load();
    } catch(err) { show(err.response?.data?.detail||'Invalid OTP','error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Spinner/>;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>Here's your financial overview</p>
        </div>
        <Btn onClick={()=>setTxModal(true)}><Plus size={14}/>New Transaction</Btn>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px', marginBottom:'24px' }}>
        <StatCard label="Account Balance" value={`₹${user?.account_balance?.toLocaleString('en-IN',{minimumFractionDigits:2})}`} icon="💰" color="blue"/>
        <StatCard label="Total Debited" value={`₹${totalDebited.toLocaleString('en-IN',{minimumFractionDigits:2})}`} icon="📤" color="red" sub={`${debits.length} transactions`}/>
        <StatCard label="Total Credited" value={`₹${totalCredited.toLocaleString('en-IN',{minimumFractionDigits:2})}`} icon="📥" color="green" sub={`${credits.length} transactions`}/>
        <StatCard label="Fraud Alerts" value={fraudCount} icon="🚨" color="red" sub={`${txns.length} total transactions`}/>
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'24px' }}>
        {/* Area chart */}
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Transaction Amount Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="i" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="url(#blueGrad)" name="Amount"/>
              <Area type="monotone" dataKey="fraud" stroke="#ef4444" fill="url(#redGrad)" name="Fraud Amount"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie: type breakdown */}
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Transaction Types</h3>
          {pieData.length > 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {pieData.map((d,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', fontSize:'12px' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }}/>
                    <span style={{ color:'var(--text-secondary)', flex:1, textTransform:'capitalize' }}>{d.name}</span>
                    <span style={{ fontWeight:'600' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color:'var(--text-muted)', fontSize:'13px', textAlign:'center', padding:'40px 0' }}>No transactions yet</p>}
        </Card>

        {/* Status pie */}
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Transaction Status Breakdown</h3>
          {statusPie.length > 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={2}>
                    {statusPie.map((d,i) => <Cell key={i} fill={d.name==='COMPLETED'?'#10b981':d.name==='DELAYED'?'#f59e0b':d.name==='REPORTED'?'#ef4444':d.name==='REVERSED'?'#3b82f6':'#64748b'}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {statusPie.map((d,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', fontSize:'12px' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:d.name==='COMPLETED'?'#10b981':d.name==='DELAYED'?'#f59e0b':d.name==='REPORTED'?'#ef4444':'#3b82f6', flexShrink:0 }}/>
                    <span style={{ color:'var(--text-secondary)', flex:1 }}>{d.name}</span>
                    <span style={{ fontWeight:'600' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color:'var(--text-muted)', fontSize:'13px', textAlign:'center', padding:'40px 0' }}>No data</p>}
        </Card>

        {/* Debit vs Credit */}
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Money Flow</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={[{name:'Debited',value:totalDebited},{name:'Credited',value:totalCredited}]} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={4}>
                <Cell fill="#ef4444"/><Cell fill="#10b981"/>
              </Pie>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}} formatter={v=>`₹${v.toLocaleString('en-IN')}`}/>
              <Legend formatter={(v,e)=><span style={{fontSize:12,color:'var(--text-secondary)'}}>{v}</span>}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700' }}>Recent Transactions</h3>
          <Badge color="blue">{txns.length} total</Badge>
        </div>
        <Table
          cols={['Public ID','Amount','Type','Status','Fraud','Action']}
          rows={txns.slice(0,10).map(t => (
            <><td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:'12px',color:'var(--accent-blue)'}}>{t.public_id||'—'}</td>
            <td style={{padding:'10px 14px',fontWeight:'600'}}>₹{(t.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
            <td style={{padding:'10px 14px'}}><Badge color="blue">{t.transaction_type||'—'}</Badge></td>
            <td style={{padding:'10px 14px'}}><Badge color={statusColor(t.status)}>{t.status}</Badge></td>
            <td style={{padding:'10px 14px'}}>{t.is_fraud?<Badge color="red">⚠ Fraud</Badge>:<Badge color="green">Clear</Badge>}</td>
            <td style={{padding:'10px 14px'}}>
              {t.status==='DELAYED' && <Btn color="amber" size="sm" onClick={()=>setReportModal({open:true,txId:t.id||t.public_id,step:'report'})}>Report</Btn>}
            </td></>
          ))}
          empty="No transactions yet. Create one above!"/>
      </Card>

      {/* New Transaction Modal */}
      <Modal open={txModal} onClose={()=>setTxModal(false)} title="New Transaction">
        <form onSubmit={doCreate}>
          <Select label="Transaction Type" value={txForm.transaction_type} onChange={e=>setTxForm(f=>({...f,transaction_type:e.target.value}))}>
            <option value="debit">Debit (send money)</option>
            <option value="credit">Credit (receive money)</option>
          </Select>
          <Input label="Amount (₹)" type="number" step="0.01" min="0.01" placeholder="500.00" value={txForm.amount} onChange={e=>setTxForm(f=>({...f,amount:e.target.value}))} required/>
          <Input label="Location" placeholder="Mumbai, India" value={txForm.location} onChange={e=>setTxForm(f=>({...f,location:e.target.value}))} required/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <Input label="IP Address" placeholder="192.168.1.1" value={txForm.ip_address} onChange={e=>setTxForm(f=>({...f,ip_address:e.target.value}))} required/>
            <Input label="Device ID" placeholder="device-001" value={txForm.device_id} onChange={e=>setTxForm(f=>({...f,device_id:e.target.value}))} required/>
          </div>
          <Select label="Channel" value={txForm.channel} onChange={e=>setTxForm(f=>({...f,channel:e.target.value}))}>
            <option value="web">Web</option><option value="mobile">Mobile</option><option value="atm">ATM</option><option value="branch">Branch</option>
          </Select>
          <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, padding:'10px 12px', marginBottom:'16px', fontSize:'12px', color:'var(--accent-amber)' }}>
            ⚠ Transactions over 50% of your balance will be flagged for fraud review and delayed.
          </div>
          <Btn type="submit" loading={submitting} size="lg" style={{ width:'100%', justifyContent:'center' }}>Submit Transaction</Btn>
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal open={reportModal.open} onClose={()=>setReportModal({open:false,txId:null,step:'report'})} title="Report Fraudulent Transaction">
        {reportModal.step==='report' ? (
          <div>
            <p style={{ color:'var(--text-secondary)', fontSize:'14px', marginBottom:'20px' }}>An OTP will be sent to your registered email to confirm this fraud report.</p>
            <Btn loading={submitting} onClick={doReport} size="lg" color="amber" style={{ width:'100%', justifyContent:'center' }}>Send OTP to Email</Btn>
          </div>
        ) : (
          <div>
            <p style={{ color:'var(--text-secondary)', fontSize:'14px', marginBottom:'16px' }}>Enter the 6-digit OTP sent to your email.</p>
            <Input label="OTP" placeholder="123456" value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6}/>
            <Btn loading={submitting} onClick={doVerifyReport} size="lg" color="red" style={{ width:'100%', justifyContent:'center' }}>Confirm Fraud Report</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { adminDashboard, adminGetUsers, adminGetReported, getFraudRate, getFraudLogs, getFraudTrend, adminRunWorker } from '../../api/client';
import { StatCard, Card, Badge, Table, Btn, Spinner, useToast, Toast } from '../../components/UI';
import { Users, CreditCard, AlertTriangle, TrendingUp, Play, RefreshCw } from 'lucide-react';

const COLORS = ['#10b981','#ef4444','#f59e0b','#3b82f6','#8b5cf6'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reported, setReported] = useState([]);
  const [fraudRate, setFraudRate] = useState(null);
  const [fraudLogs, setFraudLogs] = useState([]);
  const [fraudTrend, setFraudTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workerLoading, setWorkerLoading] = useState(false);
  const { toast, show, clear } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [d, u, r, fr, fl, ft] = await Promise.all([
        adminDashboard(), adminGetUsers(),
        adminGetReported(1, 5), getFraudRate(),
        getFraudLogs(1, 50, null, false),
        getFraudTrend(null, null, 1, 30)
      ]);
      setStats(d.data);
      setUsers(Array.isArray(u.data) ? u.data : []);
      setReported(Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []);
      setFraudRate(fr.data);
      const logs = Array.isArray(fl.data?.data) ? fl.data.data : [];
      setFraudLogs(logs);
      setFraudTrend(Array.isArray(ft.data?.data) ? ft.data.data : Array.isArray(ft.data) ? ft.data : []);
    } catch(err) { show('Failed to load dashboard','error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const runWorker = async () => {
    setWorkerLoading(true);
    try {
      const r = await adminRunWorker();
      show(`Worker done: ${r.data.auto_completed||0} completed, ${r.data.auto_reversed||0} reversed`,'success');
    } catch { show('Worker failed','error'); }
    finally { setWorkerLoading(false); }
  };

  if (loading) return <Spinner/>;

  // User role breakdown
  const roleBreakdown = users.reduce((acc,u) => { acc[u.role]=(acc[u.role]||0)+1; return acc; }, {});
  const rolePie = Object.entries(roleBreakdown).map(([name,value])=>({name,value}));

  // Status breakdown from fraud logs
  const statusBreakdown = fraudLogs.reduce((acc,l) => { const k=l.action_taken||'unknown'; acc[k]=(acc[k]||0)+1; return acc; }, {});
  const statusPie = Object.entries(statusBreakdown).map(([name,value])=>({name,value}));

  // Fraud score distribution (buckets)
  const scoreBuckets = { '0-0.2':0, '0.2-0.4':0, '0.4-0.6':0, '0.6-0.8':0, '0.8-1.0':0 };
  fraudLogs.forEach(l => {
    const s = l.fraud_score;
    if(s<0.2) scoreBuckets['0-0.2']++;
    else if(s<0.4) scoreBuckets['0.2-0.4']++;
    else if(s<0.6) scoreBuckets['0.4-0.6']++;
    else if(s<0.8) scoreBuckets['0.6-0.8']++;
    else scoreBuckets['0.8-1.0']++;
  });
  const scoreData = Object.entries(scoreBuckets).map(([range,count])=>({range,count}));

  const blockedUsers = users.filter(u=>u.is_blocked).length;
  const activeUsers = users.filter(u=>!u.is_blocked && u.is_verified).length;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Admin Dashboard</h2>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>Platform overview and fraud intelligence</p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <Btn color="ghost" onClick={load}><RefreshCw size={14}/>Refresh</Btn>
          <Btn color="amber" loading={workerLoading} onClick={runWorker}><Play size={14}/>Run Worker</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px', marginBottom:'24px' }}>
        <StatCard label="Total Users" value={stats?.total_users||0} icon="👥" color="blue" sub={`${activeUsers} active`}/>
        <StatCard label="Total Transactions" value={stats?.total_transactions||0} icon="💳" color="green"/>
        <StatCard label="Blocked Users" value={blockedUsers} icon="🔒" color="red"/>
        <StatCard label="Fraud Rate" value={fraudRate ? `${(fraudRate.rate*100).toFixed(1)}%` : '—'} icon="⚠️" color="red" sub={`${fraudRate?.fraud||0} flagged`}/>
        <StatCard label="Reported" value={reported.length} icon="🚨" color="amber" sub="Awaiting review"/>
      </div>

      {/* Charts row 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
        {/* Fraud score distribution */}
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Fraud Score Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="range" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]}>
                {scoreData.map((d,i) => <Cell key={i} fill={d.range==='0.8-1.0'?'#ef4444':d.range==='0.6-0.8'?'#f59e0b':'#3b82f6'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Action taken breakdown */}
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Action Taken Breakdown</h3>
          {statusPie.length > 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {statusPie.map((d,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {statusPie.map((d,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', fontSize:'12px' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }}/>
                    <span style={{ color:'var(--text-secondary)', flex:1, textTransform:'capitalize' }}>{d.name}</span>
                    <span style={{ fontWeight:'600' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'40px 0', fontSize:'13px' }}>No fraud logs yet</p>}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
        {/* User role pie */}
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>User Role Distribution</h3>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={rolePie} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={4}>
                  <Cell fill="#3b82f6"/><Cell fill="#8b5cf6"/>
                </Pie>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              </PieChart>
            </ResponsiveContainer>
            <div>
              {rolePie.map((d,i) => (
                <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'10px', fontSize:'13px' }}>
                  <div style={{ width:12, height:12, borderRadius:'50%', background:i===0?'#3b82f6':'#8b5cf6' }}/>
                  <span style={{ color:'var(--text-secondary)', textTransform:'capitalize' }}>{d.name}</span>
                  <span style={{ fontWeight:'700' }}>{d.value}</span>
                </div>
              ))}
              <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'8px' }}>
                <div>🟢 Active: {activeUsers}</div>
                <div>🔴 Blocked: {blockedUsers}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Fraud amount by location */}
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Fraud Score vs Amount</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={fraudLogs.slice(0,20).map((l,i)=>({i:i+1,score:l.fraud_score,amount:l.amount}))}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="i" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}}/>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              <Area type="monotone" dataKey="score" stroke="#ef4444" fill="url(#scoreGrad)" name="Fraud Score"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Reported transactions */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700' }}>🚨 Reported Transactions (Pending Review)</h3>
          <Badge color="red">{reported.length} pending</Badge>
        </div>
        <Table
          cols={['Transaction ID','User','Amount','Status','Actions']}
          rows={reported.slice(0,5).map(r => (
            <><td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:'12px',color:'var(--accent-blue)'}}>{r.transaction_id||r.id||'—'}</td>
            <td style={{padding:'10px 14px',fontSize:'13px'}}>{r.user_id||'—'}</td>
            <td style={{padding:'10px 14px',fontWeight:'600'}}>₹{(r.amount||0).toLocaleString('en-IN')}</td>
            <td style={{padding:'10px 14px'}}><Badge color="amber">{r.status||'REPORTED'}</Badge></td>
            <td style={{padding:'10px 14px',display:'flex',gap:'8px'}}>
              <Btn size="sm" color="green" onClick={async()=>{try{const {adminApprove}=await import('../../api/client');await adminApprove(r.transaction_id||r.id);show('Approved','success');load();}catch(e){show(e.response?.data?.detail||'Error','error');}}}>Approve</Btn>
              <Btn size="sm" color="blue" onClick={async()=>{try{const {adminReverse}=await import('../../api/client');await adminReverse(r.transaction_id||r.id);show('Reversed','success');load();}catch(e){show(e.response?.data?.detail||'Error','error');}}}>Reverse</Btn>
            </td></>
          ))}
          empty="No reported transactions"/>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line, ScatterChart, Scatter, ZAxis } from 'recharts';
import { getFraudRate, getFraudLogs, getOtpLogs, getFraudTrend } from '../../api/client';
import { StatCard, Card, Badge, Table, Btn, Spinner, useToast, Toast, Input } from '../../components/UI';
import { RefreshCw } from 'lucide-react';

const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4'];

export default function AdminAnalytics() {
  const [fraudRate, setFraudRate] = useState(null);
  const [fraudLogs, setFraudLogs] = useState([]);
  const [otpLogs, setOtpLogs] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start:'', end:'' });
  const { toast, show, clear } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [fr, fl, ol, ft] = await Promise.all([
        getFraudRate(dateRange.start||null, dateRange.end||null),
        getFraudLogs(1,100,null,false),
        getOtpLogs(1,100),
        getFraudTrend(dateRange.start||null, dateRange.end||null, 1, 50)
      ]);
      setFraudRate(fr.data);
      setFraudLogs(Array.isArray(fl.data?.data)?fl.data.data:[]);
      setOtpLogs(Array.isArray(ol.data?.data)?ol.data.data:[]);
      setTrend(Array.isArray(ft.data?.data)?ft.data.data:Array.isArray(ft.data)?ft.data:[]);
    } catch { show('Failed to load analytics','error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // OTP status breakdown
  const otpStatus = otpLogs.reduce((acc,l) => { acc[l.status]=(acc[l.status]||0)+1; return acc; }, {});
  const otpPie = Object.entries(otpStatus).map(([name,value])=>({name,value}));

  // Fraud by location
  const byLoc = fraudLogs.reduce((acc,l) => { const k=l.location||'Unknown'; acc[k]=(acc[k]||0)+1; return acc; }, {});
  const locData = Object.entries(byLoc).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}));

  // Fraud score histogram
  const bins = [0,0,0,0,0,0,0,0,0,0];
  fraudLogs.forEach(l => { const b=Math.min(9,Math.floor((l.fraud_score||0)*10)); bins[b]++; });
  const histogram = bins.map((count,i)=>({range:`${(i/10).toFixed(1)}-${((i+1)/10).toFixed(1)}`,count}));

  // OTP type breakdown
  const otpType = otpLogs.reduce((acc,l) => { acc[l.otp_type]=(acc[l.otp_type]||0)+1; return acc; }, {});
  const otpTypePie = Object.entries(otpType).map(([name,value])=>({name,value}));

  // Amount distribution from fraud logs
  const amtBuckets = {'0-1k':0,'1k-5k':0,'5k-10k':0,'10k-50k':0,'50k+':0};
  fraudLogs.forEach(l => {
    const a = l.amount||0;
    if(a<1000) amtBuckets['0-1k']++;
    else if(a<5000) amtBuckets['1k-5k']++;
    else if(a<10000) amtBuckets['5k-10k']++;
    else if(a<50000) amtBuckets['10k-50k']++;
    else amtBuckets['50k+']++;
  });
  const amtData = Object.entries(amtBuckets).map(([range,count])=>({range,count}));

  if (loading) return <Spinner/>;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div><h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Analytics</h2><p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>Fraud intelligence and OTP analytics</p></div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <input type="date" value={dateRange.start} onChange={e=>setDateRange(d=>({...d,start:e.target.value}))} style={{ background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'7px 10px',color:'var(--text-primary)',fontSize:'12px',outline:'none' }}/>
          <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>to</span>
          <input type="date" value={dateRange.end} onChange={e=>setDateRange(d=>({...d,end:e.target.value}))} style={{ background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'7px 10px',color:'var(--text-primary)',fontSize:'12px',outline:'none' }}/>
          <Btn color="ghost" onClick={load}><RefreshCw size={14}/>Apply</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'16px', marginBottom:'24px' }}>
        <StatCard label="Total Transactions" value={fraudRate?.total||0} icon="📊" color="blue"/>
        <StatCard label="Fraud Flagged" value={fraudRate?.fraud||0} icon="🚨" color="red"/>
        <StatCard label="Fraud Rate" value={`${((fraudRate?.rate||0)*100).toFixed(2)}%`} icon="📈" color="red"/>
        <StatCard label="OTP Events" value={otpLogs.length} icon="🔐" color="amber"/>
        <StatCard label="Fraud Logs Total" value={fraudLogs.length} icon="📋" color="purple"/>
      </div>

      {/* Row 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Fraud Score Histogram</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={histogram}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="range" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {histogram.map((d,i)=><Cell key={i} fill={i>=8?'#ef4444':i>=6?'#f59e0b':i>=4?'#3b82f6':'#10b981'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Fraud by Location (Top 8)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={locData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis type="number" tick={{fontSize:11}}/>
              <YAxis type="category" dataKey="name" width={80} tick={{fontSize:10}}/>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              <Bar dataKey="count" fill="#8b5cf6" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>OTP Status Breakdown</h3>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie data={otpPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {otpPie.map((d,i)=><Cell key={i} fill={d.name==='verified'?'#10b981':d.name==='failed'?'#ef4444':d.name==='sent'?'#3b82f6':'#f59e0b'}/>)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {otpPie.map((d,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', fontSize:'12px' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:d.name==='verified'?'#10b981':d.name==='failed'?'#ef4444':d.name==='sent'?'#3b82f6':'#f59e0b', flexShrink:0 }}/>
                  <span style={{ color:'var(--text-secondary)', flex:1, textTransform:'capitalize' }}>{d.name}</span>
                  <span style={{ fontWeight:'600' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Transaction Amount Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={amtData}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="range" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              <Bar dataKey="count" fill="#06b6d4" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 3: Fraud rate donut */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'16px' }}>
        <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px', alignSelf:'flex-start' }}>Fraud vs Clean</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[{name:'Fraud',value:fraudRate?.fraud||0},{name:'Clean',value:(fraudRate?.total||0)-(fraudRate?.fraud||0)}]}
                cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}>
                <Cell fill="#ef4444"/><Cell fill="#10b981"/>
              </Pie>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}} formatter={v=>`${v} txns`}/>
              <Legend formatter={(v)=><span style={{fontSize:12,color:'var(--text-secondary)'}}>{v}</span>}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign:'center', marginTop:'8px' }}>
            <div style={{ fontSize:'28px', fontWeight:'800', color:'var(--accent-red)' }}>{((fraudRate?.rate||0)*100).toFixed(1)}%</div>
            <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>fraud rate</div>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize:'14px', fontWeight:'700', marginBottom:'16px' }}>Recent Fraud Log Events</h3>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead><tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Location','Amount','Score','Action','Date'].map(h=><th key={h} style={{ padding:'8px',textAlign:'left',color:'var(--text-muted)',fontWeight:'600' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {fraudLogs.slice(0,8).map((l,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid rgba(30,45,69,0.4)' }}>
                    <td style={{ padding:'8px' }}>{l.location||'—'}</td>
                    <td style={{ padding:'8px', fontWeight:'600' }}>₹{(l.amount||0).toLocaleString('en-IN')}</td>
                    <td style={{ padding:'8px' }}>
                      <span style={{ color:l.fraud_score>0.7?'var(--accent-red)':l.fraud_score>0.4?'var(--accent-amber)':'var(--accent-green)', fontWeight:'700' }}>{(l.fraud_score||0).toFixed(2)}</span>
                    </td>
                    <td style={{ padding:'8px' }}><Badge color={l.action_taken==='COMPLETED'?'green':l.action_taken==='DELAYED'?'amber':'blue'}>{l.action_taken||'—'}</Badge></td>
                    <td style={{ padding:'8px', color:'var(--text-muted)' }}>{l.created_at?new Date(l.created_at).toLocaleDateString():'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

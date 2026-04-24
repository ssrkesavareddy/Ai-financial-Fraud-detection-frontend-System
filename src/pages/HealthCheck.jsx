import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://ai-financial-fraud-detection-backend.onrender.com';
const PING_INTERVAL = 25000; // 25 seconds – keeps Render free tier awake

const ENDPOINTS = [
  { path: '/health',            label: 'Health Check',     method: 'GET',  tag: 'System'    },
  { path: '/admin/dashboard',   label: 'Admin Dashboard',  method: 'GET',  tag: 'Admin'     },
  { path: '/analytics/fraud-rate', label: 'Fraud Rate',   method: 'GET',  tag: 'Analytics' },
];

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

export default function HealthCheck() {
  const [status, setStatus]       = useState('checking'); // 'checking' | 'ok' | 'sleeping' | 'error'
  const [latency, setLatency]     = useState(null);
  const [history, setHistory]     = useState([]);          // [{ts, ok, ms}]
  const [pings, setPings]         = useState(0);
  const [lastPing, setLastPing]   = useState(null);
  const [countdown, setCountdown] = useState(PING_INTERVAL / 1000);
  const [waking, setWaking]       = useState(false);
  const timerRef                  = useRef(null);
  const countRef                  = useRef(null);
  const now                       = useNow();

  const ping = useCallback(async (manual = false) => {
    if (manual) setWaking(true);
    const t0 = performance.now();
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
      const ms  = Math.round(performance.now() - t0);
      if (res.ok) {
        setStatus('ok');
        setLatency(ms);
        setLastPing(Date.now());
        setHistory(h => [...h.slice(-29), { ts: Date.now(), ok: true, ms }]);
        setPings(p => p + 1);
      } else {
        setStatus('error');
        setLatency(ms);
        setHistory(h => [...h.slice(-29), { ts: Date.now(), ok: false, ms }]);
      }
    } catch {
      const ms = Math.round(performance.now() - t0);
      setStatus(ms > 3000 ? 'sleeping' : 'error');
      setLatency(null);
      setHistory(h => [...h.slice(-29), { ts: Date.now(), ok: false, ms: null }]);
    } finally {
      setWaking(false);
    }
  }, []);

  // Auto-ping loop
  useEffect(() => {
    ping();
    timerRef.current = setInterval(() => { ping(); setCountdown(PING_INTERVAL / 1000); }, PING_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [ping]);

  // Countdown ticker
  useEffect(() => {
    countRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(countRef.current);
  }, []);

  const statusMeta = {
    checking: { color: '#f59e0b', label: 'Checking…',    dot: '#f59e0b', glow: 'rgba(245,158,11,0.3)'  },
    ok:       { color: '#10b981', label: 'Operational',  dot: '#10b981', glow: 'rgba(16,185,129,0.35)' },
    sleeping: { color: '#8b5cf6', label: 'Sleeping',     dot: '#8b5cf6', glow: 'rgba(139,92,246,0.3)'  },
    error:    { color: '#ef4444', label: 'Unreachable',  dot: '#ef4444', glow: 'rgba(239,68,68,0.3)'   },
  };
  const sm = statusMeta[status];

  const uptimePct = history.length
    ? Math.round((history.filter(h => h.ok).length / history.length) * 1000) / 10
    : null;
  const avgLatency = history.filter(h => h.ok && h.ms).length
    ? Math.round(history.filter(h => h.ok && h.ms).reduce((a, b) => a + b.ms, 0) / history.filter(h => h.ok && h.ms).length)
    : null;

  return (
    <div style={S.page}>
      {/* Ambient background */}
      <div style={S.bgBlob1}/>
      <div style={S.bgBlob2}/>

      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.logo}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#3b82f6" fillOpacity=".15"/>
              <path d="M8 14a6 6 0 1 1 12 0A6 6 0 0 1 8 14z" stroke="#3b82f6" strokeWidth="1.5"/>
              <path d="M14 10v4l2.5 2.5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={S.logoText}>FraudGuard</span>
            <span style={S.logoBadge}>System Status</span>
          </div>
          <a href="/docs" style={S.docsLink}>API Docs →</a>
        </div>

        {/* Hero Status Card */}
        <div style={{ ...S.heroCard, boxShadow: `0 0 80px ${sm.glow}, 0 4px 24px rgba(0,0,0,0.4)` }}>
          <div style={S.heroTop}>
            <div style={S.statusDot}>
              <span style={{ ...S.dotInner, background: sm.dot, boxShadow: `0 0 12px ${sm.dot}` }}/>
              <span style={{ ...S.dotRing, borderColor: sm.dot }}/>
            </div>
            <div>
              <div style={{ ...S.statusLabel, color: sm.color }}>{sm.label}</div>
              <div style={S.statusSub}>
                {status === 'ok'       && `Backend responding in ${latency}ms`}
                {status === 'sleeping' && 'Render free tier is spinning up — click Wake Up'}
                {status === 'error'    && 'Cannot reach backend — check network or server'}
                {status === 'checking' && 'Contacting backend…'}
              </div>
            </div>
            <button
              onClick={() => ping(true)}
              disabled={waking || status === 'checking'}
              style={{ ...S.wakeBtn, opacity: (waking || status === 'checking') ? 0.5 : 1 }}
            >
              {waking ? 'Waking…' : status === 'ok' ? '↻ Ping' : '⚡ Wake Up'}
            </button>
          </div>

          <div style={S.divider}/>

          {/* Stats row */}
          <div style={S.statsRow}>
            {[
              { label: 'Latency',  value: latency  != null ? `${latency}ms`    : '—' },
              { label: 'Avg',      value: avgLatency != null ? `${avgLatency}ms` : '—' },
              { label: 'Uptime',   value: uptimePct != null ? `${uptimePct}%`   : '—' },
              { label: 'Pings',    value: pings },
              { label: 'Next ping',value: `${countdown}s` },
            ].map(s => (
              <div key={s.label} style={S.stat}>
                <span style={S.statValue}>{s.value}</span>
                <span style={S.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Keep-alive notice */}
        <div style={S.notice}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="8" cy="8" r="6.5" stroke="#3b82f6" strokeWidth="1.2"/>
            <path d="M8 7v4M8 5.5v.5" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span>
            This page automatically pings the backend every <strong>25 seconds</strong> to prevent Render's free tier from sleeping.
            Keep this tab open to maintain server warmth.
          </span>
        </div>

        {/* Pulse history bar */}
        <div style={S.section}>
          <div style={S.sectionHead}>
            <span style={S.sectionTitle}>Ping History</span>
            <span style={S.sectionSub}>Last {history.length} checks</span>
          </div>
          <div style={S.barRow}>
            {Array.from({ length: 30 }).map((_, i) => {
              const h = history[history.length - 30 + i];
              const color = !h ? '#1e2d45' : h.ok ? '#10b981' : '#ef4444';
              const height = !h ? 8 : h.ok && h.ms ? Math.min(40, 8 + h.ms / 10) : 12;
              return (
                <div key={i} title={h ? `${new Date(h.ts).toLocaleTimeString()} — ${h.ok ? h.ms+'ms' : 'failed'}` : ''}
                  style={{ ...S.bar, background: color, height, opacity: h ? 1 : 0.25 }}/>
              );
            })}
          </div>
          <div style={S.barLabels}>
            <span>30 pings ago</span><span>Now</span>
          </div>
        </div>

        {/* Endpoint status cards */}
        <div style={S.section}>
          <div style={S.sectionHead}>
            <span style={S.sectionTitle}>Key Endpoints</span>
          </div>
          <div style={S.endpointGrid}>
            {ENDPOINTS.map(ep => (
              <EndpointCard key={ep.path} ep={ep} apiBase={API_BASE} serverOk={status === 'ok'}/>
            ))}
          </div>
        </div>

        {/* Server info */}
        <div style={S.infoGrid}>
          {[
            { label: 'Host',     value: API_BASE.replace('https://', '') },
            { label: 'Platform', value: 'Render (Free Tier)' },
            { label: 'Protocol', value: 'HTTPS / REST' },
            { label: 'Docs',     value: '/docs' },
          ].map(i => (
            <div key={i.label} style={S.infoCard}>
              <span style={S.infoLabel}>{i.label}</span>
              <span style={S.infoValue}>{i.value}</span>
            </div>
          ))}
        </div>

        <div style={S.footer}>
          FraudGuard API · {new Date().getFullYear()} ·{' '}
          {lastPing ? `Last checked ${Math.round((now - lastPing) / 1000)}s ago` : 'Checking…'}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function EndpointCard({ ep, apiBase, serverOk }) {
  const [state, setState] = useState('idle'); // idle | loading | ok | error
  const [ms, setMs]       = useState(null);

  const check = async () => {
    setState('loading');
    const t0 = performance.now();
    try {
      await fetch(`${apiBase}${ep.path}`, { cache: 'no-store' });
      setState('ok');
      setMs(Math.round(performance.now() - t0));
    } catch {
      setState('error');
      setMs(null);
    }
  };

  const color = { idle:'#475569', loading:'#f59e0b', ok:'#10b981', error:'#ef4444' }[state];

  return (
    <div style={S.epCard} onClick={check} title="Click to probe">
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ ...S.epMethod }}>{ep.method}</span>
        <span style={{ ...S.epTag, color }}>{ep.tag}</span>
        <span style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:color, flexShrink:0,
          boxShadow: state === 'ok' ? `0 0 6px ${color}` : 'none',
          animation: state === 'loading' ? 'pulse 1s infinite' : 'none'
        }}/>
      </div>
      <div style={S.epLabel}>{ep.label}</div>
      <div style={S.epPath}>{ep.path}</div>
      {ms && <div style={{ ...S.epMs, color }}>{ms}ms</div>}
    </div>
  );
}

const S = {
  page: {
    minHeight:'100vh', background:'#0a0e1a', fontFamily:"'Inter',sans-serif",
    color:'#f1f5f9', padding:'0 16px 60px', position:'relative', overflow:'hidden',
  },
  bgBlob1: {
    position:'fixed', top:'-20%', right:'-10%', width:600, height:600,
    borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,.07) 0%,transparent 70%)',
    pointerEvents:'none', zIndex:0,
  },
  bgBlob2: {
    position:'fixed', bottom:'-10%', left:'-5%', width:400, height:400,
    borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,.05) 0%,transparent 70%)',
    pointerEvents:'none', zIndex:0,
  },
  container: {
    maxWidth:860, margin:'0 auto', position:'relative', zIndex:1,
  },
  header: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'28px 0 24px',
  },
  logo: { display:'flex', alignItems:'center', gap:10 },
  logoText: { fontSize:17, fontWeight:700, color:'#f1f5f9' },
  logoBadge: {
    fontSize:11, fontWeight:600, color:'#3b82f6', background:'rgba(59,130,246,.12)',
    border:'1px solid rgba(59,130,246,.25)', borderRadius:20, padding:'2px 8px',
  },
  docsLink: {
    fontSize:13, color:'#3b82f6', textDecoration:'none', fontWeight:500,
    padding:'6px 14px', border:'1px solid rgba(59,130,246,.3)', borderRadius:8,
    transition:'all .2s', background:'rgba(59,130,246,.05)',
  },
  heroCard: {
    background:'#0f1628', border:'1px solid #1e2d45', borderRadius:16,
    padding:'28px 32px', marginBottom:16,
  },
  heroTop: {
    display:'flex', alignItems:'center', gap:20, flexWrap:'wrap',
  },
  statusDot: { position:'relative', width:24, height:24, flexShrink:0 },
  dotInner: {
    position:'absolute', inset:4, borderRadius:'50%',
    animation:'pulse 2s infinite',
  },
  dotRing: {
    position:'absolute', inset:0, borderRadius:'50%', border:'2px solid',
  },
  statusLabel: { fontSize:22, fontWeight:700, lineHeight:1.2 },
  statusSub: { fontSize:13, color:'#94a3b8', marginTop:4 },
  wakeBtn: {
    marginLeft:'auto', padding:'10px 20px', background:'rgba(59,130,246,.15)',
    border:'1px solid rgba(59,130,246,.4)', borderRadius:10, color:'#3b82f6',
    fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .2s',
    whiteSpace:'nowrap',
  },
  divider: { height:1, background:'#1e2d45', margin:'20px 0' },
  statsRow: {
    display:'flex', gap:0, flexWrap:'wrap',
  },
  stat: {
    flex:'1 1 100px', display:'flex', flexDirection:'column', alignItems:'center',
    padding:'8px 0', borderRight:'1px solid #1e2d45',
  },
  statValue: { fontSize:20, fontWeight:700, color:'#f1f5f9' },
  statLabel: { fontSize:11, color:'#475569', marginTop:2, textTransform:'uppercase', letterSpacing:.6 },
  notice: {
    display:'flex', gap:10, alignItems:'flex-start',
    background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.15)',
    borderRadius:10, padding:'12px 16px', fontSize:12.5, color:'#94a3b8',
    marginBottom:24, lineHeight:1.6,
  },
  section: { marginBottom:28 },
  sectionHead: {
    display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:12,
  },
  sectionTitle: { fontSize:15, fontWeight:600, color:'#f1f5f9' },
  sectionSub: { fontSize:12, color:'#475569' },
  barRow: {
    display:'flex', gap:3, alignItems:'flex-end', height:48,
    background:'#0d1525', borderRadius:10, padding:'8px 12px',
  },
  bar: {
    flex:'1 1 0', minWidth:6, borderRadius:3, transition:'height .3s, background .3s',
  },
  barLabels: {
    display:'flex', justifyContent:'space-between', fontSize:11, color:'#475569', marginTop:6,
  },
  endpointGrid: {
    display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12,
  },
  epCard: {
    background:'#0f1628', border:'1px solid #1e2d45', borderRadius:12, padding:'16px',
    cursor:'pointer', transition:'border-color .2s, background .2s',
  },
  epMethod: {
    fontSize:10, fontWeight:700, letterSpacing:.8, color:'#3b82f6',
    background:'rgba(59,130,246,.1)', padding:'2px 6px', borderRadius:4,
  },
  epTag: {
    fontSize:11, fontWeight:600,
  },
  epLabel: { fontSize:14, fontWeight:600, color:'#f1f5f9', marginBottom:4 },
  epPath: { fontSize:12, color:'#475569', fontFamily:'monospace' },
  epMs: { fontSize:12, fontWeight:600, marginTop:8 },
  infoGrid: {
    display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:28,
  },
  infoCard: {
    background:'#0f1628', border:'1px solid #1e2d45', borderRadius:10, padding:'14px 16px',
    display:'flex', flexDirection:'column', gap:4,
  },
  infoLabel: { fontSize:11, color:'#475569', textTransform:'uppercase', letterSpacing:.6 },
  infoValue: { fontSize:13, fontWeight:500, color:'#94a3b8', wordBreak:'break-all' },
  footer: { textAlign:'center', fontSize:12, color:'#475569', paddingTop:16 },
};

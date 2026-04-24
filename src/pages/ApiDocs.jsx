import { useState, useMemo } from 'react';

// ── OpenAPI spec embedded ─────────────────────────────────────────────────────
const SPEC = {
  baseUrl: import.meta.env.VITE_API_URL || 'https://ai-financial-fraud-detection-backend.onrender.com',
  tags: ['Auth', 'Users', 'Transactions', 'Admin', 'Analytics', 'Health'],
  endpoints: [
    // Auth
    { tag:'Auth',  method:'POST', path:'/auth/send-register-otp',    summary:'Send Registration OTP',   auth:false,
      desc:'Sends an OTP to the email to verify ownership before registration.',
      body:{ name:'string', phone:'string (+E.164)', email:'string (email)' } },
    { tag:'Auth',  method:'POST', path:'/auth/register',             summary:'Register with OTP',        auth:false,
      desc:'Verifies OTP and completes registration. Sets is_verified = true immediately.',
      body:{ name:'string', phone:'string', email:'string', otp:'string', password:'string (6–128)', dob:'date (YYYY-MM-DD)' } },
    { tag:'Auth',  method:'POST', path:'/auth/login',                summary:'Login',                    auth:false,
      desc:'Returns a JWT access token. Uses OAuth2 password flow (form-encoded).',
      body:{ username:'string (email)', password:'string' }, contentType:'application/x-www-form-urlencoded',
      response:{ access_token:'string', role:'user | admin' } },
    { tag:'Auth',  method:'POST', path:'/auth/request-password-reset', summary:'Request Password Reset', auth:false,
      body:{ email:'string' } },
    { tag:'Auth',  method:'POST', path:'/auth/reset-password',       summary:'Reset Password',           auth:false,
      body:{ token:'string', new_password:'string (6–128)' } },

    // Users
    { tag:'Users', method:'GET',  path:'/users/me',                  summary:'Get My Profile',           auth:true,
      response:{ id:'uuid', public_id:'string', name:'string', email:'string', phone:'string', account_balance:'number', role:'string', is_verified:'bool', is_active:'bool', is_blocked:'bool' } },
    { tag:'Users', method:'GET',  path:'/users/me/transactions',     summary:'Get My Transactions',      auth:true,
      desc:'All transactions. Filter with ?type=debit|credit|admin_credit|admin_debit|bulk_debit|bulk_credit|refund|reversal',
      params:{ type:'string (optional)' } },
    { tag:'Users', method:'GET',  path:'/users/me/transactions/debits',  summary:'Get My Debits',        auth:true },
    { tag:'Users', method:'GET',  path:'/users/me/transactions/credits', summary:'Get My Credits',       auth:true },
    { tag:'Users', method:'POST', path:'/users/me/block',            summary:'Block Own Account',        auth:true },
    { tag:'Users', method:'POST', path:'/users/request-unblock',     summary:'Request Unblock (OTP)',    auth:true,
      desc:'Step 1 — sends OTP to registered email.' },
    { tag:'Users', method:'POST', path:'/users/verify-unblock',      summary:'Verify Unblock',           auth:true,
      desc:'Step 2 — verify OTP to unblock account.',
      body:{ otp:'string' } },

    // Transactions
    { tag:'Transactions', method:'POST', path:'/transactions/',       summary:'Create Transaction',       auth:true,
      body:{ amount:'number (>0)', transaction_type:'debit|credit', receiver_id:'uuid (for debit)', ip_address:'string', device_id:'string', location:'string', channel:'string', transaction_duration:'number (>0)', idempotency_key:'string (optional)' },
      response:{ public_id:'string', transaction_type:'string', fraud_probability:'number', decision:'string', risk_level:'string', is_fraud:'bool', reasons:'string[]', status:'string' } },
    { tag:'Transactions', method:'POST', path:'/transactions/{id}/report', summary:'Report Transaction as Fraud', auth:true },
    { tag:'Transactions', method:'POST', path:'/transactions/{id}/verify-report', summary:'Verify Fraud Report (OTP)', auth:true,
      body:{ otp:'string' } },

    // Admin — users
    { tag:'Admin', method:'GET',   path:'/admin/dashboard',          summary:'Admin Dashboard',          auth:true, role:'admin',
      response:{ total_users:'integer', total_transactions:'integer' } },
    { tag:'Admin', method:'GET',   path:'/admin/users',              summary:'List All Users',           auth:true, role:'admin' },
    { tag:'Admin', method:'POST',  path:'/admin/create-user',        summary:'Create User',              auth:true, role:'admin',
      body:{ name:'string', email:'string', password:'string', phone:'string', dob:'date' } },
    { tag:'Admin', method:'PATCH', path:'/admin/users/{id}/balance', summary:'Update User Balance',      auth:true, role:'admin',
      body:{ amount:'number (positive=add, negative=deduct)' } },
    { tag:'Admin', method:'PATCH', path:'/admin/users/{id}/block',   summary:'Block User',               auth:true, role:'admin' },
    { tag:'Admin', method:'PATCH', path:'/admin/users/{id}/unblock', summary:'Unblock User',             auth:true, role:'admin' },
    { tag:'Admin', method:'PATCH', path:'/admin/users/{id}/activate',  summary:'Activate User',         auth:true, role:'admin' },
    { tag:'Admin', method:'PATCH', path:'/admin/users/{id}/deactivate',summary:'Deactivate User',       auth:true, role:'admin' },

    // Admin — transactions
    { tag:'Admin', method:'POST', path:'/admin/transactions',        summary:'Admin Single Transaction', auth:true, role:'admin',
      body:{ user_id:'uuid', amount:'number', transaction_duration:'number', location:'string', channel:'string' } },
    { tag:'Admin', method:'POST', path:'/admin/bulk-transactions',   summary:'Bulk Debit (up to 500)',   auth:true, role:'admin',
      desc:'Debit FROM each user\'s balance. Per-row savepoint — failures don\'t roll back earlier rows.',
      body:{ transactions:'BulkTransactionItem[]' } },
    { tag:'Admin', method:'POST', path:'/admin/bulk-credit',         summary:'Bulk Credit (up to 500)',  auth:true, role:'admin',
      desc:'Credit INTO each user\'s balance. Salary, cashback, incentives, corrections.',
      body:{ transactions:'BulkCreditItem[]' } },
    { tag:'Admin', method:'POST', path:'/admin/transactions/{id}/cancel', summary:'Cancel Transaction',  auth:true, role:'admin',
      desc:'Cancels a COMPLETED transaction, issues refund, creates refund transaction for traceability.',
      body:{ reason:'string (min 5 chars)' } },
    { tag:'Admin', method:'GET',  path:'/admin/reported-transactions', summary:'List Reported Transactions', auth:true, role:'admin',
      params:{ page:'integer (default 1)', limit:'integer (1–100, default 10)' } },
    { tag:'Admin', method:'POST', path:'/admin/transactions/{id}/approve', summary:'Approve Reported → COMPLETED', auth:true, role:'admin',
      desc:'Fraud claim rejected — transaction stays completed, no refund.' },
    { tag:'Admin', method:'POST', path:'/admin/transactions/{id}/reverse', summary:'Reverse Reported → REVERSED',  auth:true, role:'admin',
      desc:'Reverses transaction and issues refund to user.' },

    // Admin — ledger & audit
    { tag:'Admin', method:'GET',  path:'/admin/transactions/{id}/ledger', summary:'Transaction Ledger',  auth:true, role:'admin',
      desc:'All double-entry ledger records for a transaction. Shows balanced status.' },
    { tag:'Admin', method:'GET',  path:'/admin/users/{id}/ledger',   summary:'User Ledger History',      auth:true, role:'admin',
      params:{ page:'integer', limit:'integer (max 200)' } },
    { tag:'Admin', method:'GET',  path:'/admin/ledger/validate',     summary:'Validate Entire Ledger',   auth:true, role:'admin',
      desc:'Double-entry consistency check. Returns imbalanced transaction list.' },
    { tag:'Admin', method:'GET',  path:'/admin/audit-logs',          summary:'Audit Logs',               auth:true, role:'admin',
      params:{ page:'integer', limit:'integer', admin_id:'uuid (optional)', action:'string (optional)' } },
    { tag:'Admin', method:'POST', path:'/admin/worker/run-auto-complete', summary:'Trigger Auto-Complete Worker', auth:true, role:'admin',
      desc:'Manually trigger auto-complete background worker. Testing/debugging only.' },

    // Analytics
    { tag:'Analytics', method:'GET', path:'/analytics/fraud-rate',  summary:'Fraud Rate Stats',         auth:true,
      params:{ start_date:'string (optional)', end_date:'string (optional)' },
      response:{ total:'integer', fraud:'integer', rate:'number (%)' } },
    { tag:'Analytics', method:'GET', path:'/analytics/fraud-logs',  summary:'Fraud Detection Logs',     auth:true,
      params:{ page:'integer', limit:'integer', user_id:'uuid (optional)', fraud_only:'bool', start_date:'string', end_date:'string' } },
    { tag:'Analytics', method:'GET', path:'/analytics/otp-logs',    summary:'OTP Logs',                 auth:true,
      params:{ page:'integer', limit:'integer', user_id:'uuid (optional)', status:'string', start_date:'string', end_date:'string' } },
    { tag:'Analytics', method:'GET', path:'/analytics/fraud-trend', summary:'Fraud Trend (paginated)',  auth:true,
      params:{ start_date:'string', end_date:'string', page:'integer', limit:'integer (max 100)' } },

    // Health
    { tag:'Health', method:'GET', path:'/health', summary:'Health Check', auth:false,
      response:{ status:'ok' } },
  ],
};

const METHOD_COLOR = {
  GET:'#10b981', POST:'#3b82f6', PATCH:'#f59e0b', PUT:'#8b5cf6', DELETE:'#ef4444',
};
const TAG_COLOR = {
  Auth:'#8b5cf6', Users:'#06b6d4', Transactions:'#3b82f6',
  Admin:'#f59e0b', Analytics:'#10b981', Health:'#94a3b8',
};

function Badge({ text, color, bg }) {
  return (
    <span style={{
      fontSize:10, fontWeight:700, letterSpacing:.8, padding:'2px 7px',
      borderRadius:4, color: color||'#fff', background: bg||'rgba(255,255,255,.1)',
      textTransform:'uppercase', flexShrink:0,
    }}>{text}</span>
  );
}

function ObjectTable({ data, title }) {
  if (!data) return null;
  const entries = Object.entries(data);
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ fontSize:11, fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:.6, marginBottom:6 }}>{title}</div>
      <div style={{ background:'#070c18', borderRadius:8, border:'1px solid #1e2d45', overflow:'hidden' }}>
        {entries.map(([k, v], i) => (
          <div key={k} style={{
            display:'flex', gap:12, padding:'7px 12px', fontSize:12,
            borderBottom: i < entries.length-1 ? '1px solid #111827' : 'none',
            alignItems:'baseline',
          }}>
            <span style={{ color:'#3b82f6', fontFamily:'monospace', minWidth:140, flexShrink:0 }}>{k}</span>
            <span style={{ color:'#94a3b8' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EndpointRow({ ep }) {
  const [open, setOpen] = useState(false);
  const mc = METHOD_COLOR[ep.method] || '#94a3b8';

  return (
    <div style={{ borderBottom:'1px solid #111827' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', cursor:'pointer',
          background: open ? '#0d1525' : 'transparent', transition:'background .15s',
          flexWrap:'wrap', gap:8,
        }}
      >
        <Badge text={ep.method} color='#fff'
          bg={`${mc}22`}
          style={{ color: mc }}
        />
        <span style={{ fontFamily:'monospace', fontSize:13, color:'#94a3b8', flex:'1 1 200px', minWidth:0 }}>
          <span style={{ color: mc }}>{ep.method === 'GET' ? '' : ''}</span>
          {ep.path}
        </span>
        <span style={{ fontSize:13, fontWeight:500, color:'#f1f5f9', flex:'2 1 180px' }}>{ep.summary}</span>
        <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto', flexShrink:0 }}>
          {ep.auth && <Badge text={ep.role || 'Auth'} color={ep.role === 'admin' ? '#f59e0b' : '#3b82f6'}
            bg={ep.role === 'admin' ? 'rgba(245,158,11,.1)' : 'rgba(59,130,246,.1)'} />}
          <span style={{ color:'#475569', fontSize:16 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding:'16px 20px 20px', background:'#0a101e', borderTop:'1px solid #1a2540' }}>
          {ep.desc && <p style={{ fontSize:13, color:'#94a3b8', marginBottom:12, lineHeight:1.6 }}>{ep.desc}</p>}

          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12, alignItems:'center' }}>
            <span style={{ fontFamily:'monospace', fontSize:12, color:'#475569' }}>
              <span style={{ color:'#3b82f6' }}>{ep.method}</span>{' '}
              <span style={{ color:'#f1f5f9' }}>{SPEC.baseUrl}</span>
              <span style={{ color:'#94a3b8' }}>{ep.path}</span>
            </span>
            {ep.contentType && (
              <Badge text={ep.contentType} color='#94a3b8' bg='rgba(148,163,184,.1)'/>
            )}
          </div>

          <ObjectTable data={ep.params}   title="Query Parameters" />
          <ObjectTable data={ep.body}     title="Request Body"     />
          <ObjectTable data={ep.response} title="Response Fields"  />
        </div>
      )}
    </div>
  );
}

export default function ApiDocs() {
  const [activeTag, setActiveTag] = useState('All');
  const [search, setSearch]       = useState('');

  const filtered = useMemo(() => {
    return SPEC.endpoints.filter(ep => {
      const matchTag = activeTag === 'All' || ep.tag === activeTag;
      const q = search.toLowerCase();
      const matchSearch = !q || ep.path.toLowerCase().includes(q) || ep.summary.toLowerCase().includes(q) || ep.method.toLowerCase().includes(q);
      return matchTag && matchSearch;
    });
  }, [activeTag, search]);

  const tagCounts = useMemo(() => {
    const c = {};
    SPEC.endpoints.forEach(e => { c[e.tag] = (c[e.tag]||0)+1; });
    return c;
  }, []);

  return (
    <div style={S.page}>
      <div style={S.bgBlob}/>

      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.headerTop}>
              <span style={S.title}>FraudGuard API</span>
              <span style={S.version}>v1.0</span>
            </div>
            <p style={S.subtitle}>
              Fraud Detection & Financial Transaction API — {SPEC.endpoints.length} endpoints
            </p>
            <div style={S.baseUrl}>
              <span style={S.baseLabel}>Base URL</span>
              <code style={S.baseCode}>{SPEC.baseUrl}</code>
            </div>
          </div>
          <a href="/health" style={S.statusLink}>⬤ System Status</a>
        </div>

        {/* Auth note */}
        <div style={S.authNote}>
          <div style={S.authNoteIcon}>🔒</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', marginBottom:3 }}>Authentication</div>
            <div style={{ fontSize:12.5, color:'#94a3b8', lineHeight:1.6 }}>
              Protected endpoints require a <code style={S.code}>Bearer &lt;token&gt;</code> header.
              Obtain a token via <code style={S.code}>POST /auth/login</code> using OAuth2 password flow.
              Admin endpoints additionally require the <code style={S.code}>admin</code> role.
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={S.controls}>
          <input
            placeholder="Search endpoints…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={S.searchInput}
          />
          <div style={S.tagBar}>
            {['All', ...SPEC.tags].map(t => (
              <button key={t} onClick={() => setActiveTag(t)} style={{
                ...S.tagBtn,
                background: activeTag === t ? (TAG_COLOR[t] ? `${TAG_COLOR[t]}22` : 'rgba(255,255,255,.1)') : 'transparent',
                color: activeTag === t ? (TAG_COLOR[t] || '#f1f5f9') : '#94a3b8',
                borderColor: activeTag === t ? (TAG_COLOR[t] ? `${TAG_COLOR[t]}55` : '#3b82f6') : '#1e2d45',
              }}>
                {t}
                {t !== 'All' && <span style={{ fontSize:10, color:'#475569', marginLeft:5 }}>{tagCounts[t]||0}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div style={S.statsRow}>
          {Object.entries(
            filtered.reduce((a, e) => { a[e.method]=(a[e.method]||0)+1; return a; }, {})
          ).map(([m, c]) => (
            <span key={m} style={{ fontSize:12, color: METHOD_COLOR[m]||'#94a3b8' }}>
              <strong>{c}</strong> {m}
            </span>
          ))}
          <span style={{ marginLeft:'auto', fontSize:12, color:'#475569' }}>{filtered.length} endpoints</span>
        </div>

        {/* Endpoint list */}
        <div style={S.endpointList}>
          {filtered.length === 0 && (
            <div style={{ padding:'40px', textAlign:'center', color:'#475569' }}>No endpoints match your search.</div>
          )}
          {filtered.map((ep, i) => <EndpointRow key={i} ep={ep}/>)}
        </div>

        <div style={S.footer}>
          FraudGuard API Docs · Built with FastAPI · <a href="/health" style={{ color:'#3b82f6' }}>Check System Status</a>
        </div>
      </div>

      <style>{`
        code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
      `}</style>
    </div>
  );
}

const S = {
  page: {
    minHeight:'100vh', background:'#0a0e1a', fontFamily:"'Inter',sans-serif",
    color:'#f1f5f9', padding:'0 16px 80px', position:'relative',
  },
  bgBlob: {
    position:'fixed', top:0, right:0, width:600, height:600,
    background:'radial-gradient(circle at 80% 20%,rgba(59,130,246,.06) 0%,transparent 60%)',
    pointerEvents:'none', zIndex:0,
  },
  container: { maxWidth:900, margin:'0 auto', position:'relative', zIndex:1 },
  header: {
    display:'flex', alignItems:'flex-start', justifyContent:'space-between',
    flexWrap:'wrap', gap:16, padding:'36px 0 24px',
  },
  headerTop: { display:'flex', alignItems:'center', gap:12, marginBottom:6 },
  title: { fontSize:26, fontWeight:800, color:'#f1f5f9' },
  version: {
    fontSize:12, fontWeight:600, color:'#3b82f6', background:'rgba(59,130,246,.12)',
    border:'1px solid rgba(59,130,246,.25)', borderRadius:20, padding:'2px 10px',
  },
  subtitle: { fontSize:14, color:'#94a3b8', marginBottom:10 },
  baseUrl: { display:'flex', alignItems:'center', gap:10 },
  baseLabel: { fontSize:11, color:'#475569', textTransform:'uppercase', letterSpacing:.6 },
  baseCode: {
    fontSize:12, color:'#94a3b8', background:'#0d1525', border:'1px solid #1e2d45',
    padding:'3px 10px', borderRadius:6, fontFamily:'monospace',
  },
  statusLink: {
    fontSize:12, color:'#10b981', textDecoration:'none', fontWeight:600,
    padding:'8px 16px', border:'1px solid rgba(16,185,129,.25)', borderRadius:8,
    background:'rgba(16,185,129,.07)', display:'flex', alignItems:'center', gap:6,
  },
  authNote: {
    display:'flex', gap:14, background:'rgba(139,92,246,.07)',
    border:'1px solid rgba(139,92,246,.2)', borderRadius:12,
    padding:'16px 20px', marginBottom:24,
  },
  authNoteIcon: { fontSize:20, flexShrink:0 },
  code: {
    fontFamily:'monospace', fontSize:12, background:'rgba(255,255,255,.06)',
    padding:'1px 5px', borderRadius:4, color:'#c084fc',
  },
  controls: { marginBottom:16 },
  searchInput: {
    width:'100%', padding:'10px 14px', background:'#0d1525', border:'1px solid #1e2d45',
    borderRadius:10, color:'#f1f5f9', fontSize:13, outline:'none', marginBottom:12,
    boxSizing:'border-box',
  },
  tagBar: { display:'flex', gap:6, flexWrap:'wrap' },
  tagBtn: {
    padding:'5px 12px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:500,
    cursor:'pointer', transition:'all .15s',
  },
  statsRow: {
    display:'flex', gap:16, alignItems:'center', padding:'8px 0', marginBottom:8,
    flexWrap:'wrap',
  },
  endpointList: {
    background:'#0f1628', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden',
  },
  footer: {
    textAlign:'center', fontSize:12, color:'#475569', marginTop:32,
  },
};

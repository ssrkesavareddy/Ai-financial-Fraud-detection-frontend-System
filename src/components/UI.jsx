import { useState } from 'react';

const s = {
  card: { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'24px' },
  cardHover: { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'24px', transition:'all 0.2s', cursor:'pointer' },
  input: { width:'100%', background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'10px 14px', color:'var(--text-primary)', fontSize:'14px', outline:'none', transition:'border 0.2s' },
  label: { display:'block', fontSize:'13px', fontWeight:'500', color:'var(--text-secondary)', marginBottom:'6px' },
  btn: (color='blue', size='md') => ({
    display:'inline-flex', alignItems:'center', gap:'6px', cursor:'pointer', fontWeight:'600', borderRadius:'var(--radius-sm)',
    border:'none', transition:'all 0.2s', fontSize: size==='sm'?'12px':'14px',
    padding: size==='sm'?'6px 12px':size==='lg'?'14px 28px':'10px 18px',
    background: color==='blue'?'var(--accent-blue)':color==='green'?'var(--accent-green)':color==='red'?'var(--accent-red)':color==='amber'?'var(--accent-amber)':color==='ghost'?'transparent':'var(--bg-card-hover)',
    color: color==='ghost'?'var(--text-secondary)':'white',
    border: color==='ghost'?'1px solid var(--border)':'none',
  }),
  badge: (color) => ({
    display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600',
    background: color==='green'?'rgba(16,185,129,0.15)':color==='red'?'rgba(239,68,68,0.15)':color==='amber'?'rgba(245,158,11,0.15)':color==='blue'?'rgba(59,130,246,0.15)':'rgba(148,163,184,0.1)',
    color: color==='green'?'#10b981':color==='red'?'#ef4444':color==='amber'?'#f59e0b':color==='blue'?'#3b82f6':'#94a3b8',
  }),
};

export const Card = ({ children, style, onClick }) => (
  <div style={{ ...s.card, ...style }} onClick={onClick}>{children}</div>
);

export const Input = ({ label, error, ...props }) => (
  <div style={{ marginBottom:'16px' }}>
    {label && <label style={s.label}>{label}</label>}
    <input style={{ ...s.input, ...(error ? { borderColor:'var(--accent-red)' } : {}) }} {...props}
      onFocus={e => e.target.style.borderColor='var(--accent-blue)'}
      onBlur={e => e.target.style.borderColor=error?'var(--accent-red)':'var(--border)'} />
    {error && <p style={{ color:'var(--accent-red)', fontSize:'12px', marginTop:'4px' }}>{error}</p>}
  </div>
);

export const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom:'16px' }}>
    {label && <label style={s.label}>{label}</label>}
    <select style={{ ...s.input, cursor:'pointer' }} {...props}>{children}</select>
  </div>
);

export const Btn = ({ children, color='blue', size='md', loading, style, ...props }) => (
  <button style={{ ...s.btn(color, size), opacity:loading?0.7:1, ...style }} disabled={loading} {...props}>
    {loading && <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />}
    {children}
  </button>
);

export const Badge = ({ children, color }) => <span style={s.badge(color)}>{children}</span>;

export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px' }} onClick={onClose}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'28px', width:'100%', maxWidth:'500px', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <h3 style={{ fontSize:'16px', fontWeight:'700' }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'20px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Toast = ({ message, type, onClose }) => (
  message ? (
    <div style={{ position:'fixed', top:'20px', right:'20px', zIndex:2000, padding:'14px 20px', borderRadius:'var(--radius-sm)',
      background: type==='error'?'rgba(239,68,68,0.95)':type==='success'?'rgba(16,185,129,0.95)':'rgba(59,130,246,0.95)',
      color:'white', fontSize:'14px', fontWeight:'500', display:'flex', gap:'12px', alignItems:'center', maxWidth:'360px',
      boxShadow:'0 8px 32px rgba(0,0,0,0.4)', backdropFilter:'blur(8px)' }}>
      <span>{type==='error'?'⚠️':type==='success'?'✅':'ℹ️'}</span>
      <span>{message}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.8)', cursor:'pointer', marginLeft:'auto' }}>✕</button>
    </div>
  ) : null
);

export const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}>
    <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--accent-blue)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
  </div>
);

export const StatCard = ({ label, value, icon, color='blue', sub }) => (
  <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'20px', position:'relative', overflow:'hidden' }}>
    <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:`var(--accent-${color})` }} />
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <div>
        <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginBottom:'8px' }}>{label}</p>
        <p style={{ fontSize:'28px', fontWeight:'800', letterSpacing:'-0.5px' }}>{value}</p>
        {sub && <p style={{ color:'var(--text-muted)', fontSize:'12px', marginTop:'4px' }}>{sub}</p>}
      </div>
      <div style={{ background:`var(--glow-${color==='blue'?'blue':color==='green'?'green':'red'})`, padding:'12px', borderRadius:'var(--radius-sm)', fontSize:'22px' }}>{icon}</div>
    </div>
  </div>
);

export const Table = ({ cols, rows, empty='No data.' }) => (
  <div style={{ overflowX:'auto' }}>
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
      <thead>
        <tr style={{ borderBottom:'1px solid var(--border)' }}>
          {cols.map((c,i) => <th key={i} style={{ padding:'10px 14px', textAlign:'left', color:'var(--text-muted)', fontWeight:'600', whiteSpace:'nowrap' }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <tr><td colSpan={cols.length} style={{ textAlign:'center', padding:'32px', color:'var(--text-muted)' }}>{empty}</td></tr>
          : rows.map((r,i) => <tr key={i} style={{ borderBottom:'1px solid rgba(30,45,69,0.5)', transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-card-hover)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{r}</tr>)}
      </tbody>
    </table>
  </div>
);

export function useToast() {
  const [toast, setToast] = useState({ message:'', type:'info' });
  const show = (message, type='info') => { setToast({ message, type }); setTimeout(() => setToast({ message:'', type:'info' }), 4000); };
  const clear = () => setToast({ message:'', type:'info' });
  return { toast, show, clear };
}

export { s as styles };

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth.jsx';
import { Shield, LayoutDashboard, CreditCard, Users, BarChart2, FileText, LogOut, Menu, X, Lock } from 'lucide-react';

const userNav = [
  { path: '/dashboard',    icon: <LayoutDashboard size={16} />, label: 'Dashboard'   },
  { path: '/transactions', icon: <CreditCard      size={16} />, label: 'Transactions'},
  { path: '/security',     icon: <Lock            size={16} />, label: 'Security'    },
];
const adminNav = [
  { path: '/admin',              icon: <LayoutDashboard size={16} />, label: 'Dashboard'  },
  { path: '/admin/users',        icon: <Users           size={16} />, label: 'Users'       },
  { path: '/admin/transactions', icon: <CreditCard      size={16} />, label: 'Transactions'},
  { path: '/admin/analytics',    icon: <BarChart2       size={16} />, label: 'Analytics'   },
  { path: '/admin/audit-logs',   icon: <FileText        size={16} />, label: 'Audit Logs'  },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

export default function Layout({ children }) {
  const { user, role, logout } = useAuth();
  const nav      = useNavigate();
  const loc      = useLocation();
  const isMobile = useIsMobile();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);

  const links    = role === 'admin' ? adminNav : userNav;
  const sideOpen = isMobile ? mobileOpen : desktopOpen;

  const sidebar = (
    <aside style={{
      width:         isMobile ? 240 : (desktopOpen ? 240 : 64),
      background:    'var(--bg-secondary)',
      borderRight:   '1px solid var(--border)',
      display:       'flex',
      flexDirection: 'column',
      flexShrink:    0,
      height:        '100vh',
      overflow:      'hidden',
      ...(isMobile ? {
        position:   'fixed', top: 0, left: 0, zIndex: 200,
        transform:  mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        width:      240,
      } : {
        position:   'sticky', top: 0,
        transition: 'width 0.25s',
      }),
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', minHeight: 65 }}>
        <div style={{ background: 'var(--accent-blue)', borderRadius: '8px', padding: '6px', display: 'flex', flexShrink: 0 }}>
          <Shield size={18} color="white" />
        </div>
        {sideOpen && (
          <div>
            <div style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '-0.3px' }}>Financial AI</div>
            <div style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fraud Detection</div>
          </div>
        )}
      </div>

      {/* Role badge */}
      {sideOpen && (
        <div style={{ padding: '12px 16px' }}>
          <span style={{ background: 'var(--glow-blue)', color: 'var(--accent-blue)', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
            {role === 'admin' ? '⚡ Admin' : '👤 User'}
          </span>
        </div>
      )}

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '8px' }}>
        {links.map(l => {
          const active = loc.pathname === l.path || (l.path !== '/admin' && l.path !== '/dashboard' && loc.pathname.startsWith(l.path));
          return (
            <button key={l.path} onClick={() => nav(l.path)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px', borderRadius: 'var(--radius-sm)', border: 'none',
                cursor: 'pointer', marginBottom: '2px', transition: 'all 0.15s', textAlign: 'left',
                background: active ? 'var(--accent-blue)' : 'transparent',
                color:      active ? 'white' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}>
              <span style={{ flexShrink: 0 }}>{l.icon}</span>
              {sideOpen && <span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>{l.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer: user card + controls */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        {sideOpen && user && (
          <div style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email || user.phone}</div>
            <div style={{ fontSize: '11px', color: 'var(--accent-green)', marginTop: '4px', fontWeight: '600' }}>
              ₹{user.account_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        )}
        {!isMobile && (
          <button onClick={() => setDesktopOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '4px', fontSize: '13px' }}>
            {desktopOpen ? <X size={14} /> : <Menu size={14} />}
            {desktopOpen && 'Collapse'}
          </button>
        )}
        <button onClick={() => { logout(); nav('/login'); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
          <LogOut size={14} />{sideOpen && 'Sign out'}
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199, backdropFilter: 'blur(2px)' }} />
      )}

      {sidebar}

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 16px', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            {/* Hamburger — mobile only */}
            {isMobile && (
              <button onClick={() => setMobileOpen(o => !o)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}>
                <Menu size={20} />
              </button>
            )}
            {/* Breadcrumb */}
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loc.pathname.split('/').filter(Boolean).map((p, i, arr) => (
                <span key={i}>
                  {i > 0 ? ' / ' : ''}
                  <span style={{ color: i === arr.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {p.replace(/-/g, ' ')}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 6px var(--accent-green)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Live</span>
          </div>
        </div>

        {/* Page content with responsive padding */}
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          {children}
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

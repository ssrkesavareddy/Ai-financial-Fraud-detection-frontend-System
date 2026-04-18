import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { login as apiLogin, getMe } from '../../api/client';
import { useAuth } from '../../store/auth.jsx';
import { Input, Btn, useToast, Toast } from '../../components/UI';

export default function Login() {
  const [form, setForm] = useState({ username:'', password:'' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const { toast, show, clear } = useToast();

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await apiLogin(form);
      const { access_token, role } = r.data;

      // Store token BEFORE calling getMe so the Axios interceptor picks it up.
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);

      // /users/me is restricted to role="user" on the backend.
      // Admins get 403 — catch it and build a minimal profile from what
      // the login response already gave us so the UI doesn't crash.
      let userData;
      try {
        const me = await getMe();
        userData = me.data;
      } catch (profileErr) {
        if (profileErr.response?.status === 403 && role === 'admin') {
          userData = {
            name: 'Admin',
            email: form.username,
            phone: null,
            account_balance: 0,
            role: 'admin',
            is_verified: true,
            is_active: true,
            is_blocked: false,
          };
        } else {
          throw profileErr; // real error — let the outer catch handle it
        }
      }

      login(access_token, role, userData);
      nav(role === 'admin' ? '/admin' : '/dashboard');
    } catch(err) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      show(err.response?.data?.detail || 'Login failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px',
      backgroundImage:'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 60%)' }}>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ display:'inline-flex', background:'var(--accent-blue)', borderRadius:'16px', padding:'14px', marginBottom:'16px', boxShadow:'0 0 30px rgba(59,130,246,0.3)' }}>
            <Shield size={32} color="white"/>
          </div>
          <h1 style={{ fontSize:'28px', fontWeight:'800', marginBottom:'6px', letterSpacing:'-0.5px' }}>FraudGuard AI</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'14px' }}>Sign in to your secure account</p>
        </div>

        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'28px' }}>
          <form onSubmit={submit}>
            <Input label="Email address" type="email" placeholder="you@example.com" value={form.username}
              onChange={e=>setForm(f=>({...f,username:e.target.value}))} required/>
            <div style={{ position:'relative' }}>
              <Input label="Password" type={showPw?'text':'password'} placeholder="••••••••" value={form.password}
                onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/>
              <button type="button" onClick={()=>setShowPw(s=>!s)} style={{ position:'absolute', right:12, top:30, background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>
                {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
            <div style={{ textAlign:'right', marginTop:'-8px', marginBottom:'16px' }}>
              <Link to="/forgot-password" style={{ fontSize:'12px', color:'var(--accent-blue)', textDecoration:'none' }}>Forgot password?</Link>
            </div>
            <Btn type="submit" loading={loading} size="lg" style={{ width:'100%', justifyContent:'center' }}>Sign In</Btn>
          </form>
          <p style={{ textAlign:'center', marginTop:'20px', fontSize:'13px', color:'var(--text-muted)' }}>
            New here? <Link to="/register" style={{ color:'var(--accent-blue)', textDecoration:'none', fontWeight:'600' }}>Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

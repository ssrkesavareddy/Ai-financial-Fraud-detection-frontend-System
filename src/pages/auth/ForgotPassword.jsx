import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { requestPasswordReset, resetPassword } from '../../api/client';
import { Input, Btn, useToast, Toast } from '../../components/UI';

export default function ForgotPassword() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPw, setNewPw] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast, show, clear } = useToast();

  const doRequest = async e => {
    e.preventDefault(); setLoading(true);
    try { await requestPasswordReset({ email }); show('Reset link sent to your email','success'); setStep('reset'); }
    catch(err) { show(err.response?.data?.detail||'Error','error'); }
    finally { setLoading(false); }
  };

  const doReset = async e => {
    e.preventDefault(); setLoading(true);
    try { await resetPassword({ token, new_password: newPw }); show('Password reset! You can now login.','success'); setStep('done'); }
    catch(err) { show(err.response?.data?.detail||'Error','error'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ display:'inline-flex', background:'var(--accent-blue)', borderRadius:'16px', padding:'12px', marginBottom:'12px' }}><Shield size={28} color="white"/></div>
          <h1 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Reset Password</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>We'll send a reset link to your email</p>
        </div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'28px' }}>
          {step==='email' && <form onSubmit={doRequest}>
            <Input label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/>
            <Btn type="submit" loading={loading} size="lg" style={{ width:'100%', justifyContent:'center' }}>Send Reset Link</Btn>
          </form>}
          {step==='reset' && <form onSubmit={doReset}>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'16px' }}>Paste the token from your email and set a new password.</p>
            <Input label="Reset Token" value={token} onChange={e=>setToken(e.target.value)} required/>
            <Input label="New Password" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} required minLength={6}/>
            <Btn type="submit" loading={loading} size="lg" style={{ width:'100%', justifyContent:'center' }}>Reset Password</Btn>
          </form>}
          {step==='done' && <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>✅</div>
            <p style={{ color:'var(--accent-green)', fontWeight:'600', marginBottom:'16px' }}>Password reset successfully!</p>
            <Link to="/login" style={{ color:'var(--accent-blue)', textDecoration:'none', fontWeight:'600' }}>Back to Login</Link>
          </div>}
        </div>
        {step!=='done' && <p style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:'var(--text-muted)' }}>
          <Link to="/login" style={{ color:'var(--accent-blue)', textDecoration:'none', fontWeight:'600' }}>← Back to Login</Link>
        </p>}
      </div>
    </div>
  );
}

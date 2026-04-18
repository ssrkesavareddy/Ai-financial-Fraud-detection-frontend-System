import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, CheckCircle, Lock } from 'lucide-react';
import { sendRegisterOtp, register } from '../../api/client';
import { Input, Btn, useToast, Toast, Card } from '../../components/UI';

const STEPS = ['Your Details', 'Verify OTP', 'Done'];

export default function Register() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name:'', phone:'', email:'' });
  const [regForm, setRegForm] = useState({ otp:'', password:'', dob:'' });
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { toast, show, clear } = useToast();
  const nav = useNavigate();

  const sendOtp = async e => {
    e.preventDefault();
    if (!form.phone.match(/^\+\d{10,15}$/)) return show('Phone must be in format +91XXXXXXXXXX', 'error');
    setLoading(true);
    try {
      await sendRegisterOtp(form);
      show('OTP sent to your email!', 'success');
      setStep(1);
    } catch(err) { show(err.response?.data?.detail || 'Failed to send OTP', 'error'); }
    finally { setLoading(false); }
  };

  const submit = async e => {
    e.preventDefault();
    if (regForm.password.length < 6) return show('Password must be at least 6 characters', 'error');
    setLoading(true);
    try {
      await register({ ...form, ...regForm });
      setStep(2);
      setRegistered(true);
    } catch(err) { show(err.response?.data?.detail || 'Registration failed', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px',
      backgroundImage:'radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.06) 0%, transparent 60%)' }}>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <div style={{ width:'100%', maxWidth:'460px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ display:'inline-flex', background:'var(--accent-blue)', borderRadius:'16px', padding:'12px', marginBottom:'12px' }}>
            <Shield size={28} color="white"/>
          </div>
          <h1 style={{ fontSize:'24px', fontWeight:'800', letterSpacing:'-0.5px' }}>Create Account</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginTop:'4px' }}>Join FraudGuard AI — your financial safety net</p>
        </div>

        {/* Stepper */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:'24px', gap:'4px' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700',
                background: i < step ? 'var(--accent-green)' : i === step ? 'var(--accent-blue)' : 'var(--bg-card)',
                border: `2px solid ${i < step ? 'var(--accent-green)' : i === step ? 'var(--accent-blue)' : 'var(--border)'}`,
                color: i <= step ? 'white' : 'var(--text-muted)' }}>
                {i < step ? '✓' : i+1}
              </div>
              <span style={{ fontSize:'10px', color: i===step?'var(--text-primary)':'var(--text-muted)', fontWeight:i===step?'600':'400' }}>{s}</span>
              {i < STEPS.length-1 && <div style={{ position:'absolute' }}/>}
            </div>
          ))}
        </div>

        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'28px' }}>
          {step === 0 && (
            <form onSubmit={sendOtp}>
              <h3 style={{ fontSize:'15px', fontWeight:'700', marginBottom:'20px' }}>Your Details</h3>
              <Input label="Full Name" placeholder="John Smith" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
              <Input label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/>
              <Input label="Phone Number" placeholder="+919876543210" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} required/>
              <Btn type="submit" loading={loading} size="lg" style={{ width:'100%', justifyContent:'center' }}>Send OTP to Email</Btn>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={submit}>
              {/* Locked details review */}
              <div style={{ background:'var(--bg-input)', borderRadius:'var(--radius-sm)', padding:'14px', marginBottom:'20px', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                  <Lock size={14} color="var(--accent-amber)"/>
                  <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--accent-amber)' }}>Details locked — cannot be changed after submission</span>
                </div>
                {[['Name', form.name],['Email', form.email],['Phone', form.phone]].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:'13px' }}>
                    <span style={{ color:'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight:'500' }}>{v}</span>
                  </div>
                ))}
              </div>
              <Input label="OTP (from your email)" placeholder="123456" value={regForm.otp} onChange={e=>setRegForm(f=>({...f,otp:e.target.value}))} maxLength={6} required/>
              <Input label="Password" type="password" placeholder="Min 6 characters" value={regForm.password} onChange={e=>setRegForm(f=>({...f,password:e.target.value}))} minLength={6} required/>
              <Input label="Date of Birth" type="date" value={regForm.dob} onChange={e=>setRegForm(f=>({...f,dob:e.target.value}))} required/>
              <Btn type="submit" loading={loading} size="lg" style={{ width:'100%', justifyContent:'center' }}>Complete Registration</Btn>
              <button type="button" onClick={()=>setStep(0)} style={{ width:'100%', marginTop:'8px', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'13px' }}>← Back</button>
            </form>
          )}

          {step === 2 && (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ display:'inline-flex', background:'rgba(16,185,129,0.15)', borderRadius:'50%', padding:'20px', marginBottom:'16px' }}>
                <CheckCircle size={40} color="var(--accent-green)"/>
              </div>
              <h3 style={{ fontSize:'18px', fontWeight:'700', marginBottom:'8px' }}>Account Created!</h3>
              <p style={{ color:'var(--text-secondary)', fontSize:'14px', marginBottom:'24px' }}>
                Welcome <strong>{form.name}</strong>. Your identity details are now locked and verified.
              </p>
              <div style={{ background:'var(--bg-input)', borderRadius:'var(--radius-sm)', padding:'14px', marginBottom:'20px', textAlign:'left' }}>
                <p style={{ fontSize:'12px', color:'var(--accent-green)', fontWeight:'600', marginBottom:'8px' }}>✅ Identity Verified & Locked</p>
                {[['Name', form.name],['Email', form.email],['Phone', form.phone]].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize:'13px' }}>
                    <span style={{ color:'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight:'500' }}>{v}</span>
                  </div>
                ))}
              </div>
              <Btn onClick={()=>nav('/login')} size="lg" style={{ width:'100%', justifyContent:'center' }}>Sign In Now</Btn>
            </div>
          )}
        </div>

        {step < 2 && <p style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:'var(--text-muted)' }}>
          Have an account? <Link to="/login" style={{ color:'var(--accent-blue)', textDecoration:'none', fontWeight:'600' }}>Sign in</Link>
        </p>}
      </div>
    </div>
  );
}

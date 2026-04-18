import { useState } from 'react';
import { useAuth } from '../../store/auth.jsx';
import { blockSelf, requestUnblock, verifyUnblock } from '../../api/client';
import { Card, Btn, Input, Badge, useToast, Toast } from '../../components/UI';
import { Shield, Lock, Unlock, AlertTriangle } from 'lucide-react';

export default function Security() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unblockStep, setUnblockStep] = useState(0);
  const [otp, setOtp] = useState('');
  const { toast, show, clear } = useToast();

  const doBlock = async () => {
    if (!confirm('Block your account? You will need OTP to unblock.')) return;
    setLoading(true);
    try {
      await blockSelf();
      setUser(u => ({ ...u, is_blocked: true }));
      show('Account blocked.','success');
    } catch(err) { show(err.response?.data?.detail||'Error','error'); }
    finally { setLoading(false); }
  };

  const doRequestUnblock = async () => {
    setLoading(true);
    try {
      await requestUnblock();
      show('OTP sent to your email','success');
      setUnblockStep(1);
    } catch(err) { show(err.response?.data?.detail||'Error','error'); }
    finally { setLoading(false); }
  };

  const doVerifyUnblock = async () => {
    if (!otp) return show('Enter OTP','error');
    setLoading(true);
    try {
      await verifyUnblock({ otp });
      setUser(u => ({ ...u, is_blocked: false }));
      setUnblockStep(0); setOtp('');
      show('Account unblocked!','success');
    } catch(err) { show(err.response?.data?.detail||'Invalid OTP','error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={clear}/>
      <h2 style={{ fontSize:'22px', fontWeight:'800', marginBottom:'4px' }}>Security</h2>
      <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginBottom:'24px' }}>Manage your account security settings</p>

      {/* Status */}
      <Card style={{ marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ background: user?.is_blocked?'var(--glow-red)':'var(--glow-green)', padding:'14px', borderRadius:'var(--radius-sm)' }}>
            {user?.is_blocked ? <Lock size={24} color="var(--accent-red)"/> : <Shield size={24} color="var(--accent-green)"/>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:'700', marginBottom:'4px' }}>Account Status</div>
            <Badge color={user?.is_blocked?'red':'green'}>{user?.is_blocked?'🔴 Blocked':'🟢 Active'}</Badge>
          </div>
          {!user?.is_blocked ? (
            <Btn color="red" loading={loading} onClick={doBlock}><Lock size={14}/>Block Account</Btn>
          ) : unblockStep === 0 ? (
            <Btn color="green" loading={loading} onClick={doRequestUnblock}><Unlock size={14}/>Request Unblock OTP</Btn>
          ) : (
            <div style={{ display:'flex', gap:'8px', alignItems:'flex-end' }}>
              <Input label="Enter OTP" placeholder="123456" value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6} style={{ marginBottom:0 }}/>
              <Btn color="green" loading={loading} onClick={doVerifyUnblock}>Verify</Btn>
            </div>
          )}
        </div>
      </Card>

      {/* Account details (read-only after registration) */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
          <Lock size={16} color="var(--accent-amber)"/>
          <h3 style={{ fontSize:'14px', fontWeight:'700' }}>Identity Details</h3>
          <Badge color="amber">Locked after registration</Badge>
        </div>
        <div style={{ display:'grid', gap:'12px' }}>
          {[['Full Name', user?.name],['Email', user?.email],['Phone', user?.phone],['Account Balance', `₹${user?.account_balance?.toLocaleString('en-IN',{minimumFractionDigits:2})}`],['Role', user?.role],['Verified', user?.is_verified?'Yes':'No']].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'var(--bg-input)', borderRadius:'var(--radius-sm)' }}>
              <span style={{ color:'var(--text-muted)', fontSize:'13px' }}>{k}</span>
              <span style={{ fontWeight:'600', fontSize:'13px' }}>{v || '—'}</span>
            </div>
          ))}
        </div>
        <p style={{ color:'var(--text-muted)', fontSize:'12px', marginTop:'12px' }}>
          ⚠ These details were verified at registration and cannot be changed. Contact admin if there's an error.
        </p>
      </Card>
    </div>
  );
}

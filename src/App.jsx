import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/auth.jsx';
import Layout from './components/Layout';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// User pages
import UserDashboard from './pages/user/Dashboard';
import UserTransactions from './pages/user/Transactions';
import Security from './pages/user/Security';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

function PrivateRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:48, height:48, border:'3px solid var(--border)', borderTopColor:'var(--accent-blue)', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto 16px' }}/>
        <p style={{ color:'var(--text-muted)', fontSize:'14px' }}>Loading Financial AI...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace/>;
  if (requiredRole && role !== requiredRole) return <Navigate to={role==='admin'?'/admin':'/dashboard'} replace/>;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login/>}/>
          <Route path="/register" element={<Register/>}/>
          <Route path="/forgot-password" element={<ForgotPassword/>}/>
          <Route path="/" element={<Navigate to="/login" replace/>}/>

          {/* User routes */}
          <Route path="/dashboard" element={<PrivateRoute requiredRole="user"><UserDashboard/></PrivateRoute>}/>
          <Route path="/transactions" element={<PrivateRoute requiredRole="user"><UserTransactions/></PrivateRoute>}/>
          <Route path="/security" element={<PrivateRoute requiredRole="user"><Security/></PrivateRoute>}/>

          {/* Admin routes */}
          <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminDashboard/></PrivateRoute>}/>
          <Route path="/admin/users" element={<PrivateRoute requiredRole="admin"><AdminUsers/></PrivateRoute>}/>
          <Route path="/admin/transactions" element={<PrivateRoute requiredRole="admin"><AdminTransactions/></PrivateRoute>}/>
          <Route path="/admin/analytics" element={<PrivateRoute requiredRole="admin"><AdminAnalytics/></PrivateRoute>}/>
          <Route path="/admin/audit-logs" element={<PrivateRoute requiredRole="admin"><AdminAuditLogs/></PrivateRoute>}/>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

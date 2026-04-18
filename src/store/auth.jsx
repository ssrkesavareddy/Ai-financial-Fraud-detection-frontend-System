import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api/client';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (!token) { setLoading(false); return; }

    getMe()
      .then(r => {
        setUser(r.data);
        setRole(r.data.role);
      })
      .catch(err => {
        // /users/me is restricted to role="user" on the backend.
        // A 403 while storedRole=admin means the JWT is valid but the endpoint
        // rejects admins — restore a minimal session rather than nuking the token.
        if (err.response?.status === 403 && storedRole === 'admin') {
          setUser({
            name: 'Admin',
            email: localStorage.getItem('admin_email') || null,
            phone: null,
            account_balance: 0,
            role: 'admin',
            is_verified: true,
            is_active: true,
            is_blocked: false,
          });
          setRole('admin');
        } else {
          // Genuine failure (401, expired token, etc.) — clear everything
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('admin_email');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, roleVal, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', roleVal);
    if (roleVal === 'admin' && userData?.email) {
      localStorage.setItem('admin_email', userData.email);
    }
    setRole(roleVal);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('admin_email');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthCtx.Provider value={{ user, role, loading, login, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

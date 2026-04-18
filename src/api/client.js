import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const client = axios.create({ baseURL: API_BASE });
client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
client.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('role'); window.location.href = '/login'; }
  return Promise.reject(err);
});

// Auth
export const sendRegisterOtp = d => client.post('/auth/send-register-otp', d);
export const register = d => client.post('/auth/register', d);
export const login = d => { const f=new URLSearchParams(); f.append('username',d.username); f.append('password',d.password); return client.post('/auth/login',f,{headers:{'Content-Type':'application/x-www-form-urlencoded'}}); };
export const requestPasswordReset = d => client.post('/auth/request-password-reset', d);
export const resetPassword = d => client.post('/auth/reset-password', d);

// User
export const getMe = () => client.get('/users/me');
export const getMyTransactions = (type) => client.get('/users/me/transactions', { params: type ? { type } : {} });
export const getMyDebits = () => client.get('/users/me/transactions/debits');
export const getMyCredits = () => client.get('/users/me/transactions/credits');
export const blockSelf = () => client.post('/users/me/block');
export const requestUnblock = () => client.post('/users/request-unblock');
export const verifyUnblock = d => client.post('/users/verify-unblock', d);

// Transactions
export const createTransaction = d => client.post('/transactions/', d);
export const reportTransaction = id => client.post(`/transactions/${id}/report`);
export const verifyReport = (id, d) => client.post(`/transactions/${id}/verify-report`, d);

// Admin — users
export const adminDashboard = () => client.get('/admin/dashboard');
export const adminGetUsers = () => client.get('/admin/users');
export const adminUpdateBalance = (id, d) => client.patch(`/admin/users/${id}/balance`, d);
export const adminBlockUser = id => client.patch(`/admin/users/${id}/block`);
export const adminUnblockUser = id => client.patch(`/admin/users/${id}/unblock`);
export const adminActivateUser = id => client.patch(`/admin/users/${id}/activate`);
export const adminDeactivateUser = id => client.patch(`/admin/users/${id}/deactivate`);
export const adminCreateUser = d => client.post('/admin/create-user', d);

// Admin — transactions
export const adminCreateTransaction = d => client.post('/admin/transactions', d);
export const adminBulkDebit = d => client.post('/admin/bulk-transactions', d);
export const adminBulkCredit = d => client.post('/admin/bulk-credit', d);
export const adminCancelTransaction = (id, d) => client.post(`/admin/transactions/${id}/cancel`, d);
export const adminGetReported = (p, l) => client.get('/admin/reported-transactions', { params: { page:p, limit:l } });
export const adminApprove = id => client.post(`/admin/transactions/${id}/approve`);
export const adminReverse = id => client.post(`/admin/transactions/${id}/reverse`);

// Admin — ledger
export const adminGetTransactionLedger = id => client.get(`/admin/transactions/${id}/ledger`);
export const adminGetUserLedger = (id, p, l) => client.get(`/admin/users/${id}/ledger`, { params: { page:p, limit:l } });
export const adminValidateLedger = () => client.get('/admin/ledger/validate');

// Admin — audit & worker
export const adminGetAuditLogs = (p, l, adminId, action) => client.get('/admin/audit-logs', { params: { page:p, limit:l, admin_id:adminId, action } });
export const adminRunWorker = () => client.post('/admin/worker/run-auto-complete');

// Analytics
export const getFraudRate = (s, e) => client.get('/analytics/fraud-rate', { params: { start_date:s, end_date:e } });
export const getFraudLogs = (p, l, uid, fraud_only) => client.get('/analytics/fraud-logs', { params: { page:p, limit:l, user_id:uid, fraud_only } });
export const getOtpLogs = (p, l) => client.get('/analytics/otp-logs', { params: { page:p, limit:l } });
export const getFraudTrend = (s, e, p, l) => client.get('/analytics/fraud-trend', { params: { start_date:s, end_date:e, page:p, limit:l } });

export default client;

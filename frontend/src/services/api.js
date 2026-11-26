const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173')) {
    return 'http://localhost:5000/api/dashboard';
  }
  return '/api/dashboard';
};

const API_BASE = getApiBase();
const AUTH_BASE = API_BASE.replace(/\/dashboard\/?$/, '/auth');

export const ADMIN_SESSION_KEY = 'gymcentric_admin_session';
export const OWNER_SESSION_KEY = 'gymcentric_owner_session';

export function getActiveAuthToken() {
  if (typeof window === 'undefined') return '';
  const isAdmin = window.location.pathname.toLowerCase().startsWith('/admin');
  const storageKey = isAdmin ? ADMIN_SESSION_KEY : OWNER_SESSION_KEY;
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.token || '';
  } catch {
    return '';
  }
}

async function request(path, options = {}, tokenOverride) {
  const token = tokenOverride !== undefined ? tokenOverride : getActiveAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.message || `API request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function apiAdminLogin(password) {
  const res = await fetch(`${AUTH_BASE}/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.message || 'Incorrect Super Admin password');
    err.status = res.status;
    err.locked = Boolean(data.locked);
    err.retryAfterSeconds = Number(data.retryAfterSeconds || 0);
    err.attemptsRemaining = data.attemptsRemaining;
    throw err;
  }
  return data;
}

export async function apiVerifyAdminToken(token) {
  const res = await fetch(`${AUTH_BASE}/admin-verify`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data?.success);
}

export const fetchBootstrap = (tokenOverride) => request('/bootstrap', {}, tokenOverride);

export const apiCreateGym = (payload) =>
  request('/superadmin/gyms', { method: 'POST', body: JSON.stringify(payload) });

export const apiToggleGymStatus = (gymId) =>
  request(`/superadmin/gyms/${gymId}/status`, { method: 'PATCH' });

export const apiDeleteGym = (gymId) =>
  request(`/superadmin/gyms/${gymId}`, { method: 'DELETE' });

export const apiUpdateGymPlan = (gymId, payload) =>
  request(`/superadmin/gyms/${gymId}/plan`, { method: 'PUT', body: JSON.stringify(payload) });

export const apiRecordSaasPayment = (payload) =>
  request('/superadmin/payments', { method: 'POST', body: JSON.stringify(payload) });

export const apiDeleteSaasPayment = (paymentId) =>
  request(`/superadmin/payments/${paymentId}`, { method: 'DELETE' });

export const apiUpdatePlatformSettings = (payload) =>
  request('/superadmin/settings', { method: 'PUT', body: JSON.stringify(payload) });

export const apiCreateMember = (gymId, payload) =>
  request(`/gyms/${gymId}/members`, { method: 'POST', body: JSON.stringify(payload) });

export const apiToggleMemberStatus = (gymId, memberId) =>
  request(`/gyms/${gymId}/members/${memberId}/status`, { method: 'PATCH' });

export const apiDeleteMember = (gymId, memberId) =>
  request(`/gyms/${gymId}/members/${memberId}`, { method: 'DELETE' });

export const apiCreateGymPlan = (gymId, payload) =>
  request(`/gyms/${gymId}/plans`, { method: 'POST', body: JSON.stringify(payload) });

export const apiDeleteGymPlan = (gymId, planId) =>
  request(`/gyms/${gymId}/plans/${planId}`, { method: 'DELETE' });

export const apiRecordMemberPayment = (gymId, payload) =>
  request(`/gyms/${gymId}/payments`, { method: 'POST', body: JSON.stringify(payload) });

export const apiMarkMemberReminderSent = (gymId, memberId, milestone) =>
  request(`/gyms/${gymId}/members/${memberId}/reminder`, {
    method: 'PATCH',
    body: JSON.stringify({ milestone })
  });

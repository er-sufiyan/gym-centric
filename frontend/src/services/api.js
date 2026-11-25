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

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || `API request failed (${res.status})`);
  }
  return data;
}

export const fetchBootstrap = () => request('/bootstrap');

export const apiCreateGym = (payload) =>
  request('/superadmin/gyms', { method: 'POST', body: JSON.stringify(payload) });

export const apiToggleGymStatus = (gymId) =>
  request(`/superadmin/gyms/${gymId}/status`, { method: 'PATCH' });

export const apiUpdateGymPlan = (gymId, payload) =>
  request(`/superadmin/gyms/${gymId}/plan`, { method: 'PUT', body: JSON.stringify(payload) });

export const apiRecordSaasPayment = (payload) =>
  request('/superadmin/payments', { method: 'POST', body: JSON.stringify(payload) });

export const apiDeleteSaasPayment = (paymentId) =>
  request(`/superadmin/payments/${paymentId}`, { method: 'DELETE' });

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

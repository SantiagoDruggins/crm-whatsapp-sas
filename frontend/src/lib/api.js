const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = typeof window !== 'undefined' && localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText || 'Error en la petición');
  return data;
}

async function requestFormData(endpoint, formData) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = typeof window !== 'undefined' && localStorage.getItem('token');
  const headers = { ...(token && { Authorization: `Bearer ${token}` }) };
  const res = await fetch(url, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText || 'Error en la petición');
  return data;
}

export const api = {
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
  upload: (endpoint, formData) => requestFormData(endpoint, formData),
};

export default api;

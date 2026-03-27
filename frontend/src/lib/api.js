const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = typeof window !== 'undefined' && localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    const msg = err?.message || '';
    if (err?.name === 'TypeError' && (msg.includes('fetch') || msg.includes('Failed'))) {
      throw new Error(
        'No se pudo conectar con el servidor. Comprueba tu red, que el sitio cargue por HTTPS y que la API esté en marcha en el VPS (pm2, nginx).'
      );
    }
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText || 'Error en la petición');
  return data;
}

async function requestFormData(endpoint, formData) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = typeof window !== 'undefined' && localStorage.getItem('token');
  const headers = { ...(token && { Authorization: `Bearer ${token}` }) };
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: formData });
  } catch (err) {
    const msg = err?.message || '';
    if (err?.name === 'TypeError' && (msg.includes('fetch') || msg.includes('Failed'))) {
      throw new Error(
        'No se pudo conectar con el servidor. Comprueba tu red y que la API esté en marcha (pm2).'
      );
    }
    throw err;
  }
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

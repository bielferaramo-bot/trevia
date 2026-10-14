const API_BASE = '/api';

export const storage = {
  getToken: () => localStorage.getItem('trevia_token'),
  setToken: (token) => localStorage.setItem('trevia_token', token),
  removeToken: () => {
    localStorage.removeItem('trevia_token');
    localStorage.removeItem('trevia_user');
  },
  getUser: () => {
    try {
      const u = localStorage.getItem('trevia_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('trevia_user', JSON.stringify(user))
};

export async function apiRequest(endpoint, { method = 'GET', body, params } = {}) {
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        search.append(k, v);
      }
    });
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }

  const token = storage.getToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição.');
  }

  return data;
}

export const api = {
  auth: {
    login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: { email, password } }),
    register: (data) => apiRequest('/auth/register', { method: 'POST', body: data }),
    me: () => apiRequest('/auth/me'),
    updateMe: (data) => apiRequest('/auth/me', { method: 'PUT', body: data })
  },
  categories: {
    list: () => apiRequest('/categories')
  },
  locations: {
    list: () => apiRequest('/locations')
  },
  orders: {
    list: (params) => apiRequest('/orders', { params }),
    get: (id) => apiRequest(`/orders/${id}`),
    create: (data) => apiRequest('/orders', { method: 'POST', body: data }),
    update: (id, data) => apiRequest(`/orders/${id}`, { method: 'PUT', body: data }),
    updateStatus: (id, status) => apiRequest(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    myOrders: () => apiRequest('/orders/my/list')
  },
  proposals: {
    create: (orderId, data) => apiRequest(`/proposals/orders/${orderId}/proposals`, { method: 'POST', body: data }),
    myProposals: () => apiRequest('/proposals/my'),
    updateStatus: (id, status) => apiRequest(`/proposals/${id}/status`, { method: 'PATCH', body: { status } })
  },
  professionals: {
    get: (slug) => apiRequest(`/professionals/${slug}`),
    getMyProfile: () => apiRequest('/professionals/me/profile'),
    updateMyProfile: (data) => apiRequest('/professionals/me/profile', { method: 'PUT', body: data })
  },
  reports: {
    create: (data) => apiRequest('/reports', { method: 'POST', body: data })
  },
  alerts: {
    create: (data) => apiRequest('/alerts', { method: 'POST', body: data })
  },
  admin: {
    getMetrics: () => apiRequest('/admin/metrics'),
    getCategories: () => apiRequest('/admin/categories'),
    createCategory: (data) => apiRequest('/admin/categories', { method: 'POST', body: data }),
    updateCategory: (id, data) => apiRequest(`/admin/categories/${id}`, { method: 'PUT', body: data }),
    getLocations: () => apiRequest('/admin/locations'),
    updateLocation: (id, data) => apiRequest(`/admin/locations/${id}`, { method: 'PUT', body: data }),
    getReports: () => apiRequest('/admin/reports'),
    updateReport: (id, status) => apiRequest(`/admin/reports/${id}`, { method: 'PATCH', body: { status } }),
    updateUserStatus: (id, status) => apiRequest(`/admin/users/${id}/status`, { method: 'PATCH', body: { status } })
  }
};

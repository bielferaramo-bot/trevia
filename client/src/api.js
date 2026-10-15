const API_BASE = '/api';

export const storage = {
  getToken: () => {
    const t = localStorage.getItem('trevia_token');
    if (!t || t === 'undefined' || t === 'null') return null;
    return t;
  },
  setToken: (token) => {
    if (token && token !== 'undefined' && token !== 'null') {
      localStorage.setItem('trevia_token', token);
    } else {
      localStorage.removeItem('trevia_token');
    }
  },
  removeToken: () => {
    localStorage.removeItem('trevia_token');
    localStorage.removeItem('trevia_user');
  },
  getUser: () => {
    try {
      const u = localStorage.getItem('trevia_user');
      if (!u || u === 'undefined' || u === 'null') return null;
      return JSON.parse(u);
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    if (user && user !== 'undefined' && user !== 'null') {
      localStorage.setItem('trevia_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('trevia_user');
    }
  }
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
    loginWithGoogle: (credential, role) => apiRequest('/auth/google', { method: 'POST', body: { credential, role } }),
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
  radar: {
    getLatest: (params) => apiRequest('/radar/latest', { params }),
    unlockContact: (orderId) => apiRequest(`/radar/orders/${orderId}/unlock`, { method: 'POST' }),
    checkUnlockStatus: (orderId) => apiRequest(`/radar/orders/${orderId}/unlock-status`),
    rechargeCredits: (packageId) => apiRequest('/radar/credits/recharge', { method: 'POST', body: { package_id: packageId } }),
    createRechargeOrder: (packageId) => apiRequest('/radar/credits/order', { method: 'POST', body: { package_id: packageId } }),
    submitPaymentProof: (data) => apiRequest('/radar/credits/submit-proof', { method: 'POST', body: data }),
    getMyRecharges: () => apiRequest('/radar/credits/my-recharges'),
    requestRefund: (orderId, data) => apiRequest(`/radar/orders/${orderId}/refund`, { method: 'POST', body: data })
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
    updateUserStatus: (id, status) => apiRequest(`/admin/users/${id}/status`, { method: 'PATCH', body: { status } }),
    getRecharges: () => apiRequest('/admin/recharges'),
    approveRecharge: (id) => apiRequest(`/admin/recharges/${id}/approve`, { method: 'POST' }),
    rejectRecharge: (id) => apiRequest(`/admin/recharges/${id}/reject`, { method: 'POST' }),
    getWalletWithdrawals: () => apiRequest('/admin/wallet/withdrawals'),
    approveWalletWithdrawal: (id) => apiRequest(`/admin/wallet/withdrawals/${id}/approve`, { method: 'POST' }),
    rejectWalletWithdrawal: (id, reason) => apiRequest(`/admin/wallet/withdrawals/${id}/reject`, { method: 'POST', body: { reason } }),
    getWalletDeposits: () => apiRequest('/admin/wallet/deposits'),
    approveWalletDeposit: (id) => apiRequest(`/admin/wallet/deposits/${id}/approve`, { method: 'POST' })
  },
  leads: {
    create: (data) => apiRequest('/leads', { method: 'POST', body: data }),
    list: () => apiRequest('/leads'),
    updateStatus: (id, status) => apiRequest(`/leads/${id}/status`, { method: 'PATCH', body: { status } }),
    delete: (id) => apiRequest(`/leads/${id}`, { method: 'DELETE' })
  },
  reviews: {
    create: (data) => apiRequest('/reviews', { method: 'POST', body: data }),
    getByUser: (userId) => apiRequest(`/reviews/user/${userId}`),
    getByOrder: (orderId) => apiRequest(`/reviews/order/${orderId}`)
  },
  escrow: {
    getByOrder: (orderId) => apiRequest(`/escrow/order/${orderId}`),
    create: (orderId, data) => apiRequest(`/escrow/order/${orderId}`, { method: 'POST', body: data }),
    fund: (depositId) => apiRequest(`/escrow/${depositId}/fund`, { method: 'POST' }),
    fundWithWallet: (depositId) => apiRequest(`/escrow/${depositId}/fund-with-wallet`, { method: 'POST' }),
    release: (depositId) => apiRequest(`/escrow/${depositId}/release`, { method: 'POST' }),
    dispute: (depositId, data) => apiRequest(`/escrow/${depositId}/dispute`, { method: 'POST', body: data })
  },
  wallet: {
    summary: () => apiRequest('/wallet/summary'),
    transactions: (params) => apiRequest('/wallet/transactions', { params }),
    deposit: (amount) => apiRequest('/wallet/deposit', { method: 'POST', body: { amount } }),
    confirmDeposit: (depositId) => apiRequest(`/wallet/deposit/${depositId}/confirm`, { method: 'POST' }),
    withdraw: (data) => apiRequest('/wallet/withdraw', { method: 'POST', body: data }),
    withdrawals: () => apiRequest('/wallet/withdrawals')
  }
};

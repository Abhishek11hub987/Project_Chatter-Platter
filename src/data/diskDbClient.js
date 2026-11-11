/**
 * Client for the Built-in Persistent Cafe Disk DB (/api/* + SSE /api/events).
 * Persists all data to data/cafe-db.json and syncs across every device on Wi-Fi.
 */

const jsonFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const diskDb = {
  async checkHealth(timeoutMs = 1800) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/health', { signal: controller.signal });
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  },

  subscribe(onTopic) {
    if (typeof EventSource === 'undefined') return () => {};
    const es = new EventSource('/api/events');
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.topic && parsed.topic !== 'connected') {
          onTopic(parsed.topic);
        }
      } catch {
        /* ignore malformed ping */
      }
    };
    return () => es.close();
  },

  getMenu: () => jsonFetch('/api/menu'),
  addMenuItem: (item) =>
    jsonFetch('/api/menu', { method: 'POST', body: JSON.stringify(item) }),
  seedMenu: () =>
    jsonFetch('/api/menu', { method: 'POST', body: JSON.stringify({ action: 'seed' }) }),
  updateMenuItem: (id, patch) =>
    jsonFetch(`/api/menu/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteMenuItem: (id) =>
    jsonFetch(`/api/menu/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getOrders: (filterKey) => {
    const qs = filterKey ? `?status=${encodeURIComponent(filterKey)}` : '';
    return jsonFetch(`/api/orders${qs}`);
  },
  getOrder: (id) => jsonFetch(`/api/orders/${encodeURIComponent(id)}`),
  createOrder: (order) =>
    jsonFetch('/api/orders', { method: 'POST', body: JSON.stringify(order) }),
  approveOrder: (id) =>
    jsonFetch(`/api/orders/${encodeURIComponent(id)}/approve`, { method: 'POST' }),
  updateOrder: (id, patch) =>
    jsonFetch(`/api/orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  getFeedbacks: () => jsonFetch('/api/feedbacks'),
  addFeedback: (fb) =>
    jsonFetch('/api/feedbacks', { method: 'POST', body: JSON.stringify(fb) }),

  getSettings: () => jsonFetch('/api/settings'),
  updateSettings: (patch) =>
    jsonFetch('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) }),

  getStaff: () => jsonFetch('/api/staff'),
};


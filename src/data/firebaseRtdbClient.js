import { MENU_DATA } from './menuData';

const rawUrl = import.meta.env.VITE_FIREBASE_DB_URL || '';
export const firebaseDbUrl = rawUrl.replace(/\/+$/, '');
export const isFirebaseRtdbConfigured = Boolean(
  firebaseDbUrl && firebaseDbUrl.startsWith('https://')
);

const rtdbFetch = async (path, options = {}) => {
  const res = await fetch(`${firebaseDbUrl}/${path}.json`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Firebase RTDB HTTP ${res.status}`);
  }
  return res.json();
};

const objectToList = (obj) => {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([key, val]) => ({ ...val, id: val.id || key }));
};

export const firebaseRtdb = {
  async checkHealth(timeoutMs = 3000) {
    if (!isFirebaseRtdbConfigured) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${firebaseDbUrl}/settings.json`, { signal: controller.signal });
      if (!res.ok) return null;
      return { ok: true };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  },

  subscribe(node, onChange) {
    if (!isFirebaseRtdbConfigured || typeof EventSource === 'undefined') return () => {};
    const es = new EventSource(`${firebaseDbUrl}/${node}.json`);
    const handler = () => onChange();
    es.addEventListener('put', handler);
    es.addEventListener('patch', handler);
    return () => es.close();
  },

  async getMenu() {
    const raw = await rtdbFetch('menu');
    const list = objectToList(raw);
    if (list.length === 0) {
      return this.seedMenu();
    }
    return list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  },

  async seedMenu() {
    const map = {};
    const list = MENU_DATA.map((item, idx) => {
      const id = item.itemId || `menu_${idx}`;
      const record = { ...item, id, isAvailable: true, created_at: new Date().toISOString() };
      map[id] = record;
      return record;
    });
    await rtdbFetch('menu', { method: 'PUT', body: JSON.stringify(map) });
    return list;
  },

  async addMenuItem(item) {
    const id = item.itemId || `custom_${Date.now()}`;
    const record = { ...item, id, itemId: id, created_at: new Date().toISOString() };
    await rtdbFetch(`menu/${id}`, { method: 'PUT', body: JSON.stringify(record) });
    return record;
  },

  async updateMenuItem(id, patch) {
    return rtdbFetch(`menu/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },

  async deleteMenuItem(id) {
    return rtdbFetch(`menu/${id}`, { method: 'DELETE' });
  },

  async getOrders(filterKey) {
    const raw = await rtdbFetch('orders');
    let list = objectToList(raw).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filterKey) {
      const allowed = filterKey.split(',');
      list = list.filter((o) => allowed.includes(o.status));
    }
    return list;
  },

  async getOrder(id) {
    const data = await rtdbFetch(`orders/${id}`);
    return data ? { ...data, id } : null;
  },

  async createOrder(order) {
    const payload = {
      ...order,
      status: 'pending_payment',
      tokenNumber: null,
      createdAt: new Date().toISOString(),
    };
    const res = await rtdbFetch('orders', { method: 'POST', body: JSON.stringify(payload) });
    const created = { ...payload, id: res.name };
    await rtdbFetch(`orders/${res.name}/id`, { method: 'PUT', body: JSON.stringify(res.name) });
    return created;
  },

  async updateOrder(id, patch) {
    return rtdbFetch(`orders/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },

  async getFeedbacks() {
    const raw = await rtdbFetch('feedbacks');
    return objectToList(raw).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async addFeedback(fb) {
    const payload = { ...fb, created_at: new Date().toISOString() };
    const res = await rtdbFetch('feedbacks', { method: 'POST', body: JSON.stringify(payload) });
    return { ...payload, id: res.name };
  },

  async getSettings() {
    const data = await rtdbFetch('settings');
    return (
      data || {
        id: 'default',
        isOpen: true,
        rushMode: false,
        basePrepMinutes: 6,
        announcement: 'Welcome to Chatter & Platter!',
      }
    );
  },

  async updateSettings(patch) {
    return rtdbFetch('settings', {
      method: 'PATCH',
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
  },
};


import { MENU_DATA } from './menuData';

const KEYS = {
  MENU: 'cp_smart_menu_v2',
  ORDERS: 'cp_smart_orders_v2',
  FEEDBACKS: 'cp_smart_feedbacks_v2',
  SETTINGS: 'cp_smart_settings_v2',
  DEMO_ROLE: 'cp_smart_demo_role_v2',
  MODE_FLAG: 'cp_data_mode_v2', // 'auto' | 'local' | 'supabase'
};

let channel = null;
const getBroadcastChannel = () => {
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('chatter_platter_realtime');
  }
  return channel;
};

export const emitLocalSync = (topic) => {
  window.dispatchEvent(new CustomEvent('cp_local_sync', { detail: { topic } }));
  try {
    getBroadcastChannel()?.postMessage({ topic, ts: Date.now() });
  } catch (e) {
    /* ignore */
  }
};

export const subscribeLocalSync = (handler) => {
  const onWindowEvent = (e) => handler(e.detail?.topic);
  const onStorage = () => handler('storage');
  const bc = getBroadcastChannel();
  const onBc = (e) => handler(e.data?.topic);

  window.addEventListener('cp_local_sync', onWindowEvent);
  window.addEventListener('storage', onStorage);
  bc?.addEventListener('message', onBc);

  return () => {
    window.removeEventListener('cp_local_sync', onWindowEvent);
    window.removeEventListener('storage', onStorage);
    bc?.removeEventListener('message', onBc);
  };
};

const buildSeedMenu = () =>
  MENU_DATA.map((item, idx) => ({
    ...item,
    id: item.itemId || `menu_${idx}`,
    isAvailable: true,
    created_at: new Date().toISOString(),
  }));

const buildSeedOrdersAndFeedbacks = () => {
  const now = Date.now();
  const hourAgo = (hrs) => new Date(now - hrs * 3600 * 1000).toISOString();
  const minAfter = (iso, mins) => new Date(new Date(iso).getTime() + mins * 60000).toISOString();

  const sampleOrders = [
    {
      id: 'demo-ord-101',
      tableNumber: '04',
      customerName: 'Aarav',
      paymentMethod: 'online',
      status: 'delivered',
      tokenNumber: '12',
      estimatedMinutes: 7,
      notes: 'Extra spicy chutney',
      items: [
        { itemId: 'menu_15', name: 'Steamed/Fried Veg Momos', qty: 2, price: 59, subtotal: 118 },
        { itemId: 'menu_29', name: 'Cold Coffee', qty: 1, price: 59, subtotal: 59 },
      ],
      totalAmount: 177,
      createdAt: hourAgo(3),
      approvedAt: minAfter(hourAgo(3), 1),
      cookingAt: minAfter(hourAgo(3), 2),
      readyAt: minAfter(hourAgo(3), 7),
      deliveredAt: minAfter(hourAgo(3), 9),
    },
    {
      id: 'demo-ord-102',
      tableNumber: '09',
      customerName: 'Priya',
      paymentMethod: 'cash',
      status: 'delivered',
      tokenNumber: '18',
      estimatedMinutes: 6,
      notes: '',
      items: [
        { itemId: 'menu_24', name: 'Masala Tea', qty: 3, price: 30, subtotal: 90 },
        { itemId: 'menu_8', name: 'Veg Masala Maggi', qty: 2, price: 79, subtotal: 158 },
      ],
      totalAmount: 248,
      createdAt: hourAgo(2),
      approvedAt: minAfter(hourAgo(2), 1),
      cookingAt: minAfter(hourAgo(2), 2),
      readyAt: minAfter(hourAgo(2), 8),
      deliveredAt: minAfter(hourAgo(2), 10),
    },
    {
      id: 'demo-ord-103',
      tableNumber: '02',
      customerName: 'Rohan',
      paymentMethod: 'online',
      status: 'delivered',
      tokenNumber: '25',
      estimatedMinutes: 9,
      notes: 'Less ice in mojito',
      items: [
        { itemId: 'menu_4', name: 'Alfredo (White Sauce)', qty: 1, price: 149, subtotal: 149 },
        { itemId: 'menu_36', name: 'Virgin Mojito', qty: 2, price: 69, subtotal: 138 },
        { itemId: 'menu_2', name: 'Cheese Fries', qty: 1, price: 99, subtotal: 99 },
      ],
      totalAmount: 386,
      createdAt: hourAgo(1),
      approvedAt: minAfter(hourAgo(1), 1),
      cookingAt: minAfter(hourAgo(1), 2),
      readyAt: minAfter(hourAgo(1), 9),
      deliveredAt: minAfter(hourAgo(1), 11),
    },
  ];

  const sampleFeedbacks = [
    {
      id: 'demo-fb-1',
      order_id: 'demo-ord-101',
      customerName: 'Aarav',
      rating: 5,
      comment: 'Super hot momos and great cold coffee! Fast service.',
      sentiment: 'positive',
      tags: ['Super Tasty', 'Fast Service'],
      created_at: hourAgo(2.5),
    },
    {
      id: 'demo-fb-2',
      order_id: 'demo-ord-102',
      customerName: 'Priya',
      rating: 5,
      comment: 'Best masala chai near campus, love the token tracker!',
      sentiment: 'positive',
      tags: ['Hot & Fresh', 'Great Vibe'],
      created_at: hourAgo(1.5),
    },
    {
      id: 'demo-fb-3',
      order_id: 'demo-ord-103',
      customerName: 'Rohan',
      rating: 4,
      comment: 'White sauce pasta was creamy and filling.',
      sentiment: 'positive',
      tags: ['Value for Money'],
      created_at: hourAgo(0.7),
    },
  ];

  return { sampleOrders, sampleFeedbacks };
};

export const ensureLocalSeeded = () => {
  if (!localStorage.getItem(KEYS.MENU)) {
    localStorage.setItem(KEYS.MENU, JSON.stringify(buildSeedMenu()));
  }
  if (!localStorage.getItem(KEYS.ORDERS)) {
    const { sampleOrders, sampleFeedbacks } = buildSeedOrdersAndFeedbacks();
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(sampleOrders));
    if (!localStorage.getItem(KEYS.FEEDBACKS)) {
      localStorage.setItem(KEYS.FEEDBACKS, JSON.stringify(sampleFeedbacks));
    }
  }
  if (!localStorage.getItem(KEYS.FEEDBACKS)) {
    const { sampleFeedbacks } = buildSeedOrdersAndFeedbacks();
    localStorage.setItem(KEYS.FEEDBACKS, JSON.stringify(sampleFeedbacks));
  }
  if (!localStorage.getItem(KEYS.SETTINGS)) {
    localStorage.setItem(
      KEYS.SETTINGS,
      JSON.stringify({
        id: 'default',
        isOpen: true,
        rushMode: false,
        basePrepMinutes: 6,
        announcement: 'Welcome to Chatter & Platter! Fresh chai, momos & Maggi made to order.',
        updated_at: new Date().toISOString(),
      })
    );
  }
};

export const localDB = {
  getMenu() {
    ensureLocalSeeded();
    return JSON.parse(localStorage.getItem(KEYS.MENU) || '[]');
  },
  setMenu(items) {
    localStorage.setItem(KEYS.MENU, JSON.stringify(items));
    emitLocalSync('menu');
  },
  resetMenuToDefault() {
    const seeded = buildSeedMenu();
    localStorage.setItem(KEYS.MENU, JSON.stringify(seeded));
    emitLocalSync('menu');
    return seeded;
  },
  getOrders() {
    ensureLocalSeeded();
    const list = JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  setOrders(orders) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    emitLocalSync('orders');
  },
  getFeedbacks() {
    ensureLocalSeeded();
    const list = JSON.parse(localStorage.getItem(KEYS.FEEDBACKS) || '[]');
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addFeedback(fb) {
    const list = this.getFeedbacks();
    const created = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      ...fb,
    };
    list.unshift(created);
    localStorage.setItem(KEYS.FEEDBACKS, JSON.stringify(list));
    emitLocalSync('feedbacks');
    return created;
  },
  getSettings() {
    ensureLocalSeeded();
    return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
  },
  updateSettings(patch) {
    const next = {
      ...this.getSettings(),
      ...patch,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(next));
    emitLocalSync('settings');
    return next;
  },
  getDemoUserRole() {
    return localStorage.getItem(KEYS.DEMO_ROLE);
  },
  setDemoUserRole(role) {
    if (role) localStorage.setItem(KEYS.DEMO_ROLE, role);
    else localStorage.removeItem(KEYS.DEMO_ROLE);
    emitLocalSync('auth');
  },
  getModePreference() {
    return localStorage.getItem(KEYS.MODE_FLAG) || 'auto';
  },
  setModePreference(mode) {
    localStorage.setItem(KEYS.MODE_FLAG, mode);
    emitLocalSync('mode');
  },
};


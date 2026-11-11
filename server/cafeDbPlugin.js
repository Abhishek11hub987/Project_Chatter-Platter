import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { MENU_DATA } from '../src/data/menuData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.resolve(__dirname, '..', 'data', 'cafe-db.json');

const buildInitialDb = () => {
  const now = Date.now();
  const hourAgo = (hrs) => new Date(now - hrs * 3600 * 1000).toISOString();
  const minAfter = (iso, mins) => new Date(new Date(iso).getTime() + mins * 60000).toISOString();

  return {
    menu: MENU_DATA.map((item, idx) => ({
      ...item,
      id: item.itemId || `menu_${idx}`,
      isAvailable: true,
      created_at: new Date(now - 86400000).toISOString(),
    })),
    orders: [
      {
        id: 'ord-seed-101',
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
        id: 'ord-seed-102',
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
        id: 'ord-seed-103',
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
    ],
    feedbacks: [
      {
        id: 'fb-seed-1',
        order_id: 'ord-seed-101',
        customerName: 'Aarav',
        rating: 5,
        comment: 'Super hot momos and great cold coffee! Fast service.',
        sentiment: 'positive',
        tags: ['Super Tasty', 'Fast Service'],
        created_at: hourAgo(2.5),
      },
      {
        id: 'fb-seed-2',
        order_id: 'ord-seed-102',
        customerName: 'Priya',
        rating: 5,
        comment: 'Best masala chai near campus, love the token tracker!',
        sentiment: 'positive',
        tags: ['Hot & Fresh', 'Great Vibe'],
        created_at: hourAgo(1.5),
      },
      {
        id: 'fb-seed-3',
        order_id: 'ord-seed-103',
        customerName: 'Rohan',
        rating: 4,
        comment: 'White sauce pasta was creamy and filling.',
        sentiment: 'positive',
        tags: ['Value for Money'],
        created_at: hourAgo(0.7),
      },
    ],
    settings: {
      id: 'default',
      isOpen: true,
      rushMode: false,
      basePrepMinutes: 6,
      announcement: 'Welcome to Chatter & Platter! Fresh chai, momos & Maggi made to order.',
      updated_at: new Date(now).toISOString(),
    },
    staff: [
      { user_id: 'local-owner', email: 'owner@chatterplatter.local', role: 'owner' },
      { user_id: 'local-admin', email: 'admin@chatterplatter.local', role: 'admin' },
      { user_id: 'local-reception', email: 'reception@chatterplatter.local', role: 'reception' },
      { user_id: 'local-chef', email: 'chef@chatterplatter.local', role: 'chef' },
    ],
  };
};

class PersistentCafeStore {
  constructor(dbPath = DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
    this.clients = new Set();
    this.data = this.loadOrInit();
  }

  loadOrInit() {
    try {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.menu) && Array.isArray(parsed.orders)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Rebuilding cafe-db.json due to read error:', err.message);
    }
    const fresh = buildInitialDb();
    this.persist(fresh);
    return fresh;
  }

  persist(nextData = this.data) {
    this.data = nextData;
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    const tmpPath = `${this.dbPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.dbPath);
  }

  broadcast(topic) {
    const payload = `data: ${JSON.stringify({ topic, ts: Date.now() })}\n\n`;
    for (const res of this.clients) {
      try {
        res.write(payload);
      } catch {
        this.clients.delete(res);
      }
    }
  }

  assignUniqueToken() {
    const activeTokens = new Set(
      this.data.orders
        .filter((o) => ['approved', 'cooking', 'ready'].includes(o.status) && o.tokenNumber)
        .map((o) => String(o.tokenNumber))
    );
    const available = [];
    for (let i = 1; i <= 99; i++) {
      if (!activeTokens.has(String(i))) available.push(String(i));
    }
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    return String(Math.floor(Math.random() * 900) + 100);
  }
}

const VALID_STATUSES = new Set([
  'pending_payment',
  'approved',
  'cooking',
  'ready',
  'delivered',
  'completed',
  'cancelled',
]);

const pick = (obj, allowedKeys) => {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
};

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });

export const createCafeDbMiddleware = (dbPath = DEFAULT_DB_PATH) => {
  const store = new PersistentCafeStore(dbPath);

  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      return next();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const pathname = url.pathname;

    try {
      // Health Check
      if (req.method === 'GET' && pathname === '/api/health') {
        return sendJson(res, 200, {
          ok: true,
          engine: 'cafe-disk-db',
          dbFile: 'data/cafe-db.json',
          counts: {
            menu: store.data.menu.length,
            orders: store.data.orders.length,
            feedbacks: store.data.feedbacks.length,
          },
        });
      }

      // Realtime SSE Stream
      if (req.method === 'GET' && pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.write(`data: ${JSON.stringify({ topic: 'connected', ts: Date.now() })}\n\n`);
        store.clients.add(res);
        const keepAlive = setInterval(() => {
          try {
            res.write(': ping\n\n');
          } catch {
            clearInterval(keepAlive);
          }
        }, 20000);
        req.on('close', () => {
          clearInterval(keepAlive);
          store.clients.delete(res);
        });
        return;
      }

      // Staff Directory
      if (req.method === 'GET' && pathname === '/api/staff') {
        return sendJson(res, 200, store.data.staff || []);
      }

      // MENU ROUTES
      if (pathname === '/api/menu' && req.method === 'GET') {
        const sorted = [...store.data.menu].sort(
          (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        );
        return sendJson(res, 200, sorted);
      }

      if (pathname === '/api/menu' && req.method === 'POST') {
        const body = await readBody(req);
        if (body.action === 'seed') {
          const seeded = MENU_DATA.map((item, idx) => ({
            ...item,
            id: item.itemId || `menu_${idx}`,
            isAvailable: true,
            created_at: new Date().toISOString(),
          }));
          store.data.menu = seeded;
          store.persist();
          store.broadcast('menu');
          return sendJson(res, 200, { count: seeded.length, items: seeded });
        }

        const clean = pick(body, [
          'name',
          'price',
          'category',
          'description',
          'tags',
          'isVeg',
          'isEgg',
          'prepMinutes',
          'isAvailable',
          'itemId',
        ]);
        if (!clean.name || Number(clean.price) < 0 || !clean.category) {
          return sendJson(res, 400, { error: 'Invalid menu item payload' });
        }

        const item = {
          ...clean,
          name: String(clean.name).slice(0, 100),
          price: Number(clean.price),
          category: String(clean.category).toUpperCase().slice(0, 30),
          id: clean.itemId || `custom_${Date.now()}`,
          itemId: clean.itemId || `custom_${Date.now()}`,
          isAvailable: clean.isAvailable !== undefined ? Boolean(clean.isAvailable) : true,
          created_at: new Date().toISOString(),
        };
        store.data.menu.unshift(item);
        store.persist();
        store.broadcast('menu');
        return sendJson(res, 201, item);
      }

      if (pathname.startsWith('/api/menu/') && req.method === 'PATCH') {
        const targetId = decodeURIComponent(pathname.replace('/api/menu/', ''));
        const rawPatch = await readBody(req);
        const patch = pick(rawPatch, [
          'name',
          'price',
          'category',
          'description',
          'tags',
          'isVeg',
          'isEgg',
          'prepMinutes',
          'isAvailable',
        ]);
        const idx = store.data.menu.findIndex((m) => m.id === targetId || m.itemId === targetId);
        if (idx === -1) return sendJson(res, 404, { error: 'Menu item not found' });
        store.data.menu[idx] = { ...store.data.menu[idx], ...patch };
        store.persist();
        store.broadcast('menu');
        return sendJson(res, 200, store.data.menu[idx]);
      }

      if (pathname.startsWith('/api/menu/') && req.method === 'DELETE') {
        const targetId = decodeURIComponent(pathname.replace('/api/menu/', ''));
        store.data.menu = store.data.menu.filter((m) => m.id !== targetId && m.itemId !== targetId);
        store.persist();
        store.broadcast('menu');
        return sendJson(res, 200, { deleted: true });
      }

      // ORDERS ROUTES
      if (pathname === '/api/orders' && req.method === 'GET') {
        const statusParam = url.searchParams.get('status');
        let list = [...store.data.orders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        if (statusParam) {
          const allowed = statusParam.split(',').map((s) => s.trim());
          list = list.filter((o) => allowed.includes(o.status));
        }
        return sendJson(res, 200, list);
      }

      if (pathname === '/api/orders' && req.method === 'POST') {
        const body = await readBody(req);
        if (!Array.isArray(body.items) || body.items.length === 0) {
          return sendJson(res, 400, { error: 'Order must contain at least one item' });
        }
        const safeItems = body.items.map((i) => ({
          itemId: String(i.itemId || i.id || ''),
          name: String(i.name || 'Item').slice(0, 100),
          qty: Math.max(1, Math.min(50, Math.floor(Number(i.qty) || 1))),
          price: Math.max(0, Number(i.price) || 0),
          subtotal: Math.max(0, (Number(i.price) || 0) * Math.max(1, Number(i.qty) || 1)),
        }));
        const computedTotal = safeItems.reduce((sum, i) => sum + i.subtotal, 0);
        const order = {
          id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          tableNumber: String(body.tableNumber || 'Takeaway').slice(0, 30),
          customerName: String(body.customerName || 'Guest').slice(0, 50),
          paymentMethod: body.paymentMethod === 'online' ? 'online' : 'cash',
          notes: String(body.notes || '').slice(0, 160),
          estimatedMinutes: Math.max(1, Math.min(90, Number(body.estimatedMinutes) || 8)),
          items: safeItems,
          totalAmount: computedTotal,
          status: 'pending_payment',
          tokenNumber: null,
          createdAt: new Date().toISOString(),
        };
        store.data.orders.unshift(order);
        store.persist();
        store.broadcast('orders');
        return sendJson(res, 201, order);
      }

      const approveMatch = pathname.match(/^\/api\/orders\/([^/]+)\/approve$/);
      if (approveMatch && req.method === 'POST') {
        const orderId = decodeURIComponent(approveMatch[1]);
        const idx = store.data.orders.findIndex((o) => o.id === orderId);
        if (idx === -1) return sendJson(res, 404, { error: 'Order not found' });
        const token = store.assignUniqueToken();
        store.data.orders[idx] = {
          ...store.data.orders[idx],
          status: 'approved',
          tokenNumber: token,
          approvedAt: new Date().toISOString(),
        };
        store.persist();
        store.broadcast('orders');
        return sendJson(res, 200, { tokenNumber: token, order: store.data.orders[idx] });
      }

      if (pathname.startsWith('/api/orders/') && req.method === 'GET') {
        const orderId = decodeURIComponent(pathname.replace('/api/orders/', ''));
        const found = store.data.orders.find((o) => o.id === orderId);
        if (!found) return sendJson(res, 404, { error: 'Order not found' });
        return sendJson(res, 200, found);
      }

      if (pathname.startsWith('/api/orders/') && req.method === 'PATCH') {
        const orderId = decodeURIComponent(pathname.replace('/api/orders/', ''));
        const rawPatch = await readBody(req);
        const patch = pick(rawPatch, [
          'status',
          'tokenNumber',
          'items',
          'totalAmount',
          'notes',
          'approvedAt',
          'cookingAt',
          'readyAt',
          'deliveredAt',
          'cancelledAt',
        ]);
        if (patch.status && !VALID_STATUSES.has(patch.status)) {
          return sendJson(res, 400, { error: 'Invalid order status' });
        }
        const idx = store.data.orders.findIndex((o) => o.id === orderId);
        if (idx === -1) return sendJson(res, 404, { error: 'Order not found' });
        store.data.orders[idx] = { ...store.data.orders[idx], ...patch };
        store.persist();
        store.broadcast('orders');
        return sendJson(res, 200, store.data.orders[idx]);
      }

      // FEEDBACKS ROUTES
      if (pathname === '/api/feedbacks' && req.method === 'GET') {
        const list = [...store.data.feedbacks].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return sendJson(res, 200, list);
      }

      if (pathname === '/api/feedbacks' && req.method === 'POST') {
        const body = await readBody(req);
        const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating) || 5)));
        const fb = {
          id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          order_id: body.order_id ? String(body.order_id).slice(0, 64) : null,
          customerName: String(body.customerName || 'Guest').slice(0, 50),
          rating,
          comment: body.comment ? String(body.comment).slice(0, 500) : null,
          sentiment: ['positive', 'neutral', 'negative'].includes(body.sentiment)
            ? body.sentiment
            : 'positive',
          tags: Array.isArray(body.tags) ? body.tags.slice(0, 8).map(String) : [],
          created_at: new Date().toISOString(),
        };
        store.data.feedbacks.unshift(fb);
        store.persist();
        store.broadcast('feedbacks');
        return sendJson(res, 201, fb);
      }

      // SETTINGS ROUTES
      if (pathname === '/api/settings' && req.method === 'GET') {
        return sendJson(res, 200, store.data.settings);
      }

      if (pathname === '/api/settings' && req.method === 'PATCH') {
        const rawPatch = await readBody(req);
        const patch = pick(rawPatch, ['isOpen', 'rushMode', 'basePrepMinutes', 'announcement']);
        store.data.settings = {
          ...store.data.settings,
          ...patch,
          updated_at: new Date().toISOString(),
        };
        store.persist();
        store.broadcast('settings');
        return sendJson(res, 200, store.data.settings);
      }

      return sendJson(res, 404, { error: 'API route not found' });
    } catch (err) {
      console.error('Cafe DB Server Error:', err);
      return sendJson(res, 500, { error: err.message });
    }
  };
};

export const cafeDbVitePlugin = () => ({
  name: 'chatter-platter-cafe-db',
  configureServer(server) {
    server.middlewares.use(createCafeDbMiddleware());
  },
  configurePreviewServer(server) {
    server.middlewares.use(createCafeDbMiddleware());
  },
});

// Allow running standalone via `node server/cafeDbPlugin.js`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4000);
  const middleware = createCafeDbMiddleware();
  const server = http.createServer((req, res) => {
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`Chatter & Platter Free Cafe DB running on http://localhost:${port}/api/health`);
  });
}


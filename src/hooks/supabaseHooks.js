import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { localDB, subscribeLocalSync, ensureLocalSeeded } from '../data/localDemoEngine';
import { diskDb } from '../data/diskDbClient';
import { firebaseRtdb, isFirebaseRtdbConfigured } from '../data/firebaseRtdbClient';
import { MENU_DATA } from '../data/menuData';
import { analyzeSentiment } from '../utils/smartCafeAI';

// Backends: 'checking' | 'supabase' | 'firebase' | 'disk' | 'local'
let globalModeState = {
  mode: 'checking',
  backendLabel: 'Detecting database...',
  schemaMissing: false,
  reason: 'Checking available database backends...',
  latencyMs: 0,
  checking: true,
};

const modeListeners = new Set();
const notifyModeListeners = () => {
  modeListeners.forEach((fn) => fn({ ...globalModeState }));
};

let activeProbePromise = null;

export const probeDatabaseBackend = async (force = false) => {
  const pref = localDB.getModePreference();
  if (pref === 'local' && !force) {
    ensureLocalSeeded();
    globalModeState = {
      mode: 'local',
      backendLabel: 'Browser Local Mode',
      schemaMissing: false,
      reason: 'Browser LocalStorage + BroadcastChannel active',
      latencyMs: 0,
      checking: false,
    };
    notifyModeListeners();
    return globalModeState;
  }

  if (activeProbePromise && !force) return activeProbePromise;

  globalModeState = { ...globalModeState, checking: true };
  notifyModeListeners();

  activeProbePromise = (async () => {
    const start = Date.now();
    let supabaseReason = '';
    let schemaMissing = false;

    // 1. Try Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase connection timed out (3s)')), 3000)
        );
        const { error } = await Promise.race([
          supabase.from('menu').select('id').limit(1),
          timeoutPromise,
        ]);

        if (!error) {
          globalModeState = {
            mode: 'supabase',
            backendLabel: 'Supabase PostgreSQL',
            schemaMissing: false,
            reason: 'Connected to Supabase PostgreSQL + Realtime',
            latencyMs: Date.now() - start,
            checking: false,
          };
          activeProbePromise = null;
          notifyModeListeners();
          return globalModeState;
        }

        const msg = (error.message || '').toLowerCase();
        schemaMissing =
          error.code === '42P01' ||
          error.code === 'PGRST205' ||
          msg.includes('does not exist') ||
          msg.includes('schema cache');
        supabaseReason = schemaMissing
          ? 'Supabase schema missing (run supabase_schema.sql).'
          : `Supabase unavailable (${error.message}).`;
      } catch (err) {
        supabaseReason = `Supabase unreachable (${err.message || 'offline'}).`;
      }
    } else {
      supabaseReason = 'Supabase not configured.';
    }

    // 2. Try Firebase Realtime Database (Free Forever Spark Plan) if configured
    if (isFirebaseRtdbConfigured) {
      const fbHealth = await firebaseRtdb.checkHealth();
      if (fbHealth?.ok) {
        globalModeState = {
          mode: 'firebase',
          backendLabel: 'Firebase RTDB (Free Cloud)',
          schemaMissing,
          reason: `${supabaseReason} Using free Firebase Realtime DB.`,
          latencyMs: Date.now() - start,
          checking: false,
        };
        activeProbePromise = null;
        notifyModeListeners();
        return globalModeState;
      }
    }

    // 3. Try Built-in Persistent Cafe Disk DB (/api/* -> data/cafe-db.json + SSE)
    const diskHealth = await diskDb.checkHealth();
    if (diskHealth?.ok) {
      globalModeState = {
        mode: 'disk',
        backendLabel: 'Cafe Disk DB (JSON + SSE)',
        schemaMissing,
        reason: `${supabaseReason} Using free persistent disk DB (data/cafe-db.json) with multi-device SSE sync.`,
        latencyMs: Date.now() - start,
        checking: false,
      };
      activeProbePromise = null;
      notifyModeListeners();
      return globalModeState;
    }

    // 4. Final resilient fallback: Browser LocalStorage + BroadcastChannel
    ensureLocalSeeded();
    globalModeState = {
      mode: 'local',
      backendLabel: 'Browser Local Mode',
      schemaMissing,
      reason: `${supabaseReason} Running in browser-local fallback mode.`,
      latencyMs: Date.now() - start,
      checking: false,
    };
    activeProbePromise = null;
    notifyModeListeners();
    return globalModeState;
  })();

  return activeProbePromise;
};

probeDatabaseBackend();

export const useDataMode = () => {
  const [state, setState] = useState({ ...globalModeState });

  useEffect(() => {
    modeListeners.add(setState);
    if (globalModeState.mode === 'checking') {
      probeDatabaseBackend();
    }
    return () => {
      modeListeners.delete(setState);
    };
  }, []);

  const switchToLocalDemo = useCallback(() => {
    localDB.setModePreference('local');
    ensureLocalSeeded();
    globalModeState = {
      mode: 'local',
      backendLabel: 'Browser Local Mode',
      schemaMissing: globalModeState.schemaMissing,
      reason: 'Browser Local Mode active',
      latencyMs: 0,
      checking: false,
    };
    notifyModeListeners();
  }, []);

  const switchToAutoLive = useCallback(async () => {
    localDB.setModePreference('auto');
    return probeDatabaseBackend(true);
  }, []);

  return {
    ...state,
    isSupabase: state.mode === 'supabase',
    isFirebase: state.mode === 'firebase',
    isDiskDb: state.mode === 'disk',
    isLocalMode: state.mode === 'local',
    isLive: state.mode === 'supabase' || state.mode === 'firebase' || state.mode === 'disk',
    recheckConnection: () => probeDatabaseBackend(true),
    switchToLocalDemo,
    switchToAutoLive,
  };
};

export const useAuth = () => {
  const { mode, checking } = useDataMode();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRole = useCallback(async (userId) => {
    try {
      const { data, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching role:', roleError);
      }
      setRole(data?.role || 'staff');
    } catch (err) {
      console.error('Error fetching role:', err);
      setRole('staff');
    }
  }, []);

  useEffect(() => {
    if (checking || mode === 'checking') return undefined;

    if (mode !== 'supabase') {
      const syncDemoAuth = () => {
        const demoRole = localDB.getDemoUserRole();
        if (demoRole) {
          setUser({
            id: `staff-${demoRole}`,
            email: `${demoRole}@chatterplatter.local`,
            isDemo: true,
          });
          setRole(demoRole);
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
      };

      queueMicrotask(syncDemoAuth);
      return subscribeLocalSync((topic) => {
        if (!topic || topic === 'auth' || topic === 'storage') syncDemoAuth();
      });
    }

    let mounted = true;
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (mounted && session?.user) {
          setUser(session.user);
          await fetchRole(session.user.id);
        }
      } catch (err) {
        console.error('Session error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await fetchRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [mode, checking, fetchRole]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      if (mode !== 'supabase') {
        const guessedRole = email.toLowerCase().includes('owner')
          ? 'owner'
          : email.toLowerCase().includes('admin')
          ? 'admin'
          : email.toLowerCase().includes('chef')
          ? 'chef'
          : email.toLowerCase().includes('reception')
          ? 'reception'
          : 'owner';
        localDB.setDemoUserRole(guessedRole);
        setUser({ id: `staff-${guessedRole}`, email, isDemo: true });
        setRole(guessedRole);
        return true;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = (demoRole = 'owner') => {
    localDB.setDemoUserRole(demoRole);
    ensureLocalSeeded();
    setUser({
      id: `staff-${demoRole}`,
      email: `${demoRole}@chatterplatter.local`,
      isDemo: true,
    });
    setRole(demoRole);
    setLoading(false);
    return true;
  };

  const logout = async () => {
    localDB.setDemoUserRole(null);
    setUser(null);
    setRole(null);
    if (mode === 'supabase') {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  };

  return { user, role, loading, error, login, loginDemo, logout };
};

export const useMenu = () => {
  const { mode } = useDataMode();
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMenu = useCallback(async () => {
    if (mode === 'checking') return;

    if (mode === 'local') {
      setMenu(localDB.getMenu());
      setLoading(false);
      return;
    }

    if (mode === 'disk') {
      try {
        const data = await diskDb.getMenu();
        setMenu(data || []);
      } catch (err) {
        console.error('Disk DB menu error:', err);
        setMenu(localDB.getMenu());
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'firebase') {
      try {
        const data = await firebaseRtdb.getMenu();
        setMenu(data || []);
      } catch (err) {
        console.error('Firebase menu error:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('menu')
        .select('*')
        .order('category')
        .order('name');
      if (error) throw error;
      setMenu(data || []);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setMenu(localDB.getMenu());
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'checking') return undefined;
    queueMicrotask(loadMenu);

    if (mode === 'local') {
      return subscribeLocalSync((topic) => {
        if (!topic || topic === 'menu' || topic === 'storage') {
          setMenu(localDB.getMenu());
        }
      });
    }

    if (mode === 'disk') {
      return diskDb.subscribe((topic) => {
        if (topic === 'menu') loadMenu();
      });
    }

    if (mode === 'firebase') {
      return firebaseRtdb.subscribe('menu', loadMenu);
    }

    const channel = supabase
      .channel(`menu_changes_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, loadMenu)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, loadMenu]);

  const toggleMenuItemAvailability = async (menuId, currentStatus) => {
    const nextStatus = !currentStatus;
    setMenu((prev) =>
      prev.map((item) =>
        item.id === menuId || item.itemId === menuId ? { ...item, isAvailable: nextStatus } : item
      )
    );

    if (mode === 'local') {
      const updated = localDB.getMenu().map((item) =>
        item.id === menuId || item.itemId === menuId ? { ...item, isAvailable: nextStatus } : item
      );
      localDB.setMenu(updated);
      return;
    }

    if (mode === 'disk') {
      await diskDb.updateMenuItem(menuId, { isAvailable: nextStatus });
      return;
    }

    if (mode === 'firebase') {
      await firebaseRtdb.updateMenuItem(menuId, { isAvailable: nextStatus });
      return;
    }

    try {
      const { error } = await supabase
        .from('menu')
        .update({ isAvailable: nextStatus })
        .eq('id', menuId);
      if (error) throw error;
    } catch (err) {
      console.error('Error toggling menu item:', err);
      loadMenu();
      throw err;
    }
  };

  const addMenuItem = async (itemInput) => {
    const payload = {
      name: itemInput.name.trim(),
      price: Number(itemInput.price),
      category: itemInput.category.trim().toUpperCase(),
      description: (itemInput.description || '').trim(),
      isVeg: itemInput.isVeg !== undefined ? Boolean(itemInput.isVeg) : true,
      isEgg: Boolean(itemInput.isEgg),
      prepMinutes: Number(itemInput.prepMinutes) || 6,
      tags: Array.isArray(itemInput.tags) ? itemInput.tags : [],
      itemId: `custom_${Date.now()}`,
      isAvailable: true,
    };

    if (mode === 'local') {
      const current = localDB.getMenu();
      const created = { ...payload, id: payload.itemId, created_at: new Date().toISOString() };
      localDB.setMenu([created, ...current]);
      setMenu([created, ...current]);
      return created;
    }

    if (mode === 'disk') {
      const created = await diskDb.addMenuItem(payload);
      await loadMenu();
      return created;
    }

    if (mode === 'firebase') {
      const created = await firebaseRtdb.addMenuItem(payload);
      await loadMenu();
      return created;
    }

    const { data, error } = await supabase.from('menu').insert([payload]).select().single();
    if (error) throw error;
    await loadMenu();
    return data;
  };

  const deleteMenuItem = async (id) => {
    if (mode === 'local') {
      const filtered = localDB.getMenu().filter((i) => i.id !== id && i.itemId !== id);
      localDB.setMenu(filtered);
      setMenu(filtered);
      return;
    }

    if (mode === 'disk') {
      await diskDb.deleteMenuItem(id);
      await loadMenu();
      return;
    }

    if (mode === 'firebase') {
      await firebaseRtdb.deleteMenuItem(id);
      await loadMenu();
      return;
    }

    const { error } = await supabase.from('menu').delete().eq('id', id);
    if (error) throw error;
    await loadMenu();
  };

  const syncSeedMenu = async () => {
    const menuWithIds = MENU_DATA.map((item, index) => ({
      ...item,
      itemId: item.itemId || `menu_${index}`,
      isAvailable: true,
    }));

    if (mode === 'local') {
      const seeded = localDB.resetMenuToDefault();
      setMenu(seeded);
      return seeded.length;
    }

    if (mode === 'disk') {
      const res = await diskDb.seedMenu();
      await loadMenu();
      return res.count;
    }

    if (mode === 'firebase') {
      const seeded = await firebaseRtdb.seedMenu();
      await loadMenu();
      return seeded.length;
    }

    const { error } = await supabase.from('menu').upsert(menuWithIds, { onConflict: 'itemId' });
    if (error) throw error;
    await loadMenu();
    return menuWithIds.length;
  };

  return {
    menu,
    loading,
    toggleMenuItemAvailability,
    addMenuItem,
    deleteMenuItem,
    syncSeedMenu,
    refetch: loadMenu,
  };
};

export const useOrders = (statusFilter = null) => {
  const { mode } = useDataMode();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const filterKey = Array.isArray(statusFilter) ? statusFilter.join(',') : statusFilter || '';

  const applyFilter = useCallback(
    (data) => {
      if (!filterKey) return data;
      const allowed = filterKey.split(',');
      return data.filter((o) => allowed.includes(o.status));
    },
    [filterKey]
  );

  const loadOrders = useCallback(async () => {
    if (mode === 'checking') return;

    if (mode === 'local') {
      setOrders(applyFilter(localDB.getOrders()));
      setLoading(false);
      return;
    }

    if (mode === 'disk') {
      try {
        const data = await diskDb.getOrders(filterKey);
        setOrders(data || []);
      } catch (err) {
        console.error('Disk DB orders error:', err);
        setOrders(applyFilter(localDB.getOrders()));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'firebase') {
      try {
        const data = await firebaseRtdb.getOrders(filterKey);
        setOrders(data || []);
      } catch (err) {
        console.error('Firebase orders error:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      let query = supabase.from('orders').select('*').order('createdAt', { ascending: false });
      if (filterKey) {
        const allowed = filterKey.split(',');
        if (allowed.length > 1) query = query.in('status', allowed);
        else query = query.eq('status', allowed[0]);
      }
      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders(applyFilter(localDB.getOrders()));
    } finally {
      setLoading(false);
    }
  }, [mode, filterKey, applyFilter]);

  useEffect(() => {
    if (mode === 'checking') return undefined;
    queueMicrotask(loadOrders);

    if (mode === 'local') {
      return subscribeLocalSync((topic) => {
        if (!topic || topic === 'orders' || topic === 'storage') {
          setOrders(applyFilter(localDB.getOrders()));
        }
      });
    }

    if (mode === 'disk') {
      const unsub = diskDb.subscribe((topic) => {
        if (topic === 'orders') loadOrders();
      });
      const poll = setInterval(loadOrders, 5000);
      return () => {
        unsub();
        clearInterval(poll);
      };
    }

    if (mode === 'firebase') {
      const unsub = firebaseRtdb.subscribe('orders', loadOrders);
      const poll = setInterval(loadOrders, 5000);
      return () => {
        unsub();
        clearInterval(poll);
      };
    }

    const channel = supabase
      .channel(`orders_changes_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders)
      .subscribe();

    const pollInterval = setInterval(loadOrders, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [mode, loadOrders, applyFilter]);

  const placeOrder = async (orderData) => {
    const newOrder = {
      ...orderData,
      status: 'pending_payment',
      tokenNumber: null,
      notes: orderData.notes || '',
      estimatedMinutes: orderData.estimatedMinutes || 8,
    };

    if (mode === 'local') {
      const created = {
        ...newOrder,
        id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      const all = localDB.getOrders();
      localDB.setOrders([created, ...all]);
      setOrders((prev) => [created, ...prev]);
      return created.id;
    }

    if (mode === 'disk') {
      const created = await diskDb.createOrder(newOrder);
      setOrders((prev) => [created, ...prev]);
      return created.id;
    }

    if (mode === 'firebase') {
      const created = await firebaseRtdb.createOrder(newOrder);
      setOrders((prev) => [created, ...prev]);
      return created.id;
    }

    const { data, error } = await supabase.from('orders').insert([newOrder]).select().single();
    if (error) throw error;
    setOrders((prev) => [data, ...prev]);
    return data.id;
  };

  const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
    const tsField = `${newStatus}At`;
    const nowIso = new Date().toISOString();
    const patch = {
      status: newStatus,
      ...extraData,
      [tsField]: nowIso,
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));

    if (mode === 'local') {
      const next = localDB.getOrders().map((o) => (o.id === orderId ? { ...o, ...patch } : o));
      localDB.setOrders(next);
      return;
    }

    if (mode === 'disk') {
      await diskDb.updateOrder(orderId, patch);
      return;
    }

    if (mode === 'firebase') {
      await firebaseRtdb.updateOrder(orderId, patch);
      return;
    }

    try {
      const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating order status:', err);
      loadOrders();
      throw err;
    }
  };

  const pickTokenNumber = (allOrders) => {
    const activeTokens = new Set(
      allOrders
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
  };

  const approveOrderAndAssignToken = async (orderId) => {
    if (mode === 'disk') {
      const { tokenNumber, order } = await diskDb.approveOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
      return tokenNumber;
    }

    const allOrdersForToken = mode === 'firebase' ? await firebaseRtdb.getOrders() : orders;
    const token = pickTokenNumber(allOrdersForToken);
    const nowIso = new Date().toISOString();

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: 'approved', tokenNumber: token, approvedAt: nowIso } : o
      )
    );

    if (mode === 'local') {
      const next = localDB.getOrders().map((o) =>
        o.id === orderId ? { ...o, status: 'approved', tokenNumber: token, approvedAt: nowIso } : o
      );
      localDB.setOrders(next);
      return token;
    }

    if (mode === 'firebase') {
      await firebaseRtdb.updateOrder(orderId, {
        status: 'approved',
        tokenNumber: token,
        approvedAt: nowIso,
      });
      return token;
    }

    try {
      const { data: rpcToken, error: rpcError } = await supabase.rpc('approve_order_with_token', {
        p_order_id: orderId,
      });

      if (!rpcError && rpcToken) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: 'approved', tokenNumber: String(rpcToken), approvedAt: nowIso }
              : o
          )
        );
        return String(rpcToken);
      }

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'approved',
          tokenNumber: token,
          approvedAt: nowIso,
        })
        .eq('id', orderId);

      if (error) throw error;
      return token;
    } catch (err) {
      console.error('Error approving order:', err);
      loadOrders();
      throw err;
    }
  };

  const updateOrderItems = async (orderId, newItems) => {
    const updatedItems = newItems.map((item) => ({
      ...item,
      subtotal: (item.price || 0) * (item.qty || 1),
    }));
    const newTotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, items: updatedItems, totalAmount: newTotal } : o
      )
    );

    if (mode === 'local') {
      const next = localDB.getOrders().map((o) =>
        o.id === orderId ? { ...o, items: updatedItems, totalAmount: newTotal } : o
      );
      localDB.setOrders(next);
      return;
    }

    if (mode === 'disk') {
      await diskDb.updateOrder(orderId, { items: updatedItems, totalAmount: newTotal });
      return;
    }

    if (mode === 'firebase') {
      await firebaseRtdb.updateOrder(orderId, { items: updatedItems, totalAmount: newTotal });
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ items: updatedItems, totalAmount: newTotal })
        .eq('id', orderId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating order items:', err);
      loadOrders();
      throw err;
    }
  };

  const revertOrderToPending = async (orderId) =>
    updateOrderStatus(orderId, 'pending_payment', { tokenNumber: null });

  const cancelOrder = async (orderId) => updateOrderStatus(orderId, 'cancelled');

  return {
    orders,
    loading,
    placeOrder,
    updateOrderStatus,
    approveOrderAndAssignToken,
    updateOrderItems,
    revertOrderToPending,
    cancelOrder,
    refetch: loadOrders,
  };
};

export const useOrder = (orderId) => {
  const { mode } = useDataMode();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }
    if (mode === 'checking') return;

    if (mode === 'local') {
      setOrder(localDB.getOrders().find((o) => o.id === orderId) || null);
      setLoading(false);
      return;
    }

    if (mode === 'disk') {
      try {
        const found = await diskDb.getOrder(orderId);
        setOrder(found || null);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'firebase') {
      try {
        const found = await firebaseRtdb.getOrder(orderId);
        setOrder(found || null);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setOrder(data || null);
    } catch (err) {
      console.error('Error fetching single order:', err);
      setOrder(localDB.getOrders().find((o) => o.id === orderId) || null);
    } finally {
      setLoading(false);
    }
  }, [orderId, mode]);

  useEffect(() => {
    if (mode === 'checking') return undefined;
    queueMicrotask(loadOrder);

    if (!orderId) return undefined;

    if (mode === 'local') {
      return subscribeLocalSync((topic) => {
        if (!topic || topic === 'orders' || topic === 'storage') {
          setOrder(localDB.getOrders().find((o) => o.id === orderId) || null);
        }
      });
    }

    if (mode === 'disk') {
      const unsub = diskDb.subscribe((topic) => {
        if (topic === 'orders') loadOrder();
      });
      const poll = setInterval(loadOrder, 3000);
      return () => {
        unsub();
        clearInterval(poll);
      };
    }

    if (mode === 'firebase') {
      const unsub = firebaseRtdb.subscribe(`orders/${orderId}`, loadOrder);
      const poll = setInterval(loadOrder, 3000);
      return () => {
        unsub();
        clearInterval(poll);
      };
    }

    const channel = supabase
      .channel(`order_${orderId}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        loadOrder
      )
      .subscribe();

    const pollInterval = setInterval(loadOrder, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [orderId, mode, loadOrder]);

  const cancelCurrentOrder = async () => {
    if (!orderId) return;
    const patch = { status: 'cancelled', cancelledAt: new Date().toISOString() };

    if (mode === 'local') {
      const next = localDB.getOrders().map((o) => (o.id === orderId ? { ...o, ...patch } : o));
      localDB.setOrders(next);
      setOrder((prev) => (prev ? { ...prev, ...patch } : prev));
      return;
    }

    if (mode === 'disk') {
      await diskDb.updateOrder(orderId, patch);
      setOrder((prev) => (prev ? { ...prev, ...patch } : prev));
      return;
    }

    if (mode === 'firebase') {
      await firebaseRtdb.updateOrder(orderId, patch);
      setOrder((prev) => (prev ? { ...prev, ...patch } : prev));
      return;
    }

    const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
    if (error) throw error;
    await loadOrder();
  };

  return { order, loading, cancelCurrentOrder, refetch: loadOrder };
};

export const useFeedbacks = () => {
  const { mode } = useDataMode();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFeedbacks = useCallback(async () => {
    if (mode === 'checking') return;

    if (mode === 'local') {
      setFeedbacks(localDB.getFeedbacks());
      setLoading(false);
      return;
    }

    if (mode === 'disk') {
      try {
        const data = await diskDb.getFeedbacks();
        setFeedbacks(data || []);
      } catch {
        setFeedbacks(localDB.getFeedbacks());
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'firebase') {
      try {
        const data = await firebaseRtdb.getFeedbacks();
        setFeedbacks(data || []);
      } catch (err) {
        console.error('Firebase feedbacks error:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
      setFeedbacks(localDB.getFeedbacks());
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'checking') return undefined;
    queueMicrotask(loadFeedbacks);

    if (mode === 'local') {
      return subscribeLocalSync((topic) => {
        if (!topic || topic === 'feedbacks' || topic === 'storage') {
          setFeedbacks(localDB.getFeedbacks());
        }
      });
    }

    if (mode === 'disk') {
      return diskDb.subscribe((topic) => {
        if (topic === 'feedbacks') loadFeedbacks();
      });
    }

    if (mode === 'firebase') {
      return firebaseRtdb.subscribe('feedbacks', loadFeedbacks);
    }

    const channel = supabase
      .channel(`feedbacks_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, loadFeedbacks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, loadFeedbacks]);

  const submitFeedback = async ({ orderId, customerName, rating, comment, tags = [] }) => {
    const sentiment = analyzeSentiment(rating, comment || '');
    const payload = {
      order_id: orderId || null,
      customerName: customerName || 'Guest',
      rating,
      comment: comment || null,
      sentiment,
      tags,
    };

    if (mode === 'local') {
      return localDB.addFeedback(payload);
    }

    if (mode === 'disk') {
      const created = await diskDb.addFeedback(payload);
      await loadFeedbacks();
      return created;
    }

    if (mode === 'firebase') {
      const created = await firebaseRtdb.addFeedback(payload);
      await loadFeedbacks();
      return created;
    }

    const { error } = await supabase.from('feedbacks').insert([payload]);
    if (error) {
      const { error: minimalError } = await supabase.from('feedbacks').insert([
        { rating, comment: comment || null },
      ]);
      if (minimalError) throw minimalError;
    }
    await loadFeedbacks();
  };

  return { feedbacks, loading, submitFeedback, refetch: loadFeedbacks };
};

export const useCafeSettings = () => {
  const { mode } = useDataMode();
  const [settings, setSettings] = useState({
    id: 'default',
    isOpen: true,
    rushMode: false,
    basePrepMinutes: 6,
    announcement: 'Welcome to Chatter & Platter! Fresh chai, momos & Maggi made to order.',
  });

  const loadSettings = useCallback(async () => {
    if (mode === 'checking') return;

    if (mode === 'local') {
      setSettings(localDB.getSettings());
      return;
    }

    if (mode === 'disk') {
      try {
        const data = await diskDb.getSettings();
        if (data) setSettings(data);
      } catch {
        /* ignore */
      }
      return;
    }

    if (mode === 'firebase') {
      try {
        const data = await firebaseRtdb.getSettings();
        if (data) setSettings(data);
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cafe_settings')
        .select('*')
        .eq('id', 'default')
        .single();
      if (!error && data) setSettings(data);
    } catch {
      /* ignore if optional */
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'checking') return undefined;
    queueMicrotask(loadSettings);

    if (mode === 'local') {
      return subscribeLocalSync((topic) => {
        if (!topic || topic === 'settings' || topic === 'storage') {
          setSettings(localDB.getSettings());
        }
      });
    }

    if (mode === 'disk') {
      return diskDb.subscribe((topic) => {
        if (topic === 'settings') loadSettings();
      });
    }

    if (mode === 'firebase') {
      return firebaseRtdb.subscribe('settings', loadSettings);
    }

    const channel = supabase
      .channel(`settings_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_settings' },
        loadSettings
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, loadSettings]);

  const updateSettings = async (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    if (mode === 'local') {
      localDB.updateSettings(patch);
      return;
    }
    if (mode === 'disk') {
      await diskDb.updateSettings(patch);
      return;
    }
    if (mode === 'firebase') {
      await firebaseRtdb.updateSettings(patch);
      return;
    }
    try {
      await supabase.from('cafe_settings').upsert({ id: 'default', ...settings, ...patch });
    } catch (err) {
      console.error('Settings update error:', err);
    }
  };

  return { settings, updateSettings };
};

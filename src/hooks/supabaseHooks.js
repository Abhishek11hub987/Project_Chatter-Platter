import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get initial session
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          setUser(session.user);
          await fetchRole(session.user.id);
        }
      } catch (err) {
        console.error('Session error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching role:', error);
      }
      
      setRole(data?.role || 'staff'); // fallback to basic staff
    } catch (err) {
      console.error('Error fetching role:', err);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { user, role, loading, error, login, logout };
};

export const useMenu = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMenu = async () => {
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
      } finally {
        setLoading(false);
      }
    };

    loadMenu();

    // Subscribe to realtime updates
    const channel = supabase.channel(`menu_changes_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, (payload) => {
        loadMenu();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleMenuItemAvailability = async (menuId, currentStatus) => {
    // Optimistic local update
    setMenu(prev => prev.map(item => 
      item.id === menuId || item.itemId === menuId 
        ? { ...item, isAvailable: !currentStatus } 
        : item
    ));

    try {
      const { error } = await supabase
        .from('menu')
        .update({ isAvailable: !currentStatus })
        // handle both id or itemId depending on seed data structure
        .or(`id.eq.${menuId},itemId.eq.${menuId}`);

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling menu item:', err);
      // Revert on failure
      const { data } = await supabase.from('menu').select('*').order('category').order('name');
      if (data) setMenu(data);
      throw err;
    }
  };

  return { menu, loading, toggleMenuItemAvailability };
};

export const useOrders = (statusFilter = null) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('createdAt', { ascending: false });

      if (statusFilter) {
        if (Array.isArray(statusFilter)) {
          query = query.in('status', statusFilter);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const channel = supabase.channel(`orders_changes_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders();
      })
      .subscribe();

    const pollInterval = setInterval(loadOrders, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [statusFilter]);

  const placeOrder = async (orderData) => {
    try {
      const newOrder = {
        ...orderData,
        status: 'pending_payment',
        tokenNumber: null,
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([newOrder])
        .select()
        .single();

      if (error) throw error;
      // Optimistic: add the new order to local state instantly
      setOrders(prev => [data, ...prev]);
      return data.id;
    } catch (err) {
      console.error('Error placing order:', err);
      throw err;
    }
  };

  const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
    // Optimistic: update the order in local state INSTANTLY
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: newStatus, ...extraData, [`${newStatus}At`]: new Date().toISOString() }
        : o
    ));

    try {
      const updatePayload = {
        status: newStatus,
        ...extraData,
        [`${newStatus}At`]: new Date().toISOString()
      };

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating order status:', err);
      // Revert on failure by refetching
      loadOrders();
      throw err;
    }
  };

  const approveOrderAndAssignToken = async (orderId) => {
    // Generate a random number from 1-99 that is not currently active
    const activeTokens = orders
      .filter(o => ['approved', 'cooking', 'ready'].includes(o.status) && o.tokenNumber)
      .map(o => String(o.tokenNumber));

    let token = '';
    const availableTokens = [];
    for (let i = 1; i <= 99; i++) {
      if (!activeTokens.includes(String(i))) {
        availableTokens.push(String(i));
      }
    }

    if (availableTokens.length > 0) {
      token = availableTokens[Math.floor(Math.random() * availableTokens.length)];
    } else {
      // Fallback if >99 active orders
      token = String(Math.floor(Math.random() * 900) + 100); 
    }

    // Optimistic: immediately move to approved with the token
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: 'approved', tokenNumber: token, approvedAt: new Date().toISOString() }
        : o
    ));

    try {
      const updatePayload = {
        status: 'approved',
        tokenNumber: token,
        approvedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (error) throw error;
    } catch (err) {
      console.error('Error approving order:', err);
      loadOrders();
      throw err;
    }
  };

  const updateOrderItems = async (orderId, newItems) => {
    // Recalculate subtotal for each item and overall total
    const updatedItems = newItems.map(item => ({
      ...item,
      subtotal: (item.price || 0) * (item.qty || 1)
    }));
    const newTotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Optimistic local update
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, items: updatedItems, totalAmount: newTotal }
        : o
    ));

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

  const refetch = () => loadOrders();

  return { orders, loading, placeOrder, updateOrderStatus, approveOrderAndAssignToken, updateOrderItems, refetch };
};

export const useOrder = (orderId) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setOrder(null);
      return;
    }

    const loadOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // ignore no rows error
        setOrder(data || null);
      } catch (err) {
        console.error('Error fetching single order:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();

    const channel = supabase.channel(`order_${orderId}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, () => {
        loadOrder();
      })
      .subscribe();

    // Polling fallback: refresh every 3 seconds
    const pollInterval = setInterval(loadOrder, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [orderId]);

  return { order, loading };
};

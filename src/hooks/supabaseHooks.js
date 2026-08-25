import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

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
    const channel = supabase.channel('menu_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, (payload) => {
        loadMenu();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { menu, loading };
};

export const useOrders = (statusFilter = null) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    loadOrders();

    const channel = supabase.channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      return data.id;
    } catch (err) {
      console.error('Error placing order:', err);
      throw err;
    }
  };

  const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
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
      throw err;
    }
  };

  const approveOrderAndAssignToken = async (orderId) => {
    try {
      // We will call a Postgres RPC function to safely increment the token number
      const { data: tokenNumber, error: rpcError } = await supabase
        .rpc('get_next_token');

      if (rpcError) throw rpcError;

      const updatePayload = {
        status: 'approved',
        tokenNumber: tokenNumber,
        approvedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (error) throw error;
    } catch (err) {
      console.error('Error approving order:', err);
      throw err;
    }
  };

  return { orders, loading, placeOrder, updateOrderStatus, approveOrderAndAssignToken };
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

    const channel = supabase.channel(`order_${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
        loadOrder();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { order, loading };
};

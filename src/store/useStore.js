import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // Customer State
      tableNumber: null,
      setTableNumber: (table) => set({ tableNumber: table }),

      customerName: '',
      setCustomerName: (name) => set({ customerName: name }),

      orderNotes: '',
      setOrderNotes: (notes) => set({ orderNotes: notes }),

      soundEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

      cart: [],
      addToCart: (item) =>
        set((state) => {
          const id = item.itemId || item.id;
          const existing = state.cart.find((i) => String(i.itemId || i.id) === String(id));
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                String(i.itemId || i.id) === String(id)
                  ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price }
                  : i
              ),
            };
          }
          return {
            cart: [...state.cart, { ...item, itemId: id, qty: 1, subtotal: item.price }],
          };
        }),
      addMultipleToCart: (items) =>
        set((state) => {
          let nextCart = [...state.cart];
          items.forEach((item) => {
            const id = item.itemId || item.id;
            const existingIdx = nextCart.findIndex((i) => String(i.itemId || i.id) === String(id));
            if (existingIdx > -1) {
              const curr = nextCart[existingIdx];
              const newQty = curr.qty + (item.qty || 1);
              nextCart[existingIdx] = { ...curr, qty: newQty, subtotal: newQty * curr.price };
            } else {
              const qty = item.qty || 1;
              nextCart.push({ ...item, itemId: id, qty, subtotal: qty * item.price });
            }
          });
          return { cart: nextCart };
        }),
      removeFromCart: (itemId) =>
        set((state) => ({
          cart: state.cart.filter((i) => String(i.itemId || i.id) !== String(itemId)),
        })),
      updateQuantity: (itemId, delta) =>
        set((state) => ({
          cart: state.cart
            .map((i) => {
              if (String(i.itemId || i.id) === String(itemId)) {
                const newQty = Math.max(0, i.qty + delta);
                return { ...i, qty: newQty, subtotal: newQty * i.price };
              }
              return i;
            })
            .filter((i) => i.qty > 0),
        })),
      clearCart: () => set({ cart: [], orderNotes: '' }),

      activeOrderId: localStorage.getItem('chatter_platter_active_order') || null,
      setActiveOrderId: (id) => {
        if (id) {
          localStorage.setItem('chatter_platter_active_order', id);
        } else {
          localStorage.removeItem('chatter_platter_active_order');
        }
        set({ activeOrderId: id });
      },

      // Staff PIN State (for /?role=reception and /?role=chef routes)
      role: null,
      setRole: (role) => set({ role }),

      isAuthenticated: false,
      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'chatter-platter-storage',
      partialize: (state) => ({
        cart: state.cart,
        tableNumber: state.tableNumber,
        customerName: state.customerName,
        orderNotes: state.orderNotes,
        activeOrderId: state.activeOrderId,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);

export default useStore;

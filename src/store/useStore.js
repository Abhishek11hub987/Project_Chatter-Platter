import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
  // Customer State
  tableNumber: null,
  setTableNumber: (table) => set({ tableNumber: table }),
  
  cart: [],
  addToCart: (item) => set((state) => {
    const id = item.itemId || item.id;
    const existing = state.cart.find(i => i.itemId === id);
    if (existing) {
      return {
        cart: state.cart.map(i => 
          i.itemId === id 
            ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price } 
            : i
        )
      };
    }
    return { cart: [...state.cart, { ...item, itemId: id, qty: 1, subtotal: item.price }] };
  }),
  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter(i => (i.itemId || i.id) !== itemId)
  })),
  updateQuantity: (itemId, delta) => set((state) => {
    return {
      cart: state.cart.map(i => {
        if ((i.itemId || i.id) === itemId) {
          const newQty = Math.max(0, i.qty + delta);
          return { ...i, qty: newQty, subtotal: newQty * i.price };
        }
        return i;
      }).filter(i => i.qty > 0)
    };
  }),
  clearCart: () => set({ cart: [] }),
  
  activeOrderId: localStorage.getItem('chatter_platter_active_order') || null,
  setActiveOrderId: (id) => {
    if (id) {
      localStorage.setItem('chatter_platter_active_order', id);
    } else {
      localStorage.removeItem('chatter_platter_active_order');
    }
    set({ activeOrderId: id });
  },

  // Staff State
  role: null, // 'customer', 'reception', 'chef'
  setRole: (role) => set({ role }),
  
  isAuthenticated: false,
  login: () => set({ isAuthenticated: true }),
  logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'chatter-platter-storage', // unique name
      partialize: (state) => ({ 
        cart: state.cart, 
        tableNumber: state.tableNumber,
        activeOrderId: state.activeOrderId
      }),
    }
  )
);

export default useStore;

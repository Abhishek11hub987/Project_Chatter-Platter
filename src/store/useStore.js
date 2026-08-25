import { create } from 'zustand';

const useStore = create((set) => ({
  // Customer State
  tableNumber: null,
  setTableNumber: (table) => set({ tableNumber: table }),
  
  cart: [],
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(i => i.itemId === item.itemId);
    if (existing) {
      return {
        cart: state.cart.map(i => 
          i.itemId === item.itemId 
            ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price } 
            : i
        )
      };
    }
    return { cart: [...state.cart, { ...item, qty: 1, subtotal: item.price }] };
  }),
  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter(i => i.itemId !== itemId)
  })),
  updateQuantity: (itemId, delta) => set((state) => {
    return {
      cart: state.cart.map(i => {
        if (i.itemId === itemId) {
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
}));

export default useStore;

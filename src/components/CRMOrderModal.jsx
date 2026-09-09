import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu, useOrders } from '../hooks/supabaseHooks';

const CATEGORIES = ['HOT', 'COLD', 'MOMO', 'FRIES', 'PASTA', 'MAGGI', 'SANDWICH'];

const CRMOrderModal = ({ onClose }) => {
  const { menu, loading: menuLoading } = useMenu();
  const { placeOrder, approveOrderAndAssignToken } = useOrders();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [cart, setCart] = useState([]);
  
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('Takeaway');
  const [isPlacing, setIsPlacing] = useState(false);

  const filteredMenu = menu.filter(item => item.category === activeCategory);
  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleAddItem = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price } : i
        );
      }
      return [...prev, { ...item, qty: 1, subtotal: item.price }];
    });
  };

  const handleUpdateQty = (itemId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(0, i.qty + delta);
        return { ...i, qty: newQty, subtotal: newQty * i.price };
      }
      return i;
    }).filter(i => i.qty > 0));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return alert('Cart is empty!');
    if (!customerName.trim()) return alert('Please enter a customer name!');
    
    setIsPlacing(true);
    try {
      // 1. Place order (starts as pending_payment)
      const orderId = await placeOrder({
        tableNumber: tableNumber,
        customerName: customerName.trim(),
        paymentMethod: 'cash', // Assumed manual CRM orders are cash/handled at desk
        items: cart.map(i => ({
          itemId: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal
        })),
        totalAmount,
      });
      
      // 2. Instantly approve and assign token so it goes straight to chef
      await approveOrderAndAssignToken(orderId);
      
      alert('Walk-in Order Placed Successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to place order.');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-gray-50 w-full max-w-2xl h-full shadow-2xl flex flex-col"
      >
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black">New Walk-in Order</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Reception CRM</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200">✕</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Menu Selection */}
          <div className="flex-1 flex flex-col border-r bg-white overflow-hidden">
            <div className="flex overflow-x-auto hide-scrollbar gap-2 p-3 border-b shrink-0">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${activeCategory === cat ? 'bg-primary text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {menuLoading ? <p className="text-center p-4 text-gray-400">Loading menu...</p> : (
                filteredMenu.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    disabled={!item.isAvailable}
                    className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-colors active:scale-[0.98] ${!item.isAvailable ? 'opacity-50 bg-gray-50' : 'bg-white hover:border-primary'}`}
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-800">{item.name}</div>
                      <div className="text-xs font-bold text-primary-dark mt-0.5">₹{item.price}</div>
                    </div>
                    {!item.isAvailable ? (
                      <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-1 rounded">Out</span>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-50 border flex items-center justify-center text-gray-400 font-bold">+</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Cart & Checkout */}
          <div className="w-full md:w-72 bg-gray-50 flex flex-col shrink-0 border-t md:border-t-0">
            <div className="p-4 space-y-3 bg-white border-b shrink-0">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Name *</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm font-bold focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Table / Status</label>
                <input 
                  type="text" 
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  placeholder="e.g. 12 or Takeaway"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm font-bold focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Order</h3>
              <AnimatePresence>
                {cart.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-10 font-medium">Cart is empty.<br/>Tap items to add.</p>
                ) : cart.map(item => (
                  <motion.div key={item.id} layout initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-xs text-gray-800 leading-tight pr-2">{item.name}</span>
                      <span className="font-bold text-xs text-primary-dark shrink-0">₹{item.subtotal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-gray-100 rounded-md">
                        <button onClick={() => handleUpdateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center font-bold text-gray-600">-</button>
                        <span className="w-6 text-center text-xs font-black">{item.qty}</span>
                        <button onClick={() => handleUpdateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center font-bold text-gray-600">+</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="p-4 bg-white border-t shrink-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Total</span>
                <span className="text-xl font-black text-gray-900">₹{totalAmount}</span>
              </div>
              <button 
                onClick={handleSubmit}
                disabled={isPlacing || cart.length === 0}
                className="w-full bg-primary text-black font-black uppercase tracking-wider py-3.5 rounded-xl disabled:opacity-50 transition-transform active:scale-95"
              >
                {isPlacing ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CRMOrderModal;

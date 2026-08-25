import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trash2, Plus, Minus, AlertCircle, ShoppingBag } from 'lucide-react';
import useStore from '../../store/useStore';
import { useOrders } from '../../hooks/supabaseHooks';

const Cart = ({ onBack, onOrderPlaced }) => {
  const cart = useStore(state => state.cart);
  const tableNumber = useStore(state => state.tableNumber);
  const updateQuantity = useStore(state => state.updateQuantity);
  const removeFromCart = useStore(state => state.removeFromCart);
  const clearCart = useStore(state => state.clearCart);
  const setActiveOrderId = useStore(state => state.setActiveOrderId);
  
  const { placeOrder } = useOrders();
  const [isPlacing, setIsPlacing] = useState(false);

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isPlacing) return;
    
    setIsPlacing(true);
    try {
      const orderId = await placeOrder({
        tableNumber: tableNumber || "Takeaway",
        items: cart.map(i => ({
          itemId: i.itemId,
          name: i.name,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal
        })),
        totalAmount,
      });
      
      setActiveOrderId(orderId);
      clearCart();
      onOrderPlaced();
    } catch (error) {
      console.error("Failed to place order:", error);
      alert("Error placing order: " + (error.message || JSON.stringify(error)));
      setIsPlacing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white px-4 py-6 shadow-sm flex items-center justify-between z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-extrabold text-xl tracking-tight">YOUR ORDER</h2>
        <div className="w-10" />
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {cart.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="font-medium">Your cart is empty.</p>
          </div>
        ) : (
          <AnimatePresence>
            {cart.map(item => (
              <motion.div
                key={item.itemId}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 border border-gray-100"
              >
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">{item.name}</h4>
                  <p className="text-primary-dark font-bold mt-1">₹{item.price}</p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center bg-gray-100 rounded-full p-1 gap-2">
                    <button 
                      onClick={() => updateQuantity(item.itemId, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold w-4 text-center text-sm">{item.qty}</span>
                    <button 
                      onClick={() => updateQuantity(item.itemId, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-black shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.itemId)}
                    className="text-red-400 p-1 hover:text-red-500 transition-colors flex items-center text-xs font-bold uppercase"
                  >
                    Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer / Summary */}
      {cart.length > 0 && (
        <div className="bg-white border-t rounded-t-3xl p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pb-8 z-20">
          
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-6 flex items-start gap-3">
            <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-orange-800 font-medium">
              💡 Please pay at the reception desk. Your order will be prepared after payment confirmation.
            </p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-500 font-bold uppercase tracking-wider text-sm">Total</span>
            <span className="text-3xl font-black">₹{totalAmount}</span>
          </div>
          
          <button
            onClick={handlePlaceOrder}
            disabled={isPlacing}
            className="w-full bg-black text-primary hover:bg-gray-900 rounded-full py-4 text-lg font-black uppercase tracking-wider shadow-lg transition-transform active:scale-95 disabled:opacity-70 flex justify-center items-center"
          >
            {isPlacing ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Place Order"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;

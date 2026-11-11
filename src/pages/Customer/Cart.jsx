import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Minus, AlertCircle, ShoppingBag, Sparkles, Clock, MessageSquare } from 'lucide-react';
import useStore from '../../store/useStore';
import { useOrders, useMenu, useCafeSettings } from '../../hooks/supabaseHooks';
import { getCartPairings, estimateOrderPrepMinutes } from '../../utils/smartCafeAI';

const NOTE_CHIPS = ['Less Spicy', 'Piping Hot', 'Less Sugar', 'Extra Chutney', 'No Onion'];

const Cart = ({ onBack, onOrderPlaced }) => {
  const cart = useStore((state) => state.cart);
  const tableNumber = useStore((state) => state.tableNumber);
  const customerName = useStore((state) => state.customerName);
  const orderNotes = useStore((state) => state.orderNotes);
  const setOrderNotes = useStore((state) => state.setOrderNotes);
  const addToCart = useStore((state) => state.addToCart);
  const updateQuantity = useStore((state) => state.updateQuantity);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);
  const setActiveOrderId = useStore((state) => state.setActiveOrderId);

  const { menu } = useMenu();
  const { orders, placeOrder } = useOrders(['approved', 'cooking']);
  const { settings } = useCafeSettings();

  const [isPlacing, setIsPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderError, setOrderError] = useState('');

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const pairings = useMemo(() => getCartPairings(menu, cart), [menu, cart]);
  const estimatedMinutes = useMemo(
    () => estimateOrderPrepMinutes(cart, orders, settings.rushMode),
    [cart, orders, settings.rushMode]
  );

  const toggleNoteChip = (chip) => {
    const parts = orderNotes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.includes(chip)) {
      setOrderNotes(parts.filter((p) => p !== chip).join(', '));
    } else {
      setOrderNotes([...parts, chip].join(', '));
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isPlacing) return;

    setIsPlacing(true);
    setOrderError('');
    try {
      const orderId = await placeOrder({
        tableNumber: tableNumber || 'Takeaway',
        customerName: customerName || 'Guest',
        paymentMethod,
        notes: orderNotes.trim(),
        estimatedMinutes,
        items: cart.map((i) => ({
          itemId: i.itemId,
          name: i.name,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal,
        })),
        totalAmount,
      });

      setActiveOrderId(orderId);
      clearCart();
      onOrderPlaced();
    } catch (error) {
      console.error('Failed to place order:', error);
      setOrderError(error.message || 'Could not place order. Please try again.');
      setIsPlacing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm flex items-center justify-between z-10 border-b border-gray-100">
        <button
          onClick={onBack}
          className="w-10 h-10 -ml-1 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <h2 className="font-black text-lg tracking-tight leading-none">YOUR TRAY</h2>
          {cart.length > 0 && (
            <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
              <Clock size={10} /> Ready in ~{estimatedMinutes} mins
            </span>
          )}
        </div>
        <div className="w-10" />
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {cart.length === 0 ? (
          <div className="text-center text-gray-500 mt-16 px-6">
            <ShoppingBag size={52} className="mx-auto text-gray-300 mb-4" />
            <p className="font-black text-gray-700 text-lg mb-1">Your tray is empty</p>
            <p className="text-xs text-gray-400 mb-6">Add something fresh from the Chatter menu!</p>
            <button onClick={onBack} className="btn-primary">
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div
                  key={item.itemId}
                  layout
                  drag="x"
                  dragConstraints={{ left: -80, right: 0 }}
                  onDragEnd={(_e, info) => {
                    if (info.offset.x < -70) removeFromCart(item.itemId);
                  }}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                    <p className="text-primary-dark font-black text-sm mt-0.5">
                      ₹{item.price} <span className="text-gray-400 font-medium text-xs">× {item.qty} = ₹{item.subtotal}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center bg-gray-100 rounded-full p-1 gap-2">
                      <button
                        onClick={() => updateQuantity(item.itemId, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-700"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-black w-4 text-center text-sm">{item.qty}</span>
                      <button
                        onClick={() => updateQuantity(item.itemId, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-black shadow-sm"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.itemId)}
                      className="text-red-400 hover:text-red-600 text-[10px] font-bold uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* AI Smart Pairings */}
            {pairings.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wider">
                  <Sparkles size={13} className="text-primary-dark" /> AI Barista Pairings
                </div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                  {pairings.map((p) => (
                    <button
                      key={p.id || p.itemId}
                      onClick={() => addToCart(p)}
                      className="bg-white border border-amber-200/80 rounded-xl px-3 py-2 flex items-center gap-2.5 shrink-0 shadow-sm active:scale-95 transition-transform text-left"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-800 whitespace-nowrap">{p.name}</p>
                        <p className="text-[11px] font-black text-primary-dark">₹{p.price}</p>
                      </div>
                      <span className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center shrink-0">
                        <Plus size={13} strokeWidth={2.5} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cooking Instructions */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2.5">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={13} className="text-primary-dark" /> Cooking Preferences
              </label>
              <div className="flex flex-wrap gap-1.5">
                {NOTE_CHIPS.map((chip) => {
                  const active = orderNotes.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleNoteChip(chip)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-black text-primary border-black'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                maxLength={120}
                placeholder="Any custom request for the chef? (Optional)"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer / Checkout */}
      {cart.length > 0 && (
        <div className="bg-white border-t rounded-t-3xl p-5 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pb-6 z-20 flex flex-col gap-3.5">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 flex items-start gap-2.5">
            <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-orange-900 font-medium leading-snug">
              Please pay at the reception counter. Your token &amp; kitchen prep start right after confirmation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all ${
                paymentMethod === 'cash'
                  ? 'border-primary bg-primary/15 text-black'
                  : 'border-gray-100 bg-gray-50 text-gray-500'
              }`}
            >
              💵 Pay Cash
            </button>
            <button
              onClick={() => setPaymentMethod('online')}
              className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all ${
                paymentMethod === 'online'
                  ? 'border-primary bg-primary/15 text-black'
                  : 'border-gray-100 bg-gray-50 text-gray-500'
              }`}
            >
              📱 Pay Online / UPI
            </button>
          </div>

          {orderError && (
            <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl text-center">
              {orderError}
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <div>
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px] block">
                Total Payable
              </span>
              <span className="text-2xl font-black text-secondary">₹{totalAmount}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacing}
              className="bg-black text-primary hover:bg-gray-900 rounded-full px-7 py-3.5 text-sm font-black uppercase tracking-wider shadow-lg transition-transform active:scale-95 disabled:opacity-70 flex items-center gap-2"
            >
              {isPlacing ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                'Place Order →'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;

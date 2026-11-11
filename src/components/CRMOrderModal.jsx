import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, Clock } from 'lucide-react';
import { useMenu, useOrders, useCafeSettings } from '../hooks/supabaseHooks';
import { parseNaturalOrder, estimateOrderPrepMinutes } from '../utils/smartCafeAI';

const CATEGORIES = ['HOT', 'COLD', 'MOMO', 'FRIES', 'PASTA', 'MAGGI', 'SANDWICH'];

const CRMOrderModal = ({ onClose, onSuccess }) => {
  const { menu, loading: menuLoading } = useMenu();
  const { orders, placeOrder, approveOrderAndAssignToken } = useOrders();
  const { settings } = useCafeSettings();

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiHint, setAiHint] = useState('');
  const [cart, setCart] = useState([]);

  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('Takeaway');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [formError, setFormError] = useState('');

  const [mobileTab, setMobileTab] = useState('menu');

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
      return matchesSearch && (searchQuery ? true : matchesCategory);
    });
  }, [menu, searchQuery, activeCategory]);

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const estimatedMinutes = useMemo(
    () => estimateOrderPrepMinutes(cart, orders, settings.rushMode),
    [cart, orders, settings.rushMode]
  );

  const handleAddItem = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => (i.id || i.itemId) === (item.id || item.itemId));
      if (existing) {
        return prev.map((i) =>
          (i.id || i.itemId) === (item.id || item.itemId)
            ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price }
            : i
        );
      }
      return [...prev, { ...item, qty: 1, subtotal: item.price }];
    });
  };

  const handleUpdateQty = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if ((i.id || i.itemId) === itemId) {
            const newQty = Math.max(0, i.qty + delta);
            return { ...i, qty: newQty, subtotal: newQty * i.price };
          }
          return i;
        })
        .filter((i) => i.qty > 0)
    );
  };

  const handleAIParse = () => {
    if (!aiPrompt.trim()) return;
    const { matchedItems, tableNumber: parsedTable, unmatchedSegments } = parseNaturalOrder(
      aiPrompt,
      menu
    );
    if (matchedItems.length === 0) {
      setAiHint('Could not match items — try e.g. "2 masala tea, 1 veg momo table 4"');
      return;
    }

    setCart((prev) => {
      const next = [...prev];
      matchedItems.forEach((m) => {
        const key = m.id || m.itemId;
        const idx = next.findIndex((i) => (i.id || i.itemId) === key);
        if (idx > -1) {
          const qty = next[idx].qty + m.qty;
          next[idx] = { ...next[idx], qty, subtotal: qty * next[idx].price };
        } else {
          next.push(m);
        }
      });
      return next;
    });

    if (parsedTable) setTableNumber(parsedTable);
    setAiHint(
      `Added ${matchedItems.map((i) => `${i.qty}× ${i.name}`).join(', ')}${
        unmatchedSegments.length ? ` (Skipped: ${unmatchedSegments.join(', ')})` : ''
      }`
    );
    setAiPrompt('');
  };

  const handleSubmit = async () => {
    setFormError('');
    if (cart.length === 0) {
      setFormError('Add at least one item to the order.');
      return;
    }
    if (!customerName.trim()) {
      setFormError('Please enter a customer name.');
      return;
    }

    setIsPlacing(true);
    try {
      const orderId = await placeOrder({
        tableNumber: tableNumber || 'Takeaway',
        customerName: customerName.trim(),
        paymentMethod,
        notes: notes.trim(),
        estimatedMinutes,
        items: cart.map((i) => ({
          itemId: i.itemId || i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal,
        })),
        totalAmount,
      });

      const token = await approveOrderAndAssignToken(orderId);
      if (onSuccess) onSuccess(token);
      onClose();
    } catch (err) {
      console.error(err);
      setFormError('Failed to place walk-in order.');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="bg-gray-50 w-full max-w-3xl h-full shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="bg-secondary text-white px-5 py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-black text-primary">New Walk-In / Counter Order</h2>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
              AI Smart Reception POS
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center font-bold text-gray-300 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* AI Smart Quick-Type Bar */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-700 shrink-0" />
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAIParse()}
              placeholder='AI Quick Order: e.g. "2 masala tea, 1 veg momo table 4"'
              className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleAIParse}
              className="bg-black text-primary px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 active:scale-95 transition-transform"
            >
              <Wand2 size={13} /> Fill
            </button>
          </div>
          {aiHint && <p className="text-[11px] font-bold text-amber-900 mt-1.5">{aiHint}</p>}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Mobile Tab Switcher */}
          <div className="md:hidden flex bg-gray-200 p-1 m-3 rounded-xl shrink-0">
            <button
              onClick={() => setMobileTab('menu')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                mobileTab === 'menu' ? 'bg-white shadow text-black' : 'text-gray-500'
              }`}
            >
              Menu
            </button>
            <button
              onClick={() => setMobileTab('cart')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                mobileTab === 'cart' ? 'bg-white shadow text-black' : 'text-gray-500'
              }`}
            >
              Cart ({cart.reduce((s, i) => s + i.qty, 0)})
            </button>
          </div>

          {/* Menu Selection */}
          <div
            className={`${
              mobileTab === 'menu' ? 'flex' : 'hidden'
            } md:flex flex-1 flex-col border-b md:border-b-0 md:border-r bg-white overflow-hidden`}
          >
            <div className="p-3 border-b bg-gray-50">
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              />
            </div>

            <div className="flex overflow-x-auto hide-scrollbar gap-1.5 p-2.5 border-b shrink-0 bg-white">
              <button
                onClick={() => setActiveCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  activeCategory === 'ALL' && !searchQuery
                    ? 'bg-primary text-black'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ALL
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setSearchQuery('');
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                    activeCategory === cat && !searchQuery
                      ? 'bg-primary text-black'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
              {menuLoading ? (
                <p className="text-center p-4 text-gray-400 text-xs font-bold">Loading menu...</p>
              ) : (
                filteredMenu.map((item) => {
                  const available = item.isAvailable !== false;
                  return (
                    <button
                      key={item.id || item.itemId}
                      onClick={() => handleAddItem(item)}
                      disabled={!available}
                      className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-colors active:scale-[0.98] ${
                        !available
                          ? 'opacity-50 bg-gray-50'
                          : 'bg-white hover:border-primary shadow-sm'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-sm text-gray-800 truncate">{item.name}</div>
                        <div className="text-xs font-bold text-primary-dark mt-0.5">₹{item.price}</div>
                      </div>
                      {!available ? (
                        <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-1 rounded">
                          Out
                        </span>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-amber-900 flex items-center justify-center font-black shrink-0">
                          +
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Cart & Customer Details */}
          <div
            className={`${
              mobileTab === 'cart' ? 'flex' : 'hidden'
            } md:flex w-full md:w-80 bg-gray-50 flex-col shrink-0`}
          >
            <div className="p-3.5 space-y-2.5 bg-white border-b shrink-0 shadow-sm z-10">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Guest name"
                    className="w-full mt-1 px-3 py-2 bg-gray-50 border rounded-lg text-xs font-bold focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">
                    Table / Type
                  </label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 05"
                    className="w-full mt-1 px-3 py-2 bg-gray-50 border rounded-lg text-xs font-bold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-1.5 rounded-lg text-xs font-bold border ${
                    paymentMethod === 'cash'
                      ? 'bg-primary/15 border-primary text-black'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className={`py-1.5 rounded-lg text-xs font-bold border ${
                    paymentMethod === 'online'
                      ? 'bg-primary/15 border-primary text-black'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  📱 Online / UPI
                </button>
              </div>

              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Kitchen notes (optional)..."
                className="w-full px-3 py-1.5 bg-gray-50 border rounded-lg text-xs font-medium focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  Order Items
                </h3>
                {cart.length > 0 && (
                  <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={10} /> ~{estimatedMinutes}m
                  </span>
                )}
              </div>

              <AnimatePresence>
                {cart.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-10 font-medium">
                    Cart is empty.
                    <br />
                    Tap items or use AI Quick Order.
                  </p>
                ) : (
                  cart.map((item) => {
                    const key = item.id || item.itemId;
                    return (
                      <motion.div
                        key={key}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-gray-800 truncate">{item.name}</div>
                          <div className="font-bold text-[11px] text-primary-dark">₹{item.subtotal}</div>
                        </div>
                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0">
                          <button
                            onClick={() => handleUpdateQty(key, -1)}
                            className="w-6 h-6 flex items-center justify-center font-bold text-gray-600"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black">{item.qty}</span>
                          <button
                            onClick={() => handleUpdateQty(key, 1)}
                            className="w-6 h-6 flex items-center justify-center font-bold text-gray-600"
                          >
                            +
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 bg-white border-t shrink-0 space-y-2.5">
              {formError && (
                <div className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-center">
                  {formError}
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Total</span>
                <span className="text-xl font-black text-gray-900">₹{totalAmount}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isPlacing || cart.length === 0}
                className="w-full bg-primary text-black font-black uppercase tracking-wider py-3.5 rounded-xl disabled:opacity-50 transition-transform active:scale-95 text-sm shadow-md"
              >
                {isPlacing ? 'Sending to Kitchen...' : 'Confirm & Send to Chef'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CRMOrderModal;

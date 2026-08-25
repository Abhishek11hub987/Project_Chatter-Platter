import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RotateCcw, Coffee, CheckCircle, Clock } from 'lucide-react';
import useStore from '../store/useStore';
import { useOrders } from '../hooks/supabaseHooks';

const ReceptionApp = () => {
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const login = useStore(state => state.login);
  const [pin, setPin] = useState('');
  
  const [activeTab, setActiveTab] = useState('pending');
  const { orders, loading, approveOrderAndAssignToken } = useOrders();
  const [processingId, setProcessingId] = useState(null);
  
  const [prevPendingCount, setPrevPendingCount] = useState(0);
  
  const pendingOrders = orders.filter(o => o.status === 'pending_payment');
  const activeOrders = orders.filter(o => ['approved', 'cooking', 'ready'].includes(o.status));

  // Sound alert for new pending order
  useEffect(() => {
    if (pendingOrders.length > prevPendingCount) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, t);
          osc.frequency.exponentialRampToValueAtTime(1760, t + 0.1);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
          osc.start(t);
          osc.stop(t + 0.5);
        }
      } catch (e) { /* ignore */ }
    }
    setPrevPendingCount(pendingOrders.length);
  }, [pendingOrders.length, prevPendingCount]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === '1234') {
      login();
    } else {
      alert('Incorrect PIN');
      setPin('');
    }
  };

  const handleApprove = async (orderId) => {
    setProcessingId(orderId);
    try {
      await approveOrderAndAssignToken(orderId);
    } catch (error) {
      alert("Failed to approve order");
    } finally {
      setProcessingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-surface p-6 sm:p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
          <h2 className="text-xl sm:text-2xl font-black mb-4 sm:mb-6">RECEPTION LOGIN</h2>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-gray-100 p-4 rounded-xl text-center text-2xl tracking-[0.5em] font-bold mb-4 sm:mb-6 focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={4}
          />
          <button type="submit" className="w-full btn-primary text-lg">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-secondary font-sans flex flex-col">
      {/* Header */}
      <header className="bg-secondary text-white p-3 sm:p-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-black text-primary">C&P RECEPTION</h1>
          <div className="flex bg-gray-800 rounded-full p-1">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-colors relative ${activeTab === 'pending' ? 'bg-primary text-black' : 'text-gray-300'}`}
            >
              Pending
              {pendingOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-800"></span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('active')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-colors ${activeTab === 'active' ? 'bg-primary text-black' : 'text-gray-300'}`}
            >
              Active
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-3 sm:p-4 overflow-y-auto">
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold">Loading...</div>
        ) : activeTab === 'pending' ? (
          <div className="space-y-3 sm:space-y-4">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Coffee size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold text-lg">No pending orders</p>
              </div>
            ) : (
              <AnimatePresence>
                {pendingOrders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -50, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-gray-100"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold">
                        Table {order.tableNumber}
                      </span>
                      <span className="text-gray-400 text-xs font-medium flex items-center gap-1">
                        <Clock size={12}/> Just now
                      </span>
                    </div>
                    
                    {/* Order items */}
                    <div className="mb-3">
                      {order.items && order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-gray-600 py-0.5">
                          <span>{item.qty}x {item.name}</span>
                          <span className="font-medium">₹{item.subtotal || item.price * item.qty}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xl sm:text-2xl font-black text-primary-dark">₹{order.totalAmount}</div>
                      <button 
                        onClick={() => handleApprove(order.id)}
                        disabled={processingId === order.id}
                        className="bg-primary text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-primary-dark active:scale-95 transition-transform text-sm sm:text-base disabled:opacity-50"
                      >
                        {processingId === order.id ? 'Processing...' : 'Confirm & Generate Token'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {activeOrders.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="font-bold text-lg">No active orders</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {activeOrders.map(order => (
                  <div key={order.id} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${
                    order.status === 'ready' ? 'border-l-green-500' :
                    order.status === 'cooking' ? 'border-l-orange-500' : 'border-l-yellow-400'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-gray-400 font-bold uppercase">Token</span>
                        <div className="text-3xl font-black leading-none text-gray-800">{order.tokenNumber}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${
                        order.status === 'ready' ? 'bg-green-100 text-green-700' :
                        order.status === 'cooking' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-gray-500 mb-2">Table {order.tableNumber}</div>
                    <p className="text-sm text-gray-600 truncate">
                      {order.items && order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReceptionApp;

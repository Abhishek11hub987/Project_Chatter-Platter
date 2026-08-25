import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import { useOrders } from '../hooks/supabaseHooks';
import { Maximize2, Minimize2, ChefHat, Flame, CheckCircle } from 'lucide-react';

const ChefOrderCard = ({ order, onAction, actionText, actionColor, isLoading }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden flex flex-col"
    >
      <div className="p-4 sm:p-6 flex-1">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Token</div>
            <div className="text-5xl sm:text-7xl font-black text-white leading-none tracking-tighter">{order.tokenNumber || '—'}</div>
          </div>
          <div className="bg-gray-700 px-3 py-1.5 rounded-xl text-center">
            <div className="text-gray-400 text-xs font-bold uppercase">Table</div>
            <div className="text-xl font-black text-white">{order.tableNumber}</div>
          </div>
        </div>
        
        <ul className="space-y-2 mt-4">
          {order.items && order.items.map((item, idx) => (
            <li key={idx} className="flex justify-between items-center text-sm sm:text-base text-gray-200 font-medium pb-2 border-b border-gray-700 last:border-0">
              <span className="flex items-center gap-2">
                <span className="bg-gray-700 text-white font-bold w-7 h-7 flex items-center justify-center rounded-lg text-sm">{item.qty}</span>
                <span className="line-clamp-1">{item.name}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      
      <button 
        onClick={() => onAction(order)}
        disabled={isLoading}
        className={`w-full py-4 sm:py-5 text-base sm:text-xl font-black uppercase tracking-wider transition-colors disabled:opacity-50 ${actionColor}`}
      >
        {isLoading ? 'Processing...' : actionText}
      </button>
    </motion.div>
  );
};

const ChefApp = () => {
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const login = useStore(state => state.login);
  const [pin, setPin] = useState('');
  const [processingId, setProcessingId] = useState(null);
  
  const { orders, loading, updateOrderStatus } = useOrders();
  
  const [prevNewCount, setPrevNewCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // For mobile tab view

  const newOrders = orders.filter(o => o.status === 'approved');
  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const readyOrders = orders.filter(o => o.status === 'ready');

  // Play beep for new orders using safe inline audio
  useEffect(() => {
    if (newOrders.length > prevNewCount) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          [0, 0.3, 0.6].forEach(offset => {
            const t = ctx.currentTime + offset;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(1000, t);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.8, t + 0.05);
            gain.gain.linearRampToValueAtTime(0, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
          });
        }
      } catch (e) { /* ignore audio errors */ }
    }
    setPrevNewCount(newOrders.length);
  }, [newOrders.length, prevNewCount]);

  const handleAction = async (order, newStatus) => {
    setProcessingId(order.id);
    try {
      await updateOrderStatus(order.id, newStatus);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === '5678') {
      login();
    } else {
      alert('Incorrect PIN');
      setPin('');
    }
  };

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    } catch (e) { /* ignore fullscreen errors on mobile */ }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-800 border border-gray-700 p-8 sm:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 sm:mb-8">KITCHEN LOGIN</h2>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-gray-900 text-white p-4 rounded-xl text-center text-3xl sm:text-4xl tracking-[0.5em] font-bold mb-6 sm:mb-8 focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={4}
          />
          <button type="submit" className="w-full bg-primary text-black py-4 rounded-xl text-lg sm:text-xl font-black uppercase transition-colors hover:bg-primary-dark">
            Enter Kitchen
          </button>
        </form>
      </div>
    );
  }

  // Mobile tab-based column selector
  const renderColumn = (title, columnOrders, actionText, actionColor, bgColor, newStatus) => (
    <div className="flex flex-col h-full bg-gray-950 rounded-2xl sm:rounded-3xl border border-gray-800 overflow-hidden">
      <div className={`${bgColor} p-3 sm:p-4 text-center font-black text-base sm:text-xl uppercase tracking-widest shrink-0`}>
        {title} ({columnOrders.length})
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 hide-scrollbar">
        <AnimatePresence>
          {columnOrders.map(order => (
            <ChefOrderCard 
              key={order.id} 
              order={order} 
              onAction={(o) => handleAction(o, newStatus)} 
              actionText={actionText} 
              actionColor={actionColor}
              isLoading={processingId === order.id}
            />
          ))}
        </AnimatePresence>
        {columnOrders.length === 0 && (
          <div className="text-center text-gray-600 py-10 font-bold">No orders</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-gray-950 p-3 sm:p-4 flex items-center justify-between border-b border-gray-800 shrink-0">
        <h1 className="text-lg sm:text-2xl font-black text-primary tracking-wider">C&P KITCHEN</h1>
        <div className="flex items-center gap-2">
          {/* Mobile tab switcher */}
          <div className="flex sm:hidden bg-gray-800 rounded-full p-1 gap-0.5">
            <button 
              onClick={() => setActiveTab('new')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors relative ${activeTab === 'new' ? 'bg-primary text-black' : 'text-gray-400'}`}
            >
              New
              {newOrders.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            <button 
              onClick={() => setActiveTab('cooking')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${activeTab === 'cooking' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}
            >
              Cook
            </button>
            <button 
              onClick={() => setActiveTab('ready')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${activeTab === 'ready' ? 'bg-green-500 text-white' : 'text-gray-400'}`}
            >
              Ready
            </button>
          </div>
          <button onClick={toggleFullscreen} className="bg-gray-800 p-2 sm:p-3 rounded-full hover:bg-gray-700 transition-colors">
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>

      {/* Desktop: 3-column Kanban Board */}
      <main className="hidden sm:grid flex-1 grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 overflow-hidden">
        {renderColumn('New Orders', newOrders, 'Start Cooking', 'bg-orange-500 hover:bg-orange-600 text-white', 'bg-primary text-black', 'cooking')}
        {renderColumn('Cooking', cookingOrders, 'Order Ready', 'bg-green-500 hover:bg-green-600 text-white', 'bg-orange-500 text-white', 'ready')}
        {renderColumn('Ready', readyOrders, 'Mark Delivered', 'bg-gray-700 hover:bg-gray-600 text-gray-300', 'bg-green-500 text-white', 'delivered')}
      </main>

      {/* Mobile: Single column based on active tab */}
      <main className="flex sm:hidden flex-1 p-3 overflow-hidden">
        {activeTab === 'new' && renderColumn('New Orders', newOrders, 'Start Cooking', 'bg-orange-500 hover:bg-orange-600 text-white', 'bg-primary text-black', 'cooking')}
        {activeTab === 'cooking' && renderColumn('Cooking', cookingOrders, 'Order Ready', 'bg-green-500 hover:bg-green-600 text-white', 'bg-orange-500 text-white', 'ready')}
        {activeTab === 'ready' && renderColumn('Ready', readyOrders, 'Mark Delivered', 'bg-gray-700 hover:bg-gray-600 text-gray-300', 'bg-green-500 text-white', 'delivered')}
      </main>
    </div>
  );
};

export default ChefApp;

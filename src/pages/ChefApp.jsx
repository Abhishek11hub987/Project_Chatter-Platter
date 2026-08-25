import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import { useOrders } from '../hooks/supabaseHooks';
import { useSound } from '../hooks/useSound';
import { Maximize2, Minimize2 } from 'lucide-react';

const ChefOrderCard = ({ order, onAction, actionText, actionColor }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden flex flex-col"
    >
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Token</div>
            <div className="text-7xl font-black text-white leading-none tracking-tighter">{order.tokenNumber}</div>
          </div>
          <div className="bg-gray-700 px-4 py-2 rounded-xl text-center">
            <div className="text-gray-400 text-xs font-bold uppercase">Table</div>
            <div className="text-2xl font-black text-white">{order.tableNumber}</div>
          </div>
        </div>
        
        <ul className="space-y-3 mt-6">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex justify-between items-center text-lg text-gray-200 font-medium pb-3 border-b border-gray-700 last:border-0">
              <span className="flex items-center gap-3">
                <span className="bg-gray-700 text-white font-bold w-8 h-8 flex items-center justify-center rounded-lg">{item.qty}</span>
                {item.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
      
      <button 
        onClick={() => onAction(order)}
        className={`w-full py-5 text-xl font-black uppercase tracking-wider transition-colors ${actionColor}`}
      >
        {actionText}
      </button>
    </motion.div>
  );
};

const ChefApp = () => {
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const login = useStore(state => state.login);
  const [pin, setPin] = useState('');
  
  const { orders, loading, updateOrderStatus } = useOrders();
  const { playLoudBeep, playChime } = useSound();
  
  const [prevNewCount, setPrevNewCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const newOrders = orders.filter(o => o.status === 'approved');
  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const readyOrders = orders.filter(o => o.status === 'ready');

  // Loud beep for new orders
  useEffect(() => {
    if (newOrders.length > prevNewCount) {
      playLoudBeep();
    }
    setPrevNewCount(newOrders.length);
  }, [newOrders.length, prevNewCount, playLoudBeep]);

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
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-800 border border-gray-700 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <h2 className="text-3xl font-black text-white mb-8">KITCHEN LOGIN</h2>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-gray-900 text-white p-4 rounded-xl text-center text-4xl tracking-[0.5em] font-bold mb-8 focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={4}
          />
          <button type="submit" className="w-full bg-primary text-black py-4 rounded-xl text-xl font-black uppercase transition-colors hover:bg-primary-dark">
            Enter Kitchen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-gray-950 p-4 flex items-center justify-between border-b border-gray-800 shrink-0">
        <h1 className="text-2xl font-black text-primary tracking-wider">C&P KITCHEN</h1>
        <button onClick={toggleFullscreen} className="bg-gray-800 p-3 rounded-full hover:bg-gray-700 transition-colors">
          {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 grid grid-cols-3 gap-6 p-6 overflow-hidden">
        
        {/* NEW Column */}
        <div className="flex flex-col h-full bg-gray-950 rounded-3xl border border-gray-800 overflow-hidden">
          <div className="bg-primary text-black p-4 text-center font-black text-xl uppercase tracking-widest shrink-0">
            New Orders ({newOrders.length})
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
            <AnimatePresence>
              {newOrders.map(order => (
                <ChefOrderCard 
                  key={order.id} 
                  order={order} 
                  onAction={(o) => updateOrderStatus(o.id, 'cooking')} 
                  actionText="Start Cooking" 
                  actionColor="bg-orange-500 hover:bg-orange-600 text-white" 
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* COOKING Column */}
        <div className="flex flex-col h-full bg-gray-950 rounded-3xl border border-gray-800 overflow-hidden">
          <div className="bg-orange-500 text-white p-4 text-center font-black text-xl uppercase tracking-widest shrink-0">
            Cooking ({cookingOrders.length})
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
            <AnimatePresence>
              {cookingOrders.map(order => (
                <ChefOrderCard 
                  key={order.id} 
                  order={order} 
                  onAction={(o) => {
                    updateOrderStatus(o.id, 'ready');
                    playChime();
                  }} 
                  actionText="Order Ready" 
                  actionColor="bg-green-500 hover:bg-green-600 text-white" 
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* READY Column */}
        <div className="flex flex-col h-full bg-gray-950 rounded-3xl border border-gray-800 overflow-hidden">
          <div className="bg-green-500 text-white p-4 text-center font-black text-xl uppercase tracking-widest shrink-0">
            Ready ({readyOrders.length})
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
            <AnimatePresence>
              {readyOrders.map(order => (
                <ChefOrderCard 
                  key={order.id} 
                  order={order} 
                  onAction={(o) => updateOrderStatus(o.id, 'delivered')} 
                  actionText="Mark Delivered" 
                  actionColor="bg-gray-700 hover:bg-gray-600 text-gray-300" 
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ChefApp;

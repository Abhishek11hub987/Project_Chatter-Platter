import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, ChefHat, HeartHandshake, ShoppingBag, XCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import { useOrder } from '../../hooks/supabaseHooks';
import { supabase } from '../../supabase';

const Tracker = ({ onFeedback, onBackToMenu }) => {
  const activeOrderId = useStore(state => state.activeOrderId);
  const setActiveOrderId = useStore(state => state.setActiveOrderId);
  const { order, loading } = useOrder(activeOrderId);
  
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const [prevStatus, setPrevStatus] = useState(null);

  useEffect(() => {
    if (order && order.status !== prevStatus) {
      if (order.status === 'ready' && prevStatus !== null) {
        setShowReadyBanner(true);
        // Try to play a chime using Web Audio API safely
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
          }
        } catch (e) { /* ignore audio errors on mobile */ }

        if ('Notification' in window && window.Notification.permission === 'granted') {
          try {
            new window.Notification('Your Order is Ready!', { body: `Token #${order.tokenNumber}` });
          } catch (e) { /* ignore notification errors */ }
        }
      }
      setPrevStatus(order.status);
    }
  }, [order, prevStatus]);

  useEffect(() => {
    if (order && order.status === 'delivered') {
      setActiveOrderId(null);
      onFeedback();
    }
  }, [order, setActiveOrderId, onFeedback]);

  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      try { window.Notification.requestPermission(); } catch (e) { /* ignore */ }
    }
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center font-bold">Loading...</div>;

  if (!order) return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <ShoppingBag size={48} className="text-gray-300 mb-4" />
      <p className="font-bold text-gray-500 mb-2">No active order found.</p>
      <p className="text-sm text-gray-400 mb-6">Place an order from the menu to track it here.</p>
      <button onClick={onBackToMenu} className="btn-primary">Back to Menu</button>
    </div>
  );

  if (order.status === 'cancelled') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-red-50">
        <XCircle size={64} className="text-red-500 mb-6" />
        <h2 className="text-2xl font-black text-red-600 mb-2">Order Cancelled</h2>
        <p className="font-bold text-gray-700 mb-2">Your order was cancelled.</p>
        <p className="text-sm text-gray-500 mb-8">If you didn't request this, it may have been cancelled by the staff.</p>
        <button 
          onClick={() => {
            setActiveOrderId(null);
            onBackToMenu();
          }} 
          className="bg-red-500 text-white font-bold py-3 px-8 rounded-full shadow-lg active:scale-95 transition-transform"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  const getStepStatus = (stepIndex) => {
    const statuses = ['pending_payment', 'approved', 'cooking', 'ready', 'delivered'];
    const currentIndex = statuses.indexOf(order.status);
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  const steps = [
    { label: 'Payment Pending', desc: 'Pay at the counter', icon: Clock, activeColor: 'bg-yellow-500 text-white' },
    { label: 'Payment Confirmed', desc: 'Order sent to kitchen', icon: CheckCircle2, activeColor: 'bg-blue-500 text-white' },
    { label: 'In Kitchen', desc: 'Preparing your food', icon: ChefHat, activeColor: 'bg-orange-500 text-white' },
    { label: 'Ready for Pickup', desc: 'Collect from counter', icon: HeartHandshake, activeColor: 'bg-green-500 text-white' }
  ];

  return (
    <div className="h-full flex flex-col bg-background relative overflow-y-auto pb-6">
      
      {/* Top Banner for Token */}
      <div className="bg-primary-dark pt-8 pb-14 px-6 text-center rounded-b-[3rem] shadow-md">
        <h2 className="text-black font-extrabold uppercase tracking-widest text-sm mb-2">
          {order.tokenNumber ? 'YOUR TOKEN' : 'ORDER PLACED'}
        </h2>
        
        {order.tokenNumber ? (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-black text-black leading-none drop-shadow-md"
          >
            {order.tokenNumber}
          </motion.div>
        ) : (
          <div className="text-xl font-bold text-black/80 mt-4 mb-2">
            Awaiting Payment
          </div>
        )}
        <p className="text-black/70 font-bold mt-2">Table {order.tableNumber}</p>
      </div>

      {/* YOUR ORDER - Always visible */}
      <div className="px-6 -mt-5 z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-black text-sm uppercase tracking-wider text-gray-600 flex items-center gap-2">
              <ShoppingBag size={14} /> Your Order
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items && order.items.map((item, idx) => (
              <div key={idx} className="px-4 py-2.5 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  <span className="bg-primary/20 text-primary-dark font-bold w-6 h-6 flex items-center justify-center rounded-md text-xs">{item.qty}</span>
                  {item.name}
                </span>
                <span className="text-sm font-bold text-gray-500">₹{item.subtotal || item.price * item.qty}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 bg-gray-50 border-t flex justify-between items-center">
            <span className="text-sm font-bold text-gray-500 uppercase">Total</span>
            <span className="text-lg font-black">₹{order.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 px-6 mt-4">
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 relative">
          
          <div className="absolute left-[35px] top-9 bottom-9 w-0.5 bg-gray-100 -z-0"></div>
          
          <div className="space-y-6 relative z-10">
            {steps.map((step, i) => {
              const status = getStepStatus(i);
              const Icon = step.icon;
              
              return (
                <div key={i} className="flex gap-3 items-start">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-colors duration-500 ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'current' ? (
                      order.status === 'ready' ? 'bg-green-500 text-white animate-pulse' :
                      order.status === 'cooking' ? 'bg-orange-500 text-white animate-[pulse_2s_infinite]' :
                      step.activeColor
                    ) : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon size={18} />
                  </div>
                  
                  <div className="pt-1.5">
                    <h4 className={`font-bold text-sm ${status === 'current' ? 'text-black' : status === 'completed' ? 'text-gray-700' : 'text-gray-400'}`}>
                      {step.label}
                    </h4>
                    <p className={`text-xs ${status === 'current' ? 'text-gray-600' : 'text-gray-400'}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="text-center mt-4 pb-6 px-6 flex flex-col gap-2">
        <button 
          onClick={onBackToMenu}
          className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors text-sm"
        >
          Order More Items
        </button>
        {['pending_payment', 'approved'].includes(order.status) && (
          <button 
            onClick={async () => {
              if (window.confirm("Are you sure you want to cancel this order?")) {
                try {
                  const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
                  if (error) throw error;
                  setActiveOrderId(null);
                  onBackToMenu();
                } catch (err) {
                  alert("Failed to cancel order.");
                }
              }
            }}
            className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-2xl hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-2 mt-1"
          >
            <XCircle size={16} /> Cancel Order
          </button>
        )}
        <span className="text-xs text-gray-400 font-medium mt-1">
          Updates automatically in real-time
        </span>
      </div>

      {/* Fullscreen Ready Banner */}
      <AnimatePresence>
        {showReadyBanner && order.status === 'ready' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-green-500 p-6"
          >
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl w-full max-w-sm">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <HeartHandshake size={40} />
              </motion.div>
              <h2 className="text-2xl font-black mb-2 text-green-600">TOKEN #{order.tokenNumber}</h2>
              <h1 className="text-4xl font-black mb-4">IS READY!</h1>
              <p className="text-gray-600 font-bold mb-6 text-sm">Please collect your order from the counter.</p>
              
              <button 
                onClick={() => setShowReadyBanner(false)}
                className="w-full bg-black text-white rounded-full py-4 font-bold text-lg"
              >
                GOT IT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Tracker;

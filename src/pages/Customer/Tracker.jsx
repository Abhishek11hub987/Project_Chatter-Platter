import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, ChefHat, HeartHandshake, X } from 'lucide-react';
import useStore from '../../store/useStore';
import { useOrder } from '../../hooks/supabaseHooks';
import { useSound } from '../../hooks/useSound';

const Tracker = ({ onFeedback, onBackToMenu }) => {
  const activeOrderId = useStore(state => state.activeOrderId);
  const setActiveOrderId = useStore(state => state.setActiveOrderId);
  const { order, loading } = useOrder(activeOrderId);
  const { playChime } = useSound();
  
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const [prevStatus, setPrevStatus] = useState(null);

  useEffect(() => {
    if (order && order.status !== prevStatus) {
      if (order.status === 'ready' && prevStatus !== null) {
        playChime();
        setShowReadyBanner(true);
        if ('Notification' in window && window.Notification.permission === 'granted') {
          new window.Notification('Your Order is Ready!', { body: `Token #${order.tokenNumber}` });
        }
      }
      setPrevStatus(order.status);
    }
  }, [order, prevStatus, playChime]);

  useEffect(() => {
    if (order && order.status === 'delivered') {
      setActiveOrderId(null);
      onFeedback();
    }
  }, [order, setActiveOrderId, onFeedback]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);


  if (loading) return <div className="h-full flex items-center justify-center font-bold">Loading...</div>;

  if (!order) return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <p className="font-bold text-gray-500 mb-4">No active order found.</p>
      <button onClick={onBackToMenu} className="btn-primary">Back to Menu</button>
    </div>
  );

  const getStepStatus = (stepIndex) => {
    const statuses = ['pending_payment', 'approved', 'cooking', 'ready', 'delivered'];
    const currentIndex = statuses.indexOf(order.status);
    
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  const steps = [
    { 
      label: 'Payment Pending', 
      desc: 'Pay at the counter',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600',
      activeColor: 'bg-yellow-500 text-white'
    },
    { 
      label: 'Payment Confirmed', 
      desc: 'Order sent to kitchen',
      icon: CheckCircle2,
      color: 'bg-blue-100 text-blue-600',
      activeColor: 'bg-blue-500 text-white'
    },
    { 
      label: 'In Kitchen', 
      desc: 'Preparing your food',
      icon: ChefHat,
      color: 'bg-orange-100 text-orange-600',
      activeColor: 'bg-orange-500 text-white'
    },
    { 
      label: 'Ready for Pickup', 
      desc: 'Please collect from counter',
      icon: HeartHandshake,
      color: 'bg-green-100 text-green-600',
      activeColor: 'bg-green-500 text-white'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-background relative overflow-y-auto pb-6">
      
      {/* Top Banner for Token */}
      <div className="bg-primary-dark pt-10 pb-16 px-6 text-center rounded-b-[3rem] shadow-md">
        <h2 className="text-black font-extrabold uppercase tracking-widest text-sm mb-2">
          {order.tokenNumber ? 'YOUR TOKEN' : 'ORDER PLACED'}
        </h2>
        
        {order.tokenNumber ? (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl font-black text-black leading-none drop-shadow-md"
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

      {/* Timeline */}
      <div className="flex-1 px-8 -mt-6">
        <div className="bg-surface rounded-3xl p-6 shadow-xl relative">
          
          <div className="absolute left-[39px] top-10 bottom-10 w-0.5 bg-gray-100 -z-0"></div>
          
          <div className="space-y-8 relative z-10">
            {steps.map((step, i) => {
              const status = getStepStatus(i);
              const Icon = step.icon;
              
              return (
                <div key={i} className="flex gap-4 items-start">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-colors duration-500 ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'current' ? (
                      order.status === 'ready' ? 'bg-green-500 text-white animate-pulse' :
                      order.status === 'cooking' ? 'bg-orange-500 text-white animate-[pulse_2s_infinite]' :
                      step.activeColor
                    ) : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon size={24} />
                  </div>
                  
                  <div className="pt-2">
                    <h4 className={`font-bold ${status === 'current' ? 'text-black' : status === 'completed' ? 'text-gray-700' : 'text-gray-400'}`}>
                      {step.label}
                    </h4>
                    <p className={`text-sm ${status === 'current' ? 'text-gray-600' : 'text-gray-400'}`}>
                      {step.desc}
                    </p>
                    
                    {/* Items shown if cooking */}
                    {status === 'current' && i === 2 && (
                      <div className="mt-3 bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <ul className="text-xs font-medium text-orange-800 space-y-1">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{item.qty}x {item.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="text-center mt-8 pb-8 px-8 flex flex-col gap-3">
        <button 
          onClick={onBackToMenu}
          className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors"
        >
          Back to Menu
        </button>
        <span className="text-xs text-gray-400 font-medium">
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-green-500 p-6 max-w-[430px] mx-auto"
          >
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl w-full">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <HeartHandshake size={48} />
              </motion.div>
              <h2 className="text-3xl font-black mb-2 text-green-600">TOKEN #{order.tokenNumber}</h2>
              <h1 className="text-5xl font-black mb-6">IS READY!</h1>
              <p className="text-gray-600 font-bold mb-8">Please collect your order from the counter.</p>
              
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

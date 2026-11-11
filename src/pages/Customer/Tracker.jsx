import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  HeartHandshake,
  ShoppingBag,
  XCircle,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';
import useStore from '../../store/useStore';
import { useOrder } from '../../hooks/supabaseHooks';
import { useSound } from '../../hooks/useSound';

const formatTime = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return null;
  }
};

const Tracker = ({ onFeedback, onBackToMenu }) => {
  const activeOrderId = useStore((state) => state.activeOrderId);
  const setActiveOrderId = useStore((state) => state.setActiveOrderId);
  const soundEnabled = useStore((state) => state.soundEnabled);
  const toggleSound = useStore((state) => state.toggleSound);

  const { order, loading, cancelCurrentOrder, refetch } = useOrder(activeOrderId);
  const { playChime } = useSound();

  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const [prevStatus, setPrevStatus] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (order && order.status !== prevStatus) {
      if (order.status === 'ready' && prevStatus !== null) {
        setShowReadyBanner(true);
        if (soundEnabled) {
          try {
            playChime();
          } catch (e) {
            /* ignore audio errors on mobile */
          }
        }
        if (navigator.vibrate) {
          try {
            navigator.vibrate([200, 100, 200]);
          } catch (e) {
            /* ignore */
          }
        }
        if ('Notification' in window && window.Notification.permission === 'granted') {
          try {
            new window.Notification('Your Order is Ready!', {
              body: `Token #${order.tokenNumber} — Collect from counter`,
            });
          } catch (e) {
            /* ignore */
          }
        }
      }
      setPrevStatus(order.status);
    }
  }, [order, prevStatus, soundEnabled, playChime]);

  useEffect(() => {
    if (order && order.status === 'delivered') {
      setActiveOrderId(null);
      onFeedback();
    }
  }, [order, setActiveOrderId, onFeedback]);

  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      try {
        window.Notification.requestPermission();
      } catch (e) {
        /* ignore */
      }
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      await cancelCurrentOrder();
      setActiveOrderId(null);
      setConfirmCancel(false);
      onBackToMenu();
    } catch (err) {
      setConfirmCancel(false);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 font-bold text-gray-500">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        Loading order status...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <ShoppingBag size={48} className="text-gray-300 mb-4" />
        <p className="font-black text-gray-700 text-lg mb-1">No active order</p>
        <p className="text-xs text-gray-400 mb-6">Place an order from the menu to track it live here.</p>
        <button onClick={onBackToMenu} className="btn-primary">
          Back to Menu
        </button>
      </div>
    );
  }

  if (order.status === 'cancelled') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-red-50">
        <XCircle size={64} className="text-red-500 mb-5" />
        <h2 className="text-2xl font-black text-red-600 mb-2">Order Cancelled</h2>
        <p className="font-bold text-gray-700 mb-1">This order was cancelled.</p>
        <p className="text-xs text-gray-500 mb-8 max-w-xs">
          If you didn't cancel it, please check with the reception counter.
        </p>
        <button
          onClick={() => {
            setActiveOrderId(null);
            onBackToMenu();
          }}
          className="bg-red-600 text-white font-bold py-3.5 px-8 rounded-full shadow-lg active:scale-95 transition-transform"
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
    {
      label: 'Payment Pending',
      desc: `Pay ₹${order.totalAmount} (${order.paymentMethod === 'online' ? 'Online / UPI' : 'Cash'}) at desk`,
      time: formatTime(order.createdAt),
      icon: Clock,
      activeColor: 'bg-yellow-500 text-white',
    },
    {
      label: 'Payment Confirmed',
      desc: 'Token assigned & sent to kitchen',
      time: formatTime(order.approvedAt),
      icon: CheckCircle2,
      activeColor: 'bg-blue-500 text-white',
    },
    {
      label: 'In Kitchen',
      desc: 'Chef is preparing your order fresh',
      time: formatTime(order.cookingAt),
      icon: ChefHat,
      activeColor: 'bg-orange-500 text-white',
    },
    {
      label: 'Ready for Pickup',
      desc: 'Collect from the counter!',
      time: formatTime(order.readyAt),
      icon: HeartHandshake,
      activeColor: 'bg-green-500 text-white',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-background relative overflow-y-auto pb-8">
      {/* Top Token Hero */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary-dark pt-5 pb-12 px-5 text-center rounded-b-[2.5rem] shadow-md relative">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleManualRefresh}
            className="w-9 h-9 rounded-full bg-black/10 text-black flex items-center justify-center active:scale-90 transition-transform"
            title="Refresh Status"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <span className="text-black/80 font-black uppercase tracking-widest text-[11px]">
            {order.tokenNumber ? 'YOUR LIVE TOKEN' : 'ORDER PLACED'}
          </span>
          <button
            onClick={toggleSound}
            className="w-9 h-9 rounded-full bg-black/10 text-black flex items-center justify-center active:scale-90 transition-transform"
            title={soundEnabled ? 'Mute sound alerts' : 'Enable sound alerts'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {order.tokenNumber ? (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl font-black text-black leading-none tracking-tight drop-shadow-sm my-1"
          >
            #{order.tokenNumber}
          </motion.div>
        ) : (
          <div className="py-3">
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="inline-block bg-black text-primary px-5 py-2 rounded-full font-black text-sm uppercase tracking-wider shadow-lg"
            >
              ⏳ Awaiting Counter Payment
            </motion.div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mt-2 text-xs font-bold text-black/75">
          <span>Table {order.tableNumber}</span>
          <span>•</span>
          <span>Est. ~{order.estimatedMinutes || 8} mins</span>
        </div>
      </div>

      {/* Order Summary Card */}
      <div className="px-5 -mt-6 z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-black text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
              <ShoppingBag size={13} /> Order Summary
            </h3>
            <span className="text-[11px] font-bold text-gray-400">
              {order.customerName || 'Guest'}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items &&
              order.items.map((item, idx) => (
                <div key={idx} className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-primary/20 text-amber-900 font-black w-6 h-6 flex items-center justify-center rounded-md text-[11px]">
                      {item.qty}
                    </span>
                    {item.name}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    ₹{item.subtotal || item.price * item.qty}
                  </span>
                </div>
              ))}
          </div>
          {order.notes && (
            <div className="px-4 py-2 bg-amber-50/70 border-t border-amber-100 text-[11px] font-semibold text-amber-900">
              Note: {order.notes}
            </div>
          )}
          <div className="px-4 py-2.5 bg-gray-50 border-t flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase">Total</span>
            <span className="text-lg font-black text-secondary">₹{order.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Step Tracker Timeline */}
      <div className="flex-1 px-5 mt-4">
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 relative">
          <div className="absolute left-[39px] top-9 bottom-9 w-0.5 bg-gray-100" />
          <div className="space-y-5 relative z-10">
            {steps.map((step, i) => {
              const status = getStepStatus(i);
              const Icon = step.icon;
              return (
                <div key={i} className="flex gap-3.5 items-start">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-colors duration-300 ${
                      status === 'completed'
                        ? 'bg-green-500 text-white'
                        : status === 'current'
                        ? `${step.activeColor} ${order.status === 'ready' || order.status === 'cooking' ? 'animate-pulse' : ''}`
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`font-bold text-sm ${
                          status === 'current'
                            ? 'text-black'
                            : status === 'completed'
                            ? 'text-gray-700'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </h4>
                      {step.time && (
                        <span className="text-[10px] font-bold text-gray-400">{step.time}</span>
                      )}
                    </div>
                    <p
                      className={`text-xs ${
                        status === 'current' ? 'text-gray-600 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 px-5 flex flex-col gap-2">
        <button
          onClick={onBackToMenu}
          className="w-full bg-secondary text-primary font-black py-3.5 rounded-2xl hover:bg-gray-900 transition-colors text-sm shadow-md"
        >
          Browse Menu / Add More
        </button>

        {['pending_payment', 'approved'].includes(order.status) && !confirmCancel && (
          <button
            onClick={() => setConfirmCancel(true)}
            className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-2xl hover:bg-red-100 transition-colors text-xs flex items-center justify-center gap-1.5"
          >
            <XCircle size={15} /> Cancel This Order
          </button>
        )}

        {confirmCancel && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center space-y-2">
            <p className="text-xs font-bold text-red-800">Cancel this order?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCancel(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold text-xs py-2 rounded-xl"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1 bg-red-600 text-white font-bold text-xs py-2 rounded-xl disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Ready Banner */}
      <AnimatePresence>
        {showReadyBanner && order.status === 'ready' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-green-500 p-6"
          >
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl w-full max-w-sm">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5"
              >
                <HeartHandshake size={40} />
              </motion.div>
              <h2 className="text-2xl font-black mb-1 text-green-600">TOKEN #{order.tokenNumber}</h2>
              <h1 className="text-4xl font-black mb-3 text-black">IS READY!</h1>
              <p className="text-gray-600 font-bold mb-6 text-sm">
                Please collect your order from the pickup counter.
              </p>

              <button
                onClick={() => setShowReadyBanner(false)}
                className="w-full bg-black text-primary rounded-full py-4 font-black text-base uppercase tracking-wider shadow-lg"
              >
                Got It!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tracker;

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  RotateCcw,
  Coffee,
  Clock,
  Plus,
  Volume2,
  VolumeX,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import useStore from '../store/useStore';
import { useOrders, useCafeSettings, useDataMode } from '../hooks/supabaseHooks';
import { useSound } from '../hooks/useSound';
import { estimateOrderPrepMinutes } from '../utils/smartCafeAI';
import CRMOrderModal from '../components/CRMOrderModal';

const formatTimeAgo = (iso, nowMs) => {
  if (!iso) return 'Just now';
  const diffSec = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};

const ReceptionApp = ({ bypassPin = false }) => {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const login = useStore((state) => state.login);
  const soundEnabled = useStore((state) => state.soundEnabled);
  const toggleSound = useStore((state) => state.toggleSound);

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [activeTab, setActiveTab] = useState('pending');
  const [activeFilter, setActiveFilter] = useState('all'); // all | approved | cooking | ready
  const [tokenSearch, setTokenSearch] = useState('');

  const {
    orders,
    loading,
    approveOrderAndAssignToken,
    updateOrderItems,
    updateOrderStatus,
    revertOrderToPending,
    cancelOrder,
    refetch,
  } = useOrders();
  const { settings } = useCafeSettings();
  const { isLive, backendLabel } = useDataMode();
  const { playChime } = useSound();

  const [processingId, setProcessingId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'cancel'|'revert', order }
  const [nowMs, setNowMs] = useState(() => Date.now());
  const prevPendingCountRef = useRef(0);

  const showToast = (message, tone = 'success') => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const pendingOrders = useMemo(
    () => [...orders].filter((o) => o.status === 'pending_payment').reverse(),
    [orders]
  );

  const activeOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!['approved', 'cooking', 'ready'].includes(o.status)) return false;
      if (activeFilter !== 'all' && o.status !== activeFilter) return false;
      if (tokenSearch.trim()) {
        const q = tokenSearch.trim().toLowerCase();
        const matchesToken = String(o.tokenNumber || '').toLowerCase().includes(q);
        const matchesTable = String(o.tableNumber || '').toLowerCase().includes(q);
        const matchesName = String(o.customerName || '').toLowerCase().includes(q);
        return matchesToken || matchesTable || matchesName;
      }
      return true;
    });
  }, [orders, activeFilter, tokenSearch]);

  const todayStats = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayStart = startOfDay.getTime();
    const todayPaid = orders.filter(
      (o) =>
        new Date(o.createdAt).getTime() >= todayStart &&
        !['pending_payment', 'cancelled'].includes(o.status)
    );
    const revenue = todayPaid.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const waitEstimate = estimateOrderPrepMinutes([], orders, settings.rushMode);
    return {
      paidCount: todayPaid.length,
      revenue,
      waitEstimate,
    };
  }, [orders, settings.rushMode]);

  useEffect(() => {
    if (pendingOrders.length > prevPendingCountRef.current && prevPendingCountRef.current !== 0) {
      if (soundEnabled) {
        try {
          playChime();
        } catch {
          /* ignore */
        }
      }
    }
    prevPendingCountRef.current = pendingOrders.length;
  }, [pendingOrders.length, soundEnabled, playChime]);

  const expectedPin = String(import.meta.env.VITE_RECEPTION_PIN || '1234');

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === expectedPin) {
      login();
      setPinError('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  const handleApprove = async (orderId) => {
    setProcessingId(orderId);
    try {
      const token = await approveOrderAndAssignToken(orderId);
      if (soundEnabled) {
        try {
          playChime();
        } catch (e) {
          /* ignore */
        }
      }
      showToast(`Token #${token} assigned & sent to kitchen!`);
    } catch (error) {
      showToast('Failed to approve order', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExecuteConfirm = async () => {
    if (!confirmAction) return;
    const { type, order } = confirmAction;
    setProcessingId(order.id);
    try {
      if (type === 'cancel') {
        await cancelOrder(order.id);
        showToast('Order cancelled');
      } else if (type === 'revert') {
        await revertOrderToPending(order.id);
        showToast('Order reverted to pending payment');
      }
    } catch (err) {
      showToast('Action failed. Please try again.', 'error');
    } finally {
      setProcessingId(null);
      setConfirmAction(null);
    }
  };

  const handleMarkDelivered = async (order) => {
    setProcessingId(order.id);
    try {
      await updateOrderStatus(order.id, 'delivered');
      showToast(`Token #${order.tokenNumber} marked delivered`);
    } catch (err) {
      showToast('Failed to update status', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditItems(JSON.parse(JSON.stringify(order.items || [])));
  };

  const closeEditModal = () => {
    setEditingOrder(null);
    setEditItems([]);
  };

  const updateEditItemQty = (idx, delta) => {
    setEditItems((prev) => {
      const newItems = [...prev];
      newItems[idx].qty = Math.max(0, newItems[idx].qty + delta);
      return newItems;
    });
  };

  const saveEditOrder = async () => {
    const finalItems = editItems.filter((item) => item.qty > 0);
    if (finalItems.length === 0) {
      setConfirmAction({ type: 'cancel', order: editingOrder });
      closeEditModal();
      return;
    }

    setProcessingId(`edit_${editingOrder.id}`);
    try {
      await updateOrderItems(editingOrder.id, finalItems);
      showToast('Order items updated');
      closeEditModal();
    } catch (e) {
      showToast('Failed to update order', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (!bypassPin && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-surface p-6 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-5"
        >
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-primary-dark">
              Chatter &amp; Platter
            </span>
            <h2 className="text-2xl font-black mt-1">RECEPTION LOGIN</h2>
          </div>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setPinError('');
            }}
            placeholder="••••"
            className="w-full bg-gray-100 p-4 rounded-2xl text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={4}
          />
          {pinError && <p className="text-xs font-bold text-red-600">{pinError}</p>}
          <button type="submit" className="w-full btn-primary text-base py-3.5">
            Unlock Desk
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-secondary font-sans flex flex-col">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full shadow-xl font-bold text-xs text-white ${
              toast.tone === 'error' ? 'bg-red-600' : 'bg-black border border-primary/50 text-primary'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-secondary text-white p-3 sm:p-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base sm:text-xl font-black text-primary leading-none">
                C&amp;P RECEPTION
              </h1>
              <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400' : 'bg-amber-400'}`} />
                {backendLabel}
              </span>
            </div>
            <button
              onClick={() => setShowCRMModal(true)}
              className="hidden sm:flex items-center gap-1.5 bg-primary text-black hover:bg-primary-dark px-3.5 py-2 rounded-full text-xs font-black transition-colors shadow"
            >
              <Plus size={15} strokeWidth={2.5} /> New Walk-in Order
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleSound}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:text-white"
              title="Toggle alert chime"
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button
              onClick={refetch}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:text-white"
              title="Refresh orders"
            >
              <RotateCcw size={15} />
            </button>

            <div className="flex bg-gray-800 rounded-full p-1 gap-1">
              <button
                onClick={() => setShowCRMModal(true)}
                className="flex sm:hidden items-center justify-center bg-primary text-black w-7 h-7 rounded-full"
              >
                <Plus size={15} />
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-colors relative ${
                  activeTab === 'pending' ? 'bg-primary text-black' : 'text-gray-300'
                }`}
              >
                Pending ({pendingOrders.length})
                {pendingOrders.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-800 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  activeTab === 'active' ? 'bg-primary text-black' : 'text-gray-300'
                }`}
              >
                Active
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* AI Wait & Daily Summary Strip */}
      <div className="bg-white border-b border-gray-100 px-3 sm:px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <div className="flex items-center gap-4">
            <span className="text-gray-500">
              Today: <strong className="text-secondary">{todayStats.paidCount} orders</strong>
            </span>
            <span className="text-gray-500">
              Revenue: <strong className="text-green-600">₹{todayStats.revenue}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 text-amber-900 px-3 py-1 rounded-full">
            <Sparkles size={12} className="text-primary-dark" />
            <span>Est. Kitchen Wait: ~{todayStats.waitEstimate} mins</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-3 sm:p-4 overflow-y-auto">
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold text-sm">Loading orders...</div>
        ) : activeTab === 'pending' ? (
          <div className="space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Coffee size={44} className="mx-auto mb-3 opacity-40" />
                <p className="font-bold text-lg text-gray-500">No pending payments</p>
                <p className="text-xs text-gray-400 mt-1">
                  New table QR orders will pop in automatically.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {pendingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -40, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 border-l-4 border-l-primary"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-black text-primary px-2.5 py-1 rounded-full text-xs font-black">
                          Table {order.tableNumber}
                        </span>
                        {order.customerName && (
                          <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full text-xs font-bold">
                            {order.customerName}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            order.paymentMethod === 'online'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {order.paymentMethod === 'online' ? '📱 Online' : '💵 Cash'}
                        </span>
                        <span className="text-gray-400 text-xs font-semibold flex items-center gap-1">
                          <Clock size={12} /> {formatTimeAgo(order.createdAt, nowMs)}
                        </span>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEditModal(order)}
                          className="text-xs text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'cancel', order })}
                          className="text-xs text-red-600 font-bold bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    <div className="mb-3 space-y-1 bg-gray-50 rounded-xl p-3">
                      {order.items &&
                        order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs sm:text-sm text-gray-700">
                            <span className="font-semibold">
                              {item.qty}× {item.name}
                            </span>
                            <span className="font-bold">₹{item.subtotal || item.price * item.qty}</span>
                          </div>
                        ))}
                      {order.notes && (
                        <div className="pt-1.5 mt-1.5 border-t border-gray-200 text-xs font-bold text-amber-800">
                          Note: {order.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-2xl font-black text-secondary">₹{order.totalAmount}</div>
                      <button
                        onClick={() => handleApprove(order.id)}
                        disabled={processingId === order.id}
                        className="bg-primary text-black px-5 py-3 rounded-xl font-black hover:bg-primary-dark active:scale-95 transition-transform text-xs sm:text-sm uppercase tracking-wider shadow disabled:opacity-50"
                      >
                        {processingId === order.id ? 'Assigning...' : 'Confirm Payment & Token'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Tab Filters + Token Search */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
              <div className="flex bg-white p-1 rounded-xl border border-gray-200 gap-1 overflow-x-auto">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'approved', label: 'Queued' },
                  { id: 'cooking', label: 'Cooking' },
                  { id: 'ready', label: 'Ready' },
                ].map((seg) => (
                  <button
                    key={seg.id}
                    onClick={() => setActiveFilter(seg.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      activeFilter === seg.id ? 'bg-black text-primary' : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>

              <div className="relative sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={tokenSearch}
                  onChange={(e) => setTokenSearch(e.target.value)}
                  placeholder="Search token #, table, name..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {activeOrders.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="font-bold text-base">No matching active orders</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`bg-white flex flex-col rounded-2xl shadow-sm p-4 border border-gray-100 border-l-4 ${
                      order.status === 'ready'
                        ? 'border-l-green-500'
                        : order.status === 'cooking'
                        ? 'border-l-orange-500'
                        : 'border-l-yellow-400'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Token</span>
                          <div className="text-3xl font-black leading-none text-gray-900">
                            #{order.tokenNumber}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full ${
                            order.status === 'ready'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'cooking'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {order.status === 'ready' ? 'Ready for Pickup' : order.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2 text-xs">
                        <span className="font-bold text-gray-600">Table {order.tableNumber}</span>
                        {order.customerName && (
                          <span className="font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {order.customerName}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 ml-auto font-semibold">
                          {formatTimeAgo(order.approvedAt || order.createdAt, nowMs)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 font-medium line-clamp-2">
                        {order.items && order.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                      </p>
                      {order.notes && (
                        <p className="text-[11px] text-amber-800 font-bold mt-1">Note: {order.notes}</p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
                      {order.status === 'ready' && (
                        <button
                          onClick={() => handleMarkDelivered(order)}
                          disabled={processingId === order.id}
                          className="w-full mb-1 bg-green-600 text-white font-black text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-green-700"
                        >
                          <CheckCircle2 size={14} /> Handed Over (Mark Delivered)
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(order)}
                        className="flex-1 bg-blue-50 text-blue-600 font-bold text-xs py-2 rounded-lg"
                      >
                        Edit Items
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'revert', order })}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold text-xs py-2 rounded-lg"
                      >
                        Revert
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'cancel', order })}
                        className="flex-1 bg-red-50 text-red-600 font-bold text-xs py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
            >
              <h3 className="font-black text-lg">
                {confirmAction.type === 'cancel'
                  ? 'Cancel This Order?'
                  : 'Revert to Pending Payment?'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {confirmAction.type === 'cancel'
                  ? `Order for Table ${confirmAction.order.tableNumber} will be cancelled.`
                  : `Token #${confirmAction.order.tokenNumber || ''} will be cleared and returned to Pending.`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-xs"
                >
                  Keep As Is
                </button>
                <button
                  onClick={handleExecuteConfirm}
                  className={`flex-1 font-black py-3 rounded-xl text-xs text-white ${
                    confirmAction.type === 'cancel' ? 'bg-red-600' : 'bg-black text-primary'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Order Modal */}
      <AnimatePresence>
        {editingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-black text-lg">Edit Order</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Table {editingOrder.tableNumber} • {editingOrder.customerName}
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {editItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      item.qty === 0 ? 'bg-red-50 border-red-100 opacity-55' : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="font-bold text-sm text-gray-800 truncate">{item.name}</div>
                      <div className="text-xs font-medium text-gray-500">₹{item.price} each</div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-gray-100 rounded-lg p-1 shrink-0">
                      <button
                        onClick={() => updateEditItemQty(idx, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-gray-600 shadow-sm font-bold"
                      >
                        -
                      </button>
                      <span className="font-black text-sm w-4 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateEditItemQty(idx, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-gray-600 shadow-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-500 text-sm">New Total</span>
                  <span className="font-black text-xl text-secondary">
                    ₹{editItems.reduce((sum, item) => sum + item.price * item.qty, 0)}
                  </span>
                </div>
                <button
                  onClick={saveEditOrder}
                  disabled={processingId === `edit_${editingOrder.id}`}
                  className="w-full bg-primary text-black font-black py-3 rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {processingId === `edit_${editingOrder.id}` ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRM Order Modal */}
      <AnimatePresence>
        {showCRMModal && (
          <CRMOrderModal
            onClose={() => setShowCRMModal(false)}
            onSuccess={(token) => showToast(`Walk-in Token #${token} sent to Kitchen!`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReceptionApp;

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  Flame,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import useStore from '../store/useStore';
import { useOrders, useMenu, useCafeSettings, useDataMode } from '../hooks/supabaseHooks';
import { useSound } from '../hooks/useSound';
import { computeKitchenBatchInsights } from '../utils/smartCafeAI';

const formatElapsed = (iso, nowMs) => {
  if (!iso) return { text: '0:00', mins: 0 };
  const diffSec = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return {
    text: `${mins}:${String(secs).padStart(2, '0')}`,
    mins,
  };
};

const ChefOrderCard = ({
  order,
  onAction,
  actionText,
  actionColor,
  isLoading,
  onUndo,
  undoText,
  nowMs,
}) => {
  const elapsed = formatElapsed(order.approvedAt || order.createdAt, nowMs);
  const isOverdue = elapsed.mins >= 12;
  const isWarning = elapsed.mins >= 8 && elapsed.mins < 12;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl border overflow-hidden flex flex-col mb-3 ${
        isOverdue
          ? 'border-red-500 ring-2 ring-red-500/40'
          : isWarning
          ? 'border-amber-500/70'
          : 'border-gray-700/60'
      }`}
    >
      <div className="p-4 flex-1">
        <div className="flex justify-between items-start mb-3 gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                Token
              </span>
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isOverdue
                    ? 'bg-red-500/20 text-red-400 animate-pulse'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                <Clock size={10} /> {elapsed.text}
              </span>
            </div>
            <div className="text-5xl lg:text-6xl font-black text-white leading-none tracking-tighter truncate">
              #{order.tokenNumber || '—'}
            </div>
          </div>

          <div className="bg-gray-900/90 border border-gray-700 px-3 py-2 rounded-xl text-center shrink-0 min-w-[72px]">
            <div className="text-gray-400 text-[10px] font-bold uppercase mb-0.5">Table</div>
            <div className="text-lg lg:text-xl font-black text-primary truncate">
              {order.tableNumber}
            </div>
            {order.customerName && (
              <div className="text-[10px] text-gray-300 mt-0.5 truncate max-w-[90px] mx-auto font-bold uppercase">
                {order.customerName}
              </div>
            )}
          </div>
        </div>

        {order.notes && (
          <div className="mb-3 bg-amber-500/15 border border-amber-400/40 text-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle size={13} className="shrink-0 text-amber-400" />
            <span>{order.notes}</span>
          </div>
        )}

        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent my-3" />

        <ul className="space-y-2">
          {order.items &&
            order.items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center text-sm sm:text-base text-gray-100 font-semibold"
              >
                <span className="bg-primary text-black font-black w-7 h-7 flex items-center justify-center rounded-lg text-sm shrink-0 mr-2.5 shadow-sm">
                  {item.qty}
                </span>
                <span className="line-clamp-2 leading-tight">{item.name}</span>
              </li>
            ))}
        </ul>
      </div>

      <div className="flex border-t border-gray-700/60">
        {onUndo && (
          <button
            onClick={() => onUndo(order)}
            disabled={isLoading}
            className="w-1/3 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors disabled:opacity-50 bg-gray-900/70 hover:bg-gray-800 text-gray-400 hover:text-white"
          >
            {undoText || 'Undo'}
          </button>
        )}
        <button
          onClick={() => onAction(order)}
          disabled={isLoading}
          className={`${
            onUndo ? 'w-2/3 border-l border-gray-700/60' : 'w-full'
          } py-3.5 sm:py-4 text-sm sm:text-base font-black uppercase tracking-widest transition-all disabled:opacity-50 ${actionColor} hover:brightness-110 active:scale-[0.98]`}
        >
          {isLoading ? 'Updating...' : actionText}
        </button>
      </div>
    </motion.div>
  );
};

const ChefApp = ({ bypassPin = false }) => {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const login = useStore((state) => state.login);
  const soundEnabled = useStore((state) => state.soundEnabled);
  const toggleSound = useStore((state) => state.toggleSound);

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const { orders, updateOrderStatus } = useOrders();
  const { menu, toggleMenuItemAvailability } = useMenu();
  const { settings, updateSettings } = useCafeSettings();
  const { isLive, backendLabel } = useDataMode();
  const { playLoudBeep } = useSound();

  const queuedAlertRef = useRef(false);
  const prevNewCountRef = useRef(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [activeTab, setActiveTab] = useState('new');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const firstLoadRef = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const newOrders = useMemo(() => orders.filter((o) => o.status === 'approved'), [orders]);
  const cookingOrders = useMemo(() => orders.filter((o) => o.status === 'cooking'), [orders]);
  const readyOrders = useMemo(() => orders.filter((o) => o.status === 'ready'), [orders]);

  const batchInsights = useMemo(() => computeKitchenBatchInsights(orders), [orders]);

  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      prevNewCountRef.current = newOrders.length;
      return;
    }
    if (newOrders.length > prevNewCountRef.current) {
      if (document.hidden) {
        queuedAlertRef.current = true;
      } else if (soundEnabled) {
        try {
          playLoudBeep();
        } catch {
          /* ignore */
        }
      }
    }
    prevNewCountRef.current = newOrders.length;
  }, [newOrders.length, soundEnabled, playLoudBeep]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && queuedAlertRef.current) {
        queuedAlertRef.current = false;
        if (soundEnabled) {
          try {
            playLoudBeep();
          } catch {
            /* ignore */
          }
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [soundEnabled, playLoudBeep]);

  const handleAction = async (order, newStatus) => {
    setProcessingId(order.id);
    try {
      await updateOrderStatus(order.id, newStatus);
      if (newStatus === 'ready' && soundEnabled) {
        try {
          playLoudBeep();
        } catch (e) {
          /* ignore */
        }
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const expectedPin = String(import.meta.env.VITE_CHEF_PIN || '5678');

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

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    } catch (e) {
      /* ignore */
    }
  };

  if (!bypassPin && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-gray-800 border border-gray-700 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-5"
        >
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              Chatter &amp; Platter
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">KITCHEN LOGIN</h2>
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
            className="w-full bg-gray-900 text-white p-4 rounded-2xl text-center text-3xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={4}
          />
          {pinError && <p className="text-xs font-bold text-red-400">{pinError}</p>}
          <button
            type="submit"
            className="w-full bg-primary text-black py-3.5 rounded-2xl text-lg font-black uppercase transition-colors hover:bg-primary-dark"
          >
            Enter Kitchen
          </button>
        </form>
      </div>
    );
  }

  const renderColumn = (
    title,
    columnOrders,
    actionText,
    actionColor,
    bgColor,
    newStatus,
    undoStatus = null
  ) => (
    <div className="flex flex-col h-full bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden w-full">
      <div
        className={`${bgColor} p-3 text-center font-black text-sm lg:text-lg uppercase tracking-widest shrink-0`}
      >
        {title} ({columnOrders.length})
      </div>
      <div
        className={`flex-1 overflow-y-auto p-3 hide-scrollbar ${
          columnOrders.length === 0 ? 'flex items-center justify-center' : 'space-y-3'
        }`}
      >
        <AnimatePresence>
          {columnOrders.map((order) => (
            <ChefOrderCard
              key={order.id}
              order={order}
              onAction={(o) => handleAction(o, newStatus)}
              actionText={actionText}
              actionColor={actionColor}
              isLoading={processingId === order.id}
              onUndo={undoStatus ? (o) => handleAction(o, undoStatus) : null}
              undoText="Undo"
              nowMs={nowMs}
            />
          ))}
        </AnimatePresence>
        {columnOrders.length === 0 && (
          <div className="text-center text-gray-600 font-bold text-sm">Queue clear</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-gray-950 p-2.5 sm:p-3.5 flex items-center justify-between border-b border-gray-800 shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base sm:text-xl font-black text-primary tracking-wider leading-none">
              C&amp;P KITCHEN
            </h1>
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400' : 'bg-amber-400'}`} />
              {backendLabel}
            </span>
          </div>

          <button
            onClick={() => updateSettings({ rushMode: !settings.rushMode })}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase border transition-colors ${
              settings.rushMode
                ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Flame size={13} /> {settings.rushMode ? 'Rush Mode: ON' : 'Rush Mode'}
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile tab switcher */}
          <div className="flex md:hidden bg-gray-800 rounded-full p-1 gap-0.5">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors relative ${
                activeTab === 'new' ? 'bg-primary text-black' : 'text-gray-400'
              }`}
            >
              New
              {newOrders.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('cooking')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                activeTab === 'cooking' ? 'bg-orange-500 text-white' : 'text-gray-400'
              }`}
            >
              Cook
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                activeTab === 'ready' ? 'bg-green-500 text-white' : 'text-gray-400'
              }`}
            >
              Ready
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                activeTab === 'inventory' ? 'bg-blue-500 text-white' : 'text-gray-400'
              }`}
            >
              Stock
            </button>
          </div>

          <button
            onClick={() => setActiveTab((prev) => (prev === 'inventory' ? 'new' : 'inventory'))}
            className={`hidden md:block px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border ${
              activeTab === 'inventory'
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {activeTab === 'inventory' ? 'Back to KDS' : 'Stock Status'}
          </button>

          <button
            onClick={toggleSound}
            className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors"
            title={soundEnabled ? 'Mute Kitchen Chime' : 'Unmute Kitchen Chime'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-red-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* AI Batch Prep Summary Bar */}
      {activeTab !== 'inventory' && batchInsights.batchList.length > 0 && (
        <div className="bg-gray-900/95 border-b border-gray-800 px-3 sm:px-4 py-2 flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
          <span className="text-[11px] font-black text-primary uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Sparkles size={13} /> Batch Prep:
          </span>
          {batchInsights.batchList.slice(0, 8).map((b) => (
            <span
              key={b.name}
              className="bg-gray-800 border border-gray-700 text-gray-100 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
            >
              <strong className="text-primary">{b.qty}×</strong> {b.name}
            </span>
          ))}
        </div>
      )}

      {activeTab === 'inventory' ? (
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-blue-950 p-4 border-b border-blue-900 shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <h2 className="text-lg font-black text-white uppercase tracking-widest">
                  Live Kitchen Stock
                </h2>
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 bg-gray-900 text-white border border-blue-800 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="p-4 space-y-2.5 overflow-y-auto">
              {menu
                .filter((item) => item.name.toLowerCase().includes(inventorySearch.toLowerCase()))
                .map((item) => {
                  const available = item.isAvailable !== false;
                  return (
                    <div
                      key={item.id || item.itemId}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                        available ? 'bg-gray-800 border-gray-700' : 'bg-red-950/30 border-red-900/50'
                      }`}
                    >
                      <div>
                        <h3 className={`font-bold text-base ${available ? 'text-white' : 'text-gray-400'}`}>
                          {item.name}
                        </h3>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                      <button
                        onClick={() => toggleMenuItemAvailability(item.id, available)}
                        className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wide transition-colors ${
                          available
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                      >
                        {available ? 'Mark Sold Out' : 'Restock Item'}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </main>
      ) : (
        <>
          <main className="hidden md:grid flex-1 grid-cols-3 gap-4 p-4 overflow-hidden">
            {renderColumn(
              'New Orders',
              newOrders,
              'Start Cooking',
              'bg-orange-500 hover:bg-orange-600 text-white',
              'bg-primary text-black',
              'cooking'
            )}
            {renderColumn(
              'Cooking',
              cookingOrders,
              'Order Ready',
              'bg-green-500 hover:bg-green-600 text-white',
              'bg-orange-500 text-white',
              'ready',
              'approved'
            )}
            {renderColumn(
              'Ready',
              readyOrders,
              'Mark Delivered',
              'bg-gray-700 hover:bg-gray-600 text-gray-200',
              'bg-green-500 text-white',
              'delivered',
              'cooking'
            )}
          </main>

          <main className="flex md:hidden flex-1 p-3 overflow-hidden">
            {activeTab === 'new' &&
              renderColumn(
                'New Orders',
                newOrders,
                'Start Cooking',
                'bg-orange-500 hover:bg-orange-600 text-white',
                'bg-primary text-black',
                'cooking'
              )}
            {activeTab === 'cooking' &&
              renderColumn(
                'Cooking',
                cookingOrders,
                'Order Ready',
                'bg-green-500 hover:bg-green-600 text-white',
                'bg-orange-500 text-white',
                'ready',
                'approved'
              )}
            {activeTab === 'ready' &&
              renderColumn(
                'Ready',
                readyOrders,
                'Mark Delivered',
                'bg-gray-700 hover:bg-gray-600 text-gray-200',
                'bg-green-500 text-white',
                'delivered',
                'cooking'
              )}
          </main>
        </>
      )}
    </div>
  );
};

export default ChefApp;

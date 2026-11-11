import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Receipt, Sparkles, Search, Clock, Leaf, Flame } from 'lucide-react';
import useStore from '../../store/useStore';
import { useMenu, useOrders, useCafeSettings } from '../../hooks/supabaseHooks';
import { estimateOrderPrepMinutes } from '../../utils/smartCafeAI';
import MenuCard from '../../components/MenuCard';
import CartBar from '../../components/CartBar';
import AICravingsDrawer from '../../components/AICravingsDrawer';

const CATEGORIES = ['HOT', 'COLD', 'MOMO', 'FRIES', 'PASTA', 'MAGGI', 'SANDWICH'];

const Menu = ({ onCartClick, onTrackerClick, onBackClick }) => {
  const tableNumber = useStore((state) => state.tableNumber);
  const customerName = useStore((state) => state.customerName);
  const activeOrderId = useStore((state) => state.activeOrderId);
  const cart = useStore((state) => state.cart);

  const { menu, loading } = useMenu();
  const { orders } = useOrders(['approved', 'cooking']);
  const { settings } = useCafeSettings();

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const kitchenWaitMins = useMemo(
    () => estimateOrderPrepMinutes(cart.length ? cart : [{ prepMinutes: 6 }], orders, settings.rushMode),
    [cart, orders, settings.rushMode]
  );

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
      const matchesVeg = !vegOnly || item.isVeg !== false;
      return matchesSearch && matchesVeg && (searchQuery ? true : matchesCategory);
    });
  }, [menu, searchQuery, activeCategory, vegOnly]);

  return (
    <div className="h-full flex flex-col bg-background relative pb-24">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md pt-4 pb-2.5 px-4 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBackClick}
            className="w-10 h-10 -ml-1 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h2 className="font-black text-base tracking-tight leading-none">
              {customerName ? `Hey, ${customerName.split(' ')[0]}` : 'CHATTER MENU'}
            </h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {tableNumber ? `Table ${tableNumber.padStart(2, '0')}` : 'Takeaway'}
              </span>
              <span className="text-gray-300">•</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  settings.rushMode
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                <Clock size={10} /> ~{kitchenWaitMins}m
              </span>
            </div>
          </div>

          <div className="w-10 flex justify-end">
            {activeOrderId && (
              <button
                onClick={onTrackerClick}
                title="Track Active Order"
                className="w-10 h-10 rounded-full bg-primary text-black shadow-md flex items-center justify-center active:scale-95 transition-transform relative"
              >
                <Receipt size={18} />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
              </button>
            )}
          </div>
        </div>

        {/* AI Barista CTA Pill */}
        <button
          onClick={() => setShowAI(true)}
          className="w-full mb-3 bg-gradient-to-r from-secondary via-stone-900 to-black text-white rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-md active:scale-[0.99] transition-transform border border-primary/20"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-primary text-black flex items-center justify-center shrink-0">
              <Sparkles size={15} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-black text-primary truncate">Ask Chatter AI Barista</p>
              <p className="text-[10px] text-gray-300 truncate">
                Cravings, budget picks &amp; 1-tap campus combos
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase bg-primary/20 text-primary px-2.5 py-1 rounded-full shrink-0">
            Try AI
          </span>
        </button>

        {/* Search + Veg Toggle */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search chai, momos, Maggi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>
          <button
            onClick={() => setVegOnly((v) => !v)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 ${
              vegOnly
                ? 'bg-green-600 border-green-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <Leaf size={13} /> Veg
          </button>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex overflow-x-auto hide-scrollbar gap-1.5 pb-1 snap-x">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`snap-start whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-xs transition-colors ${
              activeCategory === 'ALL' && !searchQuery
                ? 'bg-black text-primary shadow-md'
                : 'bg-gray-200/80 text-gray-600 hover:bg-gray-300'
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
              className={`snap-start whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-xs transition-colors ${
                activeCategory === cat && !searchQuery
                  ? 'bg-black text-primary shadow-md'
                  : 'bg-gray-200/80 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Rush / Announcement Strip if applicable */}
      {settings.rushMode && (
        <div className="mx-4 mt-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-bold text-orange-800">
          <Flame size={14} className="text-orange-500 shrink-0" />
          Kitchen is in peak rush — prep times updated automatically.
        </div>
      )}

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-48 space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-sm">Loading fresh menu...</p>
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-48 space-y-3 text-center px-6">
            <p className="text-gray-500 font-bold text-sm">No matching items found.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('ALL');
                setVegOnly(false);
              }}
              className="text-xs font-black uppercase bg-primary text-black px-4 py-2 rounded-full"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: 0.03 } },
            }}
          >
            {filteredMenu.map((item) => (
              <MenuCard key={item.id || item.itemId} item={item} />
            ))}
          </motion.div>
        )}
      </div>

      <CartBar onClick={onCartClick} etaMinutes={kitchenWaitMins} />

      <AICravingsDrawer
        isOpen={showAI}
        onClose={() => setShowAI(false)}
        menu={menu}
        vegOnly={vegOnly}
      />
    </div>
  );
};

export default Menu;

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Clock, Flame, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';

const categoryColors = {
  HOT: 'from-amber-900 via-amber-800 to-stone-900 text-amber-200',
  COLD: 'from-sky-900 via-cyan-800 to-slate-900 text-cyan-200',
  MOMO: 'from-rose-900 via-red-800 to-stone-900 text-rose-200',
  FRIES: 'from-yellow-600 via-amber-600 to-orange-700 text-yellow-100',
  PASTA: 'from-emerald-800 via-teal-800 to-stone-900 text-emerald-200',
  MAGGI: 'from-amber-500 via-orange-500 to-red-600 text-white',
  SANDWICH: 'from-amber-700 via-orange-700 to-stone-800 text-amber-100',
};

const categoryImages = {
  HOT: '/images/coffee.jpg',
  COLD: '/images/coffee.jpg',
  MOMO: '/images/momo.jpg',
  FRIES: '/images/fries.jpg',
  PASTA: '/images/pasta.jpg',
  SANDWICH: '/images/sandwich.jpg',
};

const isMatch = (cartItem, menuItem) => {
  const cartId = String(cartItem.itemId ?? cartItem.id ?? '');
  const menuId = String(menuItem.id ?? menuItem.itemId ?? '');
  if (cartId && menuId && cartId === menuId) return true;
  if (cartItem.name === menuItem.name && Number(cartItem.price) === Number(menuItem.price)) return true;
  return false;
};

const DietIndicator = ({ isVeg = true, isEgg = false }) => {
  const borderColor = isVeg ? 'border-green-600' : isEgg ? 'border-amber-500' : 'border-red-600';
  const dotColor = isVeg ? 'bg-green-600' : isEgg ? 'bg-amber-500' : 'bg-red-600';
  return (
    <span
      className={`w-4 h-4 rounded-[4px] border-[1.5px] ${borderColor} bg-white/95 flex items-center justify-center shadow-sm shrink-0`}
      title={isVeg ? 'Vegetarian' : isEgg ? 'Contains Egg' : 'Non-Vegetarian'}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
    </span>
  );
};

const MenuCard = ({ item, aiReason = null }) => {
  const cartItem = useStore(
    useCallback((state) => state.cart.find((c) => isMatch(c, item)), [item])
  );

  const quantity = cartItem ? cartItem.qty : 0;
  const addToCart = useStore((state) => state.addToCart);
  const updateQuantity = useStore((state) => state.updateQuantity);

  const isAvailable = item.isAvailable !== false;
  const isBestseller = (item.tags || []).includes('bestseller');
  const isSpicy = (item.tags || []).includes('spicy');

  const handleAdd = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    addToCart(item);
  };

  const handleIncrease = (e) => {
    e.stopPropagation();
    if (cartItem) updateQuantity(cartItem.itemId || cartItem.id, 1);
  };

  const handleDecrease = (e) => {
    e.stopPropagation();
    if (cartItem) updateQuantity(cartItem.itemId || cartItem.id, -1);
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0 },
      }}
      whileTap={isAvailable ? { scale: 0.98 } : undefined}
      className={`bg-surface rounded-2xl shadow-sm hover:shadow-md overflow-hidden border border-gray-100/90 flex flex-col h-full transition-all ${
        !isAvailable ? 'opacity-65 grayscale' : ''
      } ${quantity > 0 ? 'ring-2 ring-primary/80 border-primary/50' : ''}`}
    >
      {/* Top Visual */}
      <div className="h-28 w-full relative overflow-hidden">
        {categoryImages[item.category] ? (
          <>
            <img
              src={categoryImages[item.category]}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          </>
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${
              categoryColors[item.category] || 'from-gray-700 to-gray-900 text-white'
            } flex flex-col items-center justify-center relative`}
          >
            <span className="font-black text-xl tracking-widest opacity-30 uppercase">{item.category}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
          <DietIndicator isVeg={item.isVeg !== false} isEgg={Boolean(item.isEgg)} />
          {isBestseller && (
            <span className="bg-primary text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
              <Sparkles size={9} /> Hit
            </span>
          )}
        </div>

        {/* Bottom Visual Meta */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock size={10} className="text-primary" /> ~{item.prepMinutes || 6}m
          </span>
          {isSpicy && (
            <span className="bg-red-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Flame size={9} /> Spicy
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 flex flex-col flex-grow justify-between gap-2">
        <div>
          {aiReason && (
            <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-md px-1.5 py-0.5 mb-1 inline-block">
              ✨ {aiReason}
            </div>
          )}
          <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 text-sm">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-medium">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-1 gap-1">
          <span className="text-base font-black text-secondary">₹{item.price}</span>

          {!isAvailable ? (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase tracking-wide">
              Sold Out
            </span>
          ) : quantity > 0 ? (
            <div className="flex items-center bg-black text-white rounded-full p-0.5 gap-1.5 shadow-md">
              <button
                onClick={handleDecrease}
                aria-label={`Decrease ${item.name}`}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 text-white active:scale-90 transition-transform shrink-0"
              >
                <Minus size={13} />
              </button>
              <span className="font-black w-4 text-center text-xs text-primary">{quantity}</span>
              <button
                onClick={handleIncrease}
                aria-label={`Increase ${item.name}`}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-black active:scale-90 transition-transform shrink-0"
              >
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              aria-label={`Add ${item.name}`}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-black shadow-md hover:bg-primary-dark active:scale-90 transition-transform"
            >
              <Plus size={19} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MenuCard;

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import useStore from '../store/useStore';

const categoryColors = {
  HOT: 'bg-orange-100 text-orange-800',
  COLD: 'bg-blue-100 text-blue-800',
  MOMO: 'bg-red-100 text-red-800',
  FRIES: 'bg-yellow-100 text-yellow-800',
  PASTA: 'bg-green-100 text-green-800',
  MAGGI: 'bg-yellow-200 text-yellow-900',
  SANDWICH: 'bg-amber-100 text-amber-800',
};

// Helper: check if a cart item matches a menu item
const isMatch = (cartItem, menuItem) => {
  const cartId = String(cartItem.itemId ?? cartItem.id ?? '');
  const menuId = String(menuItem.id ?? menuItem.itemId ?? '');
  if (cartId && menuId && cartId === menuId) return true;
  // Fallback: match by name + price (bulletproof)
  if (cartItem.name === menuItem.name && Number(cartItem.price) === Number(menuItem.price)) return true;
  return false;
};

const MenuCard = ({ item }) => {
  // Use a selector that returns the full matched cart item
  const cartItem = useStore(useCallback(
    (state) => state.cart.find(c => isMatch(c, item)),
    [item]
  ));
  
  const quantity = cartItem ? cartItem.qty : 0;

  const addToCart = useStore(state => state.addToCart);
  const updateQuantity = useStore(state => state.updateQuantity);

  const handleAdd = (e) => {
    e.stopPropagation();
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
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
      className="bg-surface rounded-2xl shadow-sm overflow-hidden border border-gray-100 flex flex-col h-full active:scale-[0.98] transition-transform"
    >
      {/* Top Half - Colored Block */}
      <div className={`h-24 w-full flex items-center justify-center ${categoryColors[item.category] || 'bg-gray-100'}`}>
        <span className="font-black text-2xl opacity-30">{item.category}</span>
      </div>
      
      {/* Bottom Half - Info */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow justify-between gap-2 sm:gap-3">
        <h3 className="font-bold text-gray-800 leading-tight line-clamp-2 min-h-[2.5rem] text-sm sm:text-base">
          {item.name}
        </h3>
        
        <div className="flex items-center justify-between mt-auto gap-1">
          <span className="text-base sm:text-lg font-bold text-primary-dark">₹{item.price}</span>
          
          {quantity > 0 ? (
            <div className="flex items-center bg-gray-100 rounded-full p-0.5 sm:p-1 gap-1 sm:gap-2">
              <button 
                onClick={handleDecrease}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 active:bg-gray-200 shrink-0"
              >
                <Minus size={14} />
              </button>
              <span className="font-bold w-3 sm:w-4 text-center text-sm">{quantity}</span>
              <button 
                onClick={handleIncrease}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-primary text-black shadow-sm active:bg-primary-dark shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleAdd}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-black shadow-md hover:bg-primary-dark active:scale-95 transition-transform"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MenuCard;

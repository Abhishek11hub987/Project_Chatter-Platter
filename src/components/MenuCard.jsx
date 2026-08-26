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

const MenuCard = ({ item }) => {
  const cart = useStore(state => state.cart);
  const addToCart = useStore(state => state.addToCart);
  const updateQuantity = useStore(state => state.updateQuantity);
  
  const cartItem = cart.find(i => (i.itemId || i.id) === (item.id || item.itemId));
  const quantity = cartItem ? cartItem.qty : 0;

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
      <div className="p-4 flex flex-col flex-grow justify-between gap-3">
        <h3 className="font-bold text-gray-800 leading-tight line-clamp-2 min-h-[2.5rem]">
          {item.name}
        </h3>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-lg font-bold text-primary-dark">₹{item.price}</span>
          
          {quantity > 0 ? (
            <div className="flex items-center bg-gray-100 rounded-full p-1 gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 active:bg-gray-200"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold w-4 text-center">{quantity}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-black shadow-sm active:bg-primary-dark"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); addToCart(item); }}
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

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import useStore from '../store/useStore';

const CartBar = ({ onClick }) => {
  const cart = useStore(state => state.cart);
  
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-0 right-0 px-4 z-50 max-w-[430px] mx-auto"
        >
          <button 
            onClick={onClick}
            className="w-full bg-black text-primary rounded-full p-4 flex items-center justify-between shadow-2xl active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gray-800 p-2 rounded-full relative">
                <ShoppingBag size={20} />
                <span className="absolute -top-1 -right-1 bg-primary text-black text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total</p>
                <p className="font-bold">₹{totalPrice}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
              Place Order <ArrowRight size={18} />
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CartBar;

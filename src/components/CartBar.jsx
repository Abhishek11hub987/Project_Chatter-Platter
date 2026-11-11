import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShoppingBag, Clock } from 'lucide-react';
import useStore from '../store/useStore';

const CartBar = ({ onClick, etaMinutes = null }) => {
  const cart = useStore((state) => state.cart);

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="fixed bottom-4 left-0 right-0 px-4 z-40 max-w-[430px] mx-auto"
        >
          <button
            onClick={onClick}
            className="w-full bg-secondary text-primary rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-2xl border border-white/10 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/15 border border-primary/30 p-2 rounded-xl relative">
                <ShoppingBag size={20} className="text-primary" />
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-black text-[11px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow">
                  {totalItems}
                </span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-base">₹{totalPrice}</span>
                  {etaMinutes && (
                    <span className="text-[10px] font-bold bg-white/10 text-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} className="text-primary" /> ~{etaMinutes}m
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 font-medium">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} in tray
                </p>
              </div>
            </div>

            <div className="bg-primary text-black px-4 py-2 rounded-xl flex items-center gap-1.5 font-black text-xs uppercase tracking-wider shadow-md">
              View Cart <ArrowRight size={15} />
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CartBar;

import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { ChefHat } from 'lucide-react';

const Welcome = ({ onNext }) => {
  const tableNumber = useStore((state) => state.tableNumber);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-primary to-primary-dark p-6 relative">
      {/* Table Badge */}
      {tableNumber && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute top-12 bg-black text-primary px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2"
        >
          <span>Table {tableNumber.padStart(2, '0')}</span>
        </motion.div>
      )}

      {/* Main Logo */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center text-center space-y-6"
      >
        <div className="bg-black text-primary p-6 rounded-3xl shadow-xl rotate-3">
          <ChefHat size={80} strokeWidth={1.5} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-black leading-tight">
            CHATTER<br/>&<br/>PLATTER
          </h1>
          <p className="text-black/80 font-bold uppercase tracking-widest mt-4">
            Scan. Order. Relax.
          </p>
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute bottom-16 w-full px-8"
      >
        <button 
          onClick={onNext}
          className="w-full bg-black text-primary hover:bg-gray-900 rounded-full py-4 text-lg font-black uppercase tracking-wider shadow-2xl transition-transform active:scale-95 animate-[bounce_2s_infinite]"
        >
          Browse Menu
        </button>
      </motion.div>
    </div>
  );
};

export default Welcome;

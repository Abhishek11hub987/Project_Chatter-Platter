import { motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { UtensilsCrossed } from 'lucide-react';

const Welcome = ({ onNext }) => {
  const tableNumber = useStore((state) => state.tableNumber);

  return (
    <div className="flex flex-col items-center justify-between h-full w-full bg-gradient-to-br from-primary via-primary to-primary-dark p-6 sm:p-8 relative overflow-hidden">
      
      {/* Decorative background circles */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-black/5 rounded-full"></div>
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-black/5 rounded-full"></div>
      <div className="absolute top-1/3 right-10 w-24 h-24 bg-black/5 rounded-full"></div>

      {/* Top section - Table Badge */}
      <div className="pt-6 sm:pt-10">
        {tableNumber ? (
          <motion.div 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-black text-primary px-5 py-2.5 rounded-full font-bold shadow-lg text-sm tracking-wider"
          >
            🍽️ Table {tableNumber.toString().padStart(2, '0')}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-black/10 text-black/60 px-5 py-2.5 rounded-full font-bold text-sm tracking-wider"
          >
            ☕ Walk-in / Takeaway
          </motion.div>
        )}
      </div>

      {/* Center - Logo & Branding */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center text-center space-y-5 sm:space-y-6 z-10"
      >
        <div className="bg-black text-primary p-5 sm:p-6 rounded-3xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
          <UtensilsCrossed size={56} strokeWidth={1.5} className="sm:w-[72px] sm:h-[72px]" />
        </div>
        
        <div className="space-y-1">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-black leading-[0.9]">
            CHATTER
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-0.5 bg-black/30 rounded-full"></div>
            <span className="text-black/50 font-black text-lg">&</span>
            <div className="w-8 h-0.5 bg-black/30 rounded-full"></div>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-black leading-[0.9]">
            PLATTER
          </h1>
        </div>

        <p className="text-black/60 font-bold uppercase tracking-[0.3em] text-xs sm:text-sm mt-2">
          Cafe & Kitchen
        </p>
      </motion.div>

      {/* Bottom - CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="w-full pb-6 sm:pb-10 space-y-3 z-10"
      >
        <button 
          onClick={onNext}
          className="w-full bg-black text-primary hover:bg-gray-900 rounded-2xl py-4 sm:py-5 text-base sm:text-lg font-black uppercase tracking-wider shadow-2xl transition-all active:scale-[0.98]"
        >
          Browse Our Menu →
        </button>
        <div className="flex items-center justify-center gap-2 text-black/40 text-[10px] font-bold">
          <span>Scan • Order • Relax</span>
          <span>•</span>
          <a href="/login" className="hover:text-black/80 transition-colors cursor-pointer flex items-center gap-1">
             Staff Access
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default Welcome;

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import useStore from '../../store/useStore';
import { useDataMode } from '../../hooks/supabaseHooks';

const Welcome = ({ onNext }) => {
  const tableNumber = useStore((state) => state.tableNumber);
  const setCustomerName = useStore((state) => state.setCustomerName);
  const customerName = useStore((state) => state.customerName);
  const { isLive, backendLabel } = useDataMode();
  const [name, setName] = useState(customerName || '');
  const [error, setError] = useState('');

  const handleProceed = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Please enter your name (at least 2 characters)');
      return;
    }
    setCustomerName(trimmed);
    onNext();
  };

  return (
    <div className="flex flex-col items-center justify-between h-full w-full bg-gradient-to-br from-primary via-primary to-primary-dark p-6 sm:p-7 relative overflow-hidden">
      {/* Subtle geometric accents */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-black/5 rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-black/5 rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-8 w-20 h-20 bg-white/15 rounded-full blur-xl pointer-events-none" />

      {/* Top Bar */}
      <div className="pt-4 w-full flex items-center justify-between z-10">
        {tableNumber ? (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-black text-primary px-4 py-2 rounded-full font-black shadow-lg text-xs tracking-wider uppercase"
          >
            🍽️ Table {tableNumber.toString().padStart(2, '0')}
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-black/15 text-black px-4 py-2 rounded-full font-bold text-xs tracking-wide"
          >
            ☕ Walk-in / Takeaway
          </motion.div>
        )}

        <div className="bg-black/10 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-extrabold text-black/80 uppercase tracking-wider">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-700' : 'bg-amber-900 animate-pulse'}`} />
          {isLive ? backendLabel.split(' ')[0] + ' Live' : 'Local Mode'}
        </div>
      </div>

      {/* Center Branding */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex flex-col items-center text-center space-y-4 z-10 my-auto"
      >
        <div className="bg-black text-primary p-5 rounded-3xl shadow-2xl rotate-2">
          <UtensilsCrossed size={52} strokeWidth={1.6} />
        </div>

        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-black leading-[0.9]">
            CHATTER
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-0.5 bg-black/30 rounded-full" />
            <span className="text-black/60 font-black text-lg">&amp;</span>
            <div className="w-8 h-0.5 bg-black/30 rounded-full" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-black leading-[0.9]">
            PLATTER
          </h1>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-black/10 px-3.5 py-1.5 rounded-full text-black/80 font-bold text-xs">
          <Sparkles size={13} />
          <span>Scan • AI Picks • Real-Time Token</span>
        </div>
      </motion.div>

      {/* Bottom Name Entry & CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="w-full pb-4 space-y-3 z-10"
      >
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-1.5 shadow-xl border border-white">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Enter your name to begin..."
            className="w-full bg-transparent rounded-xl py-3.5 px-4 text-center text-base font-bold text-gray-900 placeholder-gray-400 focus:outline-none"
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleProceed()}
          />
        </div>

        {error && (
          <p className="text-red-900 text-xs font-bold text-center bg-red-100/90 py-2 rounded-xl">
            {error}
          </p>
        )}

        <button
          onClick={handleProceed}
          className="w-full bg-black text-primary hover:bg-gray-900 rounded-2xl py-4 text-base font-black uppercase tracking-wider shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Browse Smart Menu <ArrowRight size={18} />
        </button>

        <div className="flex items-center justify-center gap-3 text-black/60 text-[11px] font-bold pt-1">
          <span>Scan • Order • Relax</span>
          <span>•</span>
          <a
            href="/login"
            className="hover:text-black transition-colors flex items-center gap-1 underline-offset-2 hover:underline"
          >
            <ShieldCheck size={12} /> Staff Portal
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default Welcome;

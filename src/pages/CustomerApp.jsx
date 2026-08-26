import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../store/useStore';
import Welcome from './Customer/Welcome';
import Menu from './Customer/Menu';
import Cart from './Customer/Cart';
import Tracker from './Customer/Tracker';
import Feedback from './Customer/Feedback';
import { useOrder } from '../hooks/supabaseHooks';
import ErrorBoundary from '../components/ErrorBoundary';
import { UtensilsCrossed } from 'lucide-react';

const AnimatedPage = ({ children, keyName }) => (
  <motion.div
    key={keyName}
    initial={{ x: '100%', opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: '-100%', opacity: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="absolute inset-0 bg-background overflow-hidden"
  >
    {children}
  </motion.div>
);

const SplashScreen = () => (
  <motion.div 
    key="splash"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0, scale: 1.1 }}
    transition={{ duration: 0.8, ease: "easeInOut" }}
    className="absolute inset-0 z-50 bg-[#FFC107] flex flex-col items-center justify-center overflow-hidden"
  >
    <motion.div 
      initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.2 }}
      className="bg-black text-[#FFC107] p-6 rounded-3xl shadow-2xl mb-6"
    >
      <UtensilsCrossed size={72} strokeWidth={1.5} />
    </motion.div>
    
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="text-center"
    >
      <h1 className="text-4xl font-black tracking-tight text-black leading-none mb-2">
        CHATTER<br/>& PLATTER
      </h1>
      <p className="text-black/60 font-bold uppercase tracking-[0.2em] text-xs">
        Scan • Order • Relax
      </p>
    </motion.div>
  </motion.div>
);

const CustomerApp = () => {
  const [showSplash, setShowSplash] = useState(true);

  // Hash-based routing to support hardware back button
  const getHashScreen = () => {
    const hash = window.location.hash.replace('#', '');
    return ['welcome', 'menu', 'cart', 'tracker', 'feedback'].includes(hash) ? hash : 'welcome';
  };
  
  const [currentScreen, setCurrentScreenState] = useState(getHashScreen());

  useEffect(() => {
    const handleHashChange = () => setCurrentScreenState(getHashScreen());
    window.addEventListener('hashchange', handleHashChange);
    
    // Set initial hash if empty
    if (!window.location.hash) {
      window.history.replaceState(null, null, '#welcome');
    }
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setCurrentScreen = (screen) => {
    window.location.hash = screen;
  };

  const activeOrderId = useStore((state) => state.activeOrderId);
  const { order, loading } = useOrder(activeOrderId);
  const [hasRedirectedToTracker, setHasRedirectedToTracker] = useState(false);

  useEffect(() => {
    // Hide splash after 2.5 seconds
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // If they have an active order that is not delivered yet, jump to tracker
    if (!showSplash && activeOrderId && !loading && !hasRedirectedToTracker) {
      if (order && order.status !== 'delivered') {
        setCurrentScreen('tracker');
        setHasRedirectedToTracker(true);
      }
    }
  }, [activeOrderId, loading, order, hasRedirectedToTracker, showSplash]);

  // Mobile wrapper simulation
  return (
    <ErrorBoundary>
    <div className="flex justify-center items-center min-h-screen bg-gray-900 w-full overflow-hidden">
      <div className="relative w-full max-w-[430px] h-screen max-h-screen bg-background shadow-2xl overflow-hidden md:h-[90vh] md:rounded-[3rem] md:border-[8px] md:border-gray-800">
        <AnimatePresence mode="wait">
          {showSplash && <SplashScreen />}
          {!showSplash && currentScreen === 'welcome' && (
            <AnimatedPage keyName="welcome">
              <Welcome onNext={() => setCurrentScreen('menu')} />
            </AnimatedPage>
          )}
          {currentScreen === 'menu' && (
            <AnimatedPage keyName="menu">
              <Menu 
                onCartClick={() => setCurrentScreen('cart')} 
                onTrackerClick={() => setCurrentScreen('tracker')}
                onBackClick={() => setCurrentScreen('welcome')}
              />
            </AnimatedPage>
          )}
          {currentScreen === 'cart' && (
            <AnimatedPage keyName="cart">
              <Cart 
                onBack={() => setCurrentScreen('menu')} 
                onOrderPlaced={() => setCurrentScreen('tracker')} 
              />
            </AnimatedPage>
          )}
          {currentScreen === 'tracker' && (
            <AnimatedPage keyName="tracker">
              <Tracker 
                onFeedback={() => setCurrentScreen('feedback')} 
                onBackToMenu={() => setCurrentScreen('menu')} 
              />
            </AnimatedPage>
          )}
          {currentScreen === 'feedback' && (
            <AnimatedPage keyName="feedback">
              <Feedback onDone={() => setCurrentScreen('welcome')} />
            </AnimatedPage>
          )}
        </AnimatePresence>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default CustomerApp;

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
    initial={{ x: '24%', opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: '-16%', opacity: 0 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className="absolute inset-0 bg-background overflow-hidden"
  >
    {children}
  </motion.div>
);

const SplashScreen = () => (
  <motion.div
    key="splash"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0, scale: 1.05 }}
    transition={{ duration: 0.45, ease: 'easeInOut' }}
    className="absolute inset-0 z-50 bg-gradient-to-br from-primary to-primary-dark flex flex-col items-center justify-center overflow-hidden"
  >
    <motion.div
      initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', damping: 14, stiffness: 140 }}
      className="bg-black text-primary p-5 rounded-3xl shadow-2xl mb-5"
    >
      <UtensilsCrossed size={58} strokeWidth={1.6} />
    </motion.div>

    <motion.div
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.35 }}
      className="text-center"
    >
      <h1 className="text-4xl font-black tracking-tight text-black leading-none mb-2">
        CHATTER
        <br />
        &amp; PLATTER
      </h1>
      <p className="text-black/70 font-bold uppercase tracking-[0.22em] text-xs">
        AI Smart Cafe • Scan &amp; Order
      </p>
    </motion.div>
  </motion.div>
);

const CustomerApp = () => {
  const initialHash = window.location.hash.replace('#', '');
  const [showSplash, setShowSplash] = useState(!initialHash || initialHash === 'welcome');

  const getHashScreen = () => {
    const hash = window.location.hash.replace('#', '');
    return ['welcome', 'menu', 'cart', 'tracker', 'feedback'].includes(hash) ? hash : 'welcome';
  };

  const [currentScreen, setCurrentScreenState] = useState(getHashScreen());

  useEffect(() => {
    const handleHashChange = () => setCurrentScreenState(getHashScreen());
    window.addEventListener('hashchange', handleHashChange);

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
    if (!showSplash) return undefined;
    const timer = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => {
    if (!showSplash && activeOrderId && !loading && !hasRedirectedToTracker) {
      if (order && !['delivered', 'completed', 'cancelled'].includes(order.status)) {
        setCurrentScreen('tracker');
        setHasRedirectedToTracker(true);
      }
    }
  }, [activeOrderId, loading, order, hasRedirectedToTracker, showSplash]);

  return (
    <ErrorBoundary>
      <div className="flex justify-center items-center min-h-screen bg-gray-950 w-full overflow-hidden">
        <div className="relative w-full max-w-[430px] h-screen max-h-screen bg-background shadow-2xl overflow-hidden md:h-[92vh] md:rounded-[2.75rem] md:border-[7px] md:border-gray-800">
          <AnimatePresence mode="wait">
            {showSplash && <SplashScreen />}
            {!showSplash && currentScreen === 'welcome' && (
              <AnimatedPage keyName="welcome">
                <Welcome onNext={() => setCurrentScreen('menu')} />
              </AnimatedPage>
            )}
            {!showSplash && currentScreen === 'menu' && (
              <AnimatedPage keyName="menu">
                <Menu
                  onCartClick={() => setCurrentScreen('cart')}
                  onTrackerClick={() => setCurrentScreen('tracker')}
                  onBackClick={() => setCurrentScreen('welcome')}
                />
              </AnimatedPage>
            )}
            {!showSplash && currentScreen === 'cart' && (
              <AnimatedPage keyName="cart">
                <Cart
                  onBack={() => setCurrentScreen('menu')}
                  onOrderPlaced={() => setCurrentScreen('tracker')}
                />
              </AnimatedPage>
            )}
            {!showSplash && currentScreen === 'tracker' && (
              <AnimatedPage keyName="tracker">
                <Tracker
                  onFeedback={() => setCurrentScreen('feedback')}
                  onBackToMenu={() => setCurrentScreen('menu')}
                />
              </AnimatedPage>
            )}
            {!showSplash && currentScreen === 'feedback' && (
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

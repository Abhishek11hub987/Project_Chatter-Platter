import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../store/useStore';
import Welcome from './Customer/Welcome';
import Menu from './Customer/Menu';
import Cart from './Customer/Cart';
import Tracker from './Customer/Tracker';
import Feedback from './Customer/Feedback';
import { useOrder } from '../hooks/supabaseHooks';

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

const CustomerApp = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, menu, cart, tracker, feedback
  const activeOrderId = useStore((state) => state.activeOrderId);
  const { order, loading } = useOrder(activeOrderId);
  const [hasRedirectedToTracker, setHasRedirectedToTracker] = useState(false);

  useEffect(() => {
    // If they have an active order that is not delivered yet, jump to tracker
    if (activeOrderId && !loading && !hasRedirectedToTracker) {
      if (order && order.status !== 'delivered') {
        setCurrentScreen('tracker');
        setHasRedirectedToTracker(true);
      }
    }
  }, [activeOrderId, loading, order, hasRedirectedToTracker]);

  // Mobile wrapper simulation
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 w-full overflow-hidden">
      <div className="relative w-full max-w-[430px] h-screen max-h-screen bg-background shadow-2xl overflow-hidden md:h-[90vh] md:rounded-[3rem] md:border-[8px] md:border-gray-800">
        <AnimatePresence mode="wait">
          {currentScreen === 'welcome' && (
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
  );
};

export default CustomerApp;

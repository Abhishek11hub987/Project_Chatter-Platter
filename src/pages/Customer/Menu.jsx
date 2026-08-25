import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Receipt } from 'lucide-react';
import useStore from '../../store/useStore';
import { useMenu } from '../../hooks/supabaseHooks';
import MenuCard from '../../components/MenuCard';
import CartBar from '../../components/CartBar';
import { seedMenu } from '../../data/seedMenu';

const CATEGORIES = ['HOT', 'COLD', 'MOMO', 'FRIES', 'PASTA', 'MAGGI', 'SANDWICH'];

const Menu = ({ onCartClick, onTrackerClick, onBackClick }) => {
  const tableNumber = useStore(state => state.tableNumber);
  const activeOrderId = useStore(state => state.activeOrderId);
  const { menu, loading } = useMenu();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const categoriesRef = useRef(null);

  const filteredMenu = menu.filter(item => item.category === activeCategory);

  return (
    <div className="h-full flex flex-col bg-background relative pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-6 pb-2 px-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onBackClick}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h2 className="font-extrabold text-xl tracking-tight">MENU</h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Table {tableNumber?.padStart(2, '0')}
            </p>
          </div>
          <div className="w-10 flex justify-end">
            {activeOrderId && (
              <button 
                onClick={onTrackerClick} 
                className="p-2 -mr-2 rounded-full text-black hover:bg-gray-100 active:bg-gray-200"
              >
                <Receipt size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Categories Horizontal Scroll */}
        <div 
          ref={categoriesRef}
          className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 snap-x"
        >
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`snap-start whitespace-nowrap px-5 py-2 rounded-full font-bold text-sm transition-colors ${
                activeCategory === cat 
                  ? 'bg-black text-white shadow-md' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-48 space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Loading deliciousness...</p>
          </div>
        ) : menu.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-48 space-y-4 text-center">
            <p className="text-gray-500 font-medium">Menu is empty.</p>
            <button onClick={seedMenu} className="btn-primary mt-4 text-xs py-2 px-4">
              Seed Demo Data
            </button>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-2 gap-4"
            initial="hidden"
            animate="show"
            variants={{
              show: {
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            {filteredMenu.map(item => (
              <MenuCard key={item.id} item={item} />
            ))}
          </motion.div>
        )}
      </div>

      <CartBar onClick={onCartClick} />
    </div>
  );
};

export default Menu;

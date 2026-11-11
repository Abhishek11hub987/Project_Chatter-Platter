import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Plus, Send, Flame, Clock, Layers } from 'lucide-react';
import { AI_MOOD_PRESETS, recommendMenuItems, getSmartCombos } from '../utils/smartCafeAI';
import useStore from '../store/useStore';

const AICravingsDrawer = ({ isOpen, onClose, menu, vegOnly }) => {
  const [prompt, setPrompt] = useState('');
  const addToCart = useStore((state) => state.addToCart);
  const addMultipleToCart = useStore((state) => state.addMultipleToCart);
  const [addedFeedback, setAddedFeedback] = useState(null);

  const recommendations = useMemo(
    () => recommendMenuItems(menu, prompt, { vegOnly, limit: 6 }),
    [menu, prompt, vegOnly]
  );

  const combos = useMemo(() => {
    const all = getSmartCombos(menu);
    if (!vegOnly) return all;
    return all.filter((c) => c.items.every((i) => i.isVeg !== false));
  }, [menu, vegOnly]);

  const handleQuickAdd = (item) => {
    addToCart(item);
    setAddedFeedback(item.name);
    setTimeout(() => setAddedFeedback(null), 1500);
  };

  const handleAddCombo = (combo) => {
    addMultipleToCart(combo.items);
    setAddedFeedback(`${combo.title} added`);
    setTimeout(() => setAddedFeedback(null), 1800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] bg-background rounded-t-3xl shadow-2xl max-h-[86vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-secondary text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-black flex items-center justify-center shadow-lg">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight flex items-center gap-1.5">
                    Chatter AI Barista
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase">
                      Smart
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {recommendations.timeInfo.label} • {recommendations.timeInfo.hint}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close AI Barista"
                className="w-8 h-8 rounded-full bg-white/10 text-gray-300 hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Prompt Input */}
            <div className="p-4 bg-white border-b border-gray-100 space-y-3 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='Try "spicy snack under 80" or "cheesy"'
                  className="w-full bg-gray-100 rounded-2xl pl-4 pr-10 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {prompt ? (
                  <button
                    onClick={() => setPrompt('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <Send size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
              </div>

              {/* Mood Chips */}
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
                {AI_MOOD_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setPrompt(preset.query)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      prompt === preset.query
                        ? 'bg-black text-primary'
                        : 'bg-amber-50 text-amber-900 border border-amber-200/70 hover:bg-amber-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toast feedback inside drawer */}
            <AnimatePresence>
              {addedFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-4 mt-3 bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl text-center shadow"
                >
                  Added {addedFeedback} to your tray
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Smart Combos */}
              {!prompt && combos.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                      <Layers size={13} className="text-primary-dark" /> Smart 1-Tap Combos
                    </h4>
                  </div>
                  <div className="space-y-2.5">
                    {combos.map((combo) => (
                      <div
                        key={combo.id}
                        className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-black text-sm text-secondary truncate">
                              {combo.title}
                            </span>
                            <span className="bg-primary/20 text-amber-900 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                              {combo.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">
                            {combo.items.map((i) => i.name).join(' + ')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-black text-primary-dark">₹{combo.total}</span>
                            <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-0.5">
                              <Clock size={10} /> ~{combo.prepMinutes}m
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddCombo(combo)}
                          className="bg-black text-primary px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wide shrink-0 active:scale-95 transition-transform"
                        >
                          + Combo
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Picked Dishes */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Flame size={13} className="text-orange-500" />
                  {prompt ? 'AI Matched Picks' : 'Recommended For Right Now'}
                </h4>

                {recommendations.items.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-500 font-medium border border-gray-100">
                    No matching dishes under that filter. Try clearing the budget or keyword!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recommendations.items.map((item) => (
                      <div
                        key={item.id || item.itemId}
                        className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              ✨ {item.aiReason}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">
                              ~{item.prepMinutes || 6}m
                            </span>
                          </div>
                          <h5 className="font-bold text-sm text-gray-900 mt-1 truncate">{item.name}</h5>
                          <p className="text-[11px] text-gray-400 truncate">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-black text-sm text-secondary">₹{item.price}</span>
                          <button
                            onClick={() => handleQuickAdd(item)}
                            className="w-9 h-9 rounded-full bg-primary text-black flex items-center justify-center shadow active:scale-90 transition-transform"
                          >
                            <Plus size={18} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AICravingsDrawer;

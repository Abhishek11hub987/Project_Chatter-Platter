import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import useStore from '../../store/useStore';
import { useFeedbacks } from '../../hooks/supabaseHooks';

const QUICK_TAGS = ['Fast Service', 'Super Tasty', 'Hot & Fresh', 'Great Vibe', 'Value for Money'];

const Feedback = ({ onDone }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeOrderId = useStore((state) => state.activeOrderId);
  const customerName = useStore((state) => state.customerName);
  const { submitFeedback } = useFeedbacks();

  const toggleTag = (tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        orderId: activeOrderId,
        customerName,
        rating,
        comment: comment.trim(),
        tags: selectedTags,
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-primary to-primary-dark text-black">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 14 }}
          className="w-28 h-28 bg-black text-primary rounded-full flex items-center justify-center mb-6 shadow-2xl"
        >
          <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        <h2 className="text-4xl font-black mb-3">THANK YOU!</h2>
        <p className="font-bold text-black/75 mb-10 max-w-xs">
          Your feedback helps Chatter &amp; Platter serve campus even better.
        </p>

        <button
          onClick={onDone}
          className="w-full max-w-xs bg-black text-primary py-4 rounded-full font-black uppercase tracking-wider shadow-xl active:scale-95 transition-transform"
        >
          Order Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 bg-background overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h2 className="text-3xl font-black text-center mb-1">How was it?</h2>
        <p className="text-center text-gray-500 font-medium text-sm mb-7">
          Rate your food &amp; experience
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className="p-1 focus:outline-none active:scale-90 transition-transform"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              <Star
                size={44}
                className={`transition-colors ${
                  (hoverRating || rating) >= star ? 'fill-primary text-primary' : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Experience Quick Tags */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {QUICK_TAGS.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  active
                    ? 'bg-black text-primary border-black'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what you loved or what we can improve..."
          className="w-full bg-white border border-gray-200 rounded-2xl p-4 min-h-[110px] resize-none text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary mb-6 shadow-sm"
        />

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="w-full bg-black text-primary py-4 rounded-full font-black uppercase tracking-wider disabled:opacity-40 transition-opacity shadow-lg"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>

        <button
          onClick={onDone}
          className="mt-3 text-xs font-bold text-gray-400 hover:text-gray-600 py-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default Feedback;

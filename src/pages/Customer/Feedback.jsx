import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import useStore from '../../store/useStore';
import { supabase } from '../../supabase';

const Feedback = ({ onDone }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const activeOrderId = useStore(state => state.activeOrderId);

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    try {
      const { error } = await supabase.from('feedbacks').insert([{
        rating,
        comment: comment || null
      }]);
      
      if (error) {
        console.error("Supabase insert error:", error);
      }
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      // Still show thank you even if it fails
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-primary text-black">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-32 h-32 bg-black text-primary rounded-full flex items-center justify-center mb-8 shadow-2xl"
        >
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        
        <h2 className="text-4xl font-black mb-4">THANK YOU!</h2>
        <p className="font-bold text-black/70 mb-12">We hope to see you again soon.</p>
        
        <button onClick={onDone} className="w-full bg-black text-primary py-4 rounded-full font-bold uppercase shadow-lg">
          Order Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 bg-background">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h2 className="text-3xl font-black text-center mb-2">How was your experience?</h2>
        <p className="text-center text-gray-500 font-medium mb-10">Rate your food and service</p>
        
        <div className="flex justify-center gap-2 mb-10">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className="p-1 focus:outline-none"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              <Star 
                size={48} 
                className={`transition-colors ${
                  (hoverRating || rating) >= star 
                    ? 'fill-primary text-primary' 
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any comments? (Optional)"
          className="w-full bg-gray-100 rounded-2xl p-4 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-primary mb-8"
        ></textarea>
        
        <button 
          onClick={handleSubmit}
          disabled={rating === 0}
          className="w-full bg-black text-primary py-4 rounded-full font-bold uppercase disabled:opacity-50 transition-opacity"
        >
          Submit Feedback
        </button>
      </div>
    </div>
  );
};

export default Feedback;

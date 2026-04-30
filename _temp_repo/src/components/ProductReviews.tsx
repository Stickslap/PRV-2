import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Star, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'react-hot-toast';

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
  status: string;
}

interface ProductReviewsProps {
  productId: string;
}

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Stringify productId to ensure it matches firestore storage if it's a number
    const pId = String(productId);
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', pId),
      where('status', '==', 'APPROVED'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(fetchedReviews);
    }, (error) => {
      console.error("Error fetching reviews:", error);
    });

    return () => unsubscribe();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to write a review");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: String(productId),
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        rating,
        comment,
        status: 'APPROVED',
        createdAt: serverTimestamp(),
      });
      toast.success("Review submitted successfully!");
      setComment('');
      setRating(5);
      setIsWriting(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  return (
    <div id="product-reviews" className="mt-20 border-t border-gray-100 pt-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-3xl font-headline font-black italic uppercase tracking-tight mb-2">Customer Reviews</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-5 h-5 ${i < Math.round(averageRating) ? 'fill-[#FFD700] text-[#FFD700]' : 'text-gray-200'}`} 
                />
              ))}
            </div>
            <span className="text-sm font-bold text-gray-500">{reviews.length} Reviews • {averageRating.toFixed(1)} Average</span>
          </div>
        </div>
        
        {!isWriting && (
          <button 
            id="write-review-btn"
            onClick={() => user ? setIsWriting(true) : toast.error("Please login to write a review")}
            className="px-8 py-4 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-black/10"
          >
            Write a Review
          </button>
        )}
      </div>

      <AnimatePresence>
        {isWriting && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-16 bg-gray-50 rounded-2xl p-8 border border-gray-100"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Your Rating</label>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-8 h-8 ${i < rating ? 'fill-[#FFD700] text-[#FFD700]' : 'text-gray-300'}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Your Comment</label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you think about the product..."
                  className="w-full h-32 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-primary text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  id="submit-review-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 bg-primary text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Post Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsWriting(false)}
                  className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {reviews.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No reviews yet. Be the first to write one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((review) => (
              <motion.div 
                key={review.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black italic">{review.userName}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {review.createdAt?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${i < review.rating ? 'fill-[#FFD700] text-[#FFD700]' : 'text-gray-200'}`} 
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">"{review.comment}"</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

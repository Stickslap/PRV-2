import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock } from "lucide-react";

export function TrackOrder() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    
    setLoading(true);
    // Simulate API lookup
    setTimeout(() => {
      setStatus("FOUND");
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center pt-24 pb-20 px-6">
      
      {/* Header Section */}
      <div className="flex flex-col items-center text-center mb-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full mb-8"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[9px] font-black uppercase tracking-widest">Society Registry Lookup</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-headline font-black italic uppercase tracking-tighter leading-none mb-4"
        >
          <span className="text-black">TRACK</span> <span className="text-primary">STATUS</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-500 italic text-lg md:text-xl font-medium"
        >
          Enter your order number to locate your project.
        </motion.p>
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-[520px] bg-white rounded-[2.5rem] shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] border border-gray-100 flex flex-col overflow-hidden"
      >
        <div className="p-8 md:p-12 pb-10">
          <form onSubmit={handleTrack}>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                  Order Number
                </label>
                <input 
                  type="text" 
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. QX-8382" 
                  className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-base font-bold text-black focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-5 rounded-2xl font-headline font-black uppercase tracking-[0.2em] italic text-sm hover:bg-primary/90 transition-all shadow-[0_10px_40px_-10px_rgba(139,92,246,0.6)] disabled:opacity-50"
              >
                {loading ? "Searching Registry..." : "Locate Project —"}
              </button>
            </div>
          </form>

          {status && !loading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-green-800 mb-2">Project Found</h3>
              <p className="text-green-700 text-sm font-medium">Your order <strong className="font-mono">{orderNumber}</strong> is currently in <strong>PACKING</strong> and is expected to ship in 3-5 business days.</p>
            </motion.div>
          )}

          <div className="h-px bg-gray-100 w-full my-8"></div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">
              Are you a member?
            </span>
            <Link 
              to="/login"
              className="w-full bg-white border border-gray-200 text-black py-4 rounded-2xl font-headline font-black uppercase tracking-widest text-xs hover:border-black transition-colors flex items-center justify-center"
            >
              Log in to Dashboard
            </Link>
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-gray-50/50 border-t border-gray-100 py-6 px-8 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
            Encrypted Session • Society Verified
          </span>
        </div>
      </motion.div>

    </div>
  );
}

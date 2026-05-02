import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, AlertCircle, Package } from "lucide-react";
import axios from "axios";

export function TrackOrder() {
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<any | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    
    // Clean to numeric just to be safe, assuming BC only uses numeric IDs
    const numericId = orderNumber.replace(/\D/g, '');
    if (!numericId) {
      setErrorInfo("Please enter a valid numeric order number.");
      setStatusData(null);
      return;
    }

    setLoading(true);
    setErrorInfo(null);
    setStatusData(null);

    try {
      const response = await axios.get(`/api/public/track/${numericId}`);
      setStatusData(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setErrorInfo("Incorrect order number. We could not find an order with this number in our system. Please try again.");
      } else {
        setErrorInfo("An error occurred while tracking your order. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
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
                <label className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                  <span>Order Number</span>
                  {errorInfo && <span className="text-red-500">Not Found</span>}
                </label>
                <input 
                  type="text" 
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. 8382" 
                  className={`w-full bg-white border ${errorInfo ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary focus:ring-primary/10'} rounded-2xl px-5 py-4 text-base font-bold text-black focus:ring-4 outline-none transition-all placeholder:text-gray-400`}
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

          <AnimatePresence mode="wait">
            {errorInfo && !loading && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-800 mb-1">Lookup Failed</h3>
                    <p className="text-red-700 text-sm font-medium leading-relaxed">{errorInfo}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {statusData && !loading && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4 border-b border-green-200/50 pb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-green-800">Project Found</h3>
                      <p className="text-sm font-bold text-green-900">Order #{statusData.id}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-green-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700">Status</span>
                      <span className="text-sm font-bold text-green-900">{statusData.status}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-green-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700">Date</span>
                      <span className="text-sm font-bold text-green-900">{statusData.date}</span>
                    </div>

                    {statusData.shipments?.length > 0 && statusData.shipments.map((shipment: any, idx: number) => (
                      <div key={idx} className="mt-4 bg-white/60 p-4 rounded-xl border border-green-200">
                        <div className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-2">Shipment {idx + 1}</div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-green-800">{shipment.shipping_provider}</span>
                          {shipment.tracking_link ? (
                            <a href={shipment.tracking_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-bold">
                              {shipment.tracking_number}
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-green-900">{shipment.tracking_number}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

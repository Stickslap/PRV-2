import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useStore } from "../store/useStore";

export function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id") || searchParams.get("order_id");
  const clearCart = useStore((state) => state.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-white pt-32 pb-24 relative overflow-hidden">
      {/* Abstract Background Design */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50 rounded-full translate-y-1/3 -translate-x-1/4 opacity-40 blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-4 border-black p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center border-4 border-black border-dashed animate-spin-slow">
              <CheckCircle2 className="w-12 h-12 text-purple-600" />
            </div>
          </div>
          
          <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none mb-4">
            PAYMENT <span className="text-purple-600">LINKED</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
            Your transaction has been processed through the Square Secure Vault and synced to BigCommerce.
          </p>

          {orderId && (
            <div className="mb-10 p-6 bg-gray-50 border-2 border-black rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">BigCommerce Order ID</p>
              <span className="text-3xl font-black tracking-widest text-black">
                #{orderId}
              </span>
            </div>
          )}

          <div className="space-y-4">
            <Link 
              to="/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-black transition-colors"
            >
              View Dashboard
            </Link>
            <Link 
              to="/shop"
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-900 font-bold uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Continue Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle2, ArrowRight, Package, MapPin, Truck } from "lucide-react";
import { useStore } from "../store/useStore";

export function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id") || searchParams.get("order_id");
  const clearCart = useStore((state) => state.clearCart);
  const [summary, setSummary] = useState<any>(null);

  const getEstimatedDates = (timeframe: string) => {
    const defaultText = "Processing...";
    if (!timeframe) return defaultText;
    
    // Attempt to extract numbers
    const match = timeframe.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (match) {
      const minDays = parseInt(match[1], 10);
      const maxDays = match[2] ? parseInt(match[2], 10) : minDays;
      
      const addBusinessDays = (date: Date, days: number) => {
        const result = new Date(date);
        let added = 0;
        while (added < days) {
          result.setDate(result.getDate() + 1);
          if (result.getDay() !== 0 && result.getDay() !== 6) {
            added++;
          }
        }
        return result;
      };

      const start = addBusinessDays(new Date(), minDays);
      const end = addBusinessDays(new Date(), maxDays);
      
      const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      if (start.getTime() === end.getTime()) {
         return start.toLocaleDateString(undefined, formatOpts);
      }
      return `${start.toLocaleDateString(undefined, formatOpts)} - ${end.toLocaleDateString(undefined, formatOpts)}`;
    }
    return timeframe;
  };

  useEffect(() => {
    clearCart();
    try {
      const saved = localStorage.getItem('recentOrderSummary');
      if (saved) setSummary(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
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
              <span className="text-3xl font-black tracking-widest text-black mb-2 block">
                #{orderId}
              </span>
            </div>
          )}

          {summary && (
            <div className="mb-10 text-left space-y-6">
              {/* Delivery Window */}
              <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-4">
                 <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                   <Truck className="w-5 h-5 text-emerald-600" />
                 </div>
                 <div>
                   <h4 className="text-[10px] font-black uppercase text-emerald-800 tracking-widest mb-1">Estimated Delivery Date</h4>
                   <p className="text-xl font-headline font-black italic tracking-tighter text-emerald-600">
                     {getEstimatedDates(summary.deliveryTimeframe)}
                   </p>
                   {summary.shippingMethod && (
                     <p className="text-[9px] text-emerald-600/70 font-bold uppercase mt-1">Via {summary.shippingMethod.name} ({summary.deliveryTimeframe})</p>
                   )}
                 </div>
              </div>

              {/* Shipping Address */}
              <div className="p-6 border border-gray-100 rounded-2xl bg-white text-left">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Shipping Destination</h3>
                </div>
                <div className="text-xs font-bold text-gray-600 space-y-1">
                  <p>{summary.address.firstName} {summary.address.lastName}</p>
                  <p>{summary.address.address}</p>
                  <p>{summary.address.city}, {summary.address.state} {summary.address.zip}</p>
                </div>
              </div>

              {/* Items */}
              <div className="p-6 border border-gray-100 rounded-2xl bg-white text-left">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Order Manifest</h3>
                </div>
                <div className="space-y-4">
                  {summary.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      {item.primary_image ? (
                        <img src={item.primary_image.url_standard} className="w-12 h-12 rounded object-cover border border-gray-200" alt={item.name} />
                      ) : <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200" />}
                      <div className="flex-1">
                        <p className="text-xs font-black italic uppercase leading-tight">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-xs font-black">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
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

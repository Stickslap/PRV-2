import { useStore } from "../store/useStore";
import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ArrowRight, ShoppingCart, ArrowLeft, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Cart() {
  const { cart, removeItem, updateQuantity } = useStore();
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const getOptionsList = (item: any) => {
    if (!item.selectedOptions) return [];
    const list: { name: string; value: string }[] = [];
    Object.entries(item.selectedOptions).forEach(([optId, valId]) => {
      let opt = item.options?.find((o: any) => o.id === Number(optId));
      let val = opt?.option_values.find((v: any) => v.id === Number(valId));
      if (!opt) {
        opt = item.modifiers?.find((m: any) => m.id === Number(optId));
        val = opt?.option_values.find((v: any) => v.id === Number(valId));
      }
      if (opt && val) {
        list.push({ name: opt.display_name, value: val.label });
      }
    });
    return list;
  };

  if (cart.length === 0) {
    return (
      <div className="pt-60 pb-40 text-center px-6">
        <ShoppingCart className="w-20 h-20 mx-auto mb-8 text-[#5719D3]" />
        <h1 className="text-4xl md:text-6xl font-headline font-black mb-4 uppercase tracking-tighter italic">Your bag is empty</h1>
        <p className="text-gray-500 mb-10 max-w-sm mx-auto uppercase text-xs tracking-widest">Sounds like you need some stickers to fill this digital void.</p>
        <Link 
          to="/shop" 
          className="inline-flex items-center justify-center bg-primary text-white px-12 py-5 rounded-full text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          Browse the drops
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 bg-[#fafafa] min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6">
          <Link to="/shop" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#5719D3] transition-colors">
            <ArrowLeft className="w-3 h-3" /> Continue Shopping
          </Link>
          <button 
            onClick={() => useStore.getState().clearCart()}
            className="text-[10px] font-bold border-b border-gray-400 uppercase tracking-widest hover:text-[#5719D3] hover:border-[#5719D3] transition-colors pb-0.5 text-gray-500"
          >
            Clear Cart
          </button>
        </div>

        <h1 className="text-5xl md:text-6xl font-headline font-black mb-12 uppercase tracking-tighter italic leading-[0.9]">Your Shopping Bag</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          <div className="lg:col-span-8 space-y-6">
            <AnimatePresence>
              {cart.map((item, index) => {
                const optionsList = getOptionsList(item);
                return (
                  <motion.div 
                    key={`${item.id}-${item.variant_id}-${index}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-8 shadow-sm group relative"
                  >
                    {/* Item Image */}
                    <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gray-50 rounded-2xl flex-shrink-0 overflow-hidden border border-gray-100 p-2">
                      {item.primary_image?.url_standard ? (
                        <img src={item.primary_image.url_standard} className="w-full h-full object-contain" alt={item.name} />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center px-2">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">SKU: {item.sku}</span>
                          <h3 className="text-xl sm:text-2xl font-headline font-black uppercase tracking-tight italic group-hover:text-[#5719D3] transition-colors">
                            <Link to={`/product/${item.id}`}>{item.name}</Link>
                          </h3>
                        </div>
                        <p className="text-2xl font-headline font-black italic tracking-tighter text-[#5719D3]">${(Number(item.price || 0) * item.quantity).toFixed(2)}</p>
                      </div>

                      {/* Options */}
                      {optionsList.length > 0 && (
                        <div className="mt-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {optionsList.map((o, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{o.name}</p>
                              <p className="text-xs font-black uppercase text-gray-900 tracking-wider">{o.value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-100">
                        {/* Quantity Controls */}
                        <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1">
                          <button 
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="p-2 sm:p-3 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-black transition-all"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 sm:w-12 text-center font-black text-sm">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            className="p-2 sm:p-3 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-black transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button 
                          onClick={() => removeItem(index)}
                          className="w-10 h-10 sm:w-auto sm:px-4 sm:h-12 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-[10px] sm:text-xs font-bold uppercase tracking-widest"
                        >
                          <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm lg:sticky lg:top-32">
              <h2 className="text-2xl font-headline font-black mb-8 uppercase tracking-tighter italic border-b border-gray-100 pb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Subtotal</span>
                  <span className="font-black">${(subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Shipping</span>
                  <span className="font-bold text-xs uppercase text-gray-400">Calculated at checkout</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tax</span>
                  <span className="font-bold text-xs uppercase text-gray-400">Included</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-6 mb-8 flex justify-between items-center border border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Estimated Total</span>
                <span className="text-4xl font-headline font-black italic tracking-tighter text-[#5719D3]">${(subtotal || 0).toFixed(2)}</span>
              </div>

              <Link 
                to="/checkout"
                className="w-full bg-[#7e22ce] text-white py-5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-[#6b21a8] transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/20 group"
              >
                Proceed to Checkout <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">
                  <Shield className="w-3.5 h-3.5" /> Secure checkout powered by BigCommerce
                </div>
                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center">SSL Encrypted Transaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight, Zap, Shield, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { getProducts, Product } from "../lib/api";
import { useStore } from "../store/useStore";

export function Home() {
  const { products, setProducts } = useStore();
  const featured = products.slice(0, 3);
  const [localFeatured, setLocalFeatured] = useState<Product[]>(featured);

  useEffect(() => {
    if (products.length === 0) {
      getProducts().then(all => {
        setProducts(all || []);
        setLocalFeatured(all.slice(0, 3));
      });
    } else {
      setLocalFeatured(products.slice(0, 3));
    }
  }, [products.length, setProducts]);

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 lg:pt-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-widest mb-8 lg:mb-10">
              <span className="w-2 h-2 rounded-full bg-violet-600" />
              The Print Society Standard
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-[64px] font-headline font-black italic leading-[0.9] mb-8 lg:mb-12 tracking-tighter text-black uppercase transform -skew-x-2">
              PRINT CUSTOM <br className="hidden sm:block" />
              STICKERS AND <br className="hidden sm:block" />
              PRINTS
            </h1>
            
            <p className="text-base md:text-xl text-gray-500 mx-auto lg:mx-0 max-w-xl mb-10 lg:mb-12 font-medium leading-relaxed">
              Express delivery as fast as 2-4 business days after proof confirmation. 
              <span className="text-gray-400 ml-1">free shipping!</span>
            </p>
            
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <Link 
                to="/signup" 
                className="w-full sm:w-auto bg-[#7C3AED] text-white px-8 py-4 lg:px-10 lg:py-5 rounded-2xl lg:rounded-3xl text-[13px] lg:text-[14px] font-black uppercase tracking-widest hover:bg-[#6D28D9] transition-all shadow-[0_20px_40px_-10px_rgba(124,58,237,0.4)] text-center"
              >
                Join Print Society Crew
              </Link>
              <Link 
                to="/shop" 
                className="w-full sm:w-auto bg-white border border-gray-100 text-black px-8 py-4 lg:px-10 lg:py-5 rounded-2xl lg:rounded-3xl text-[13px] lg:text-[14px] font-black uppercase tracking-widest hover:border-black transition-all flex items-center justify-center gap-3 group"
              >
                All sticker products 
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative h-full flex items-center justify-center lg:justify-end lg:pr-10"
          >
            <motion.div 
              animate={{ 
                y: [0, -20, 0],
                rotate: [0, 1, -1, 0]
              }}
              transition={{ 
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative z-10 w-full max-w-[500px] lg:max-w-[600px]"
            >
              <div className="relative group p-0">
                {/* Image Container with soft shadow and slight rotation */}
                <div className="relative transform rotate-2 transition-transform duration-700 hover:rotate-0">
                   <img 
                    src="https://res.cloudinary.com/dabgothkm/image/upload/v1777250500/Gemini_Generated_Image_skdlulskdlulskdl_1_b5eshy.png"
                    className="w-full h-auto drop-shadow-[0_40px_80px_rgba(0,0,0,0.15)]"
                    alt="Hand holding VW Bus Sticker"
                    onError={(e) => {
                      // Fallback image if main src fails
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523676060187-f55189a71f5e?auto=format&fit=crop&q=80&w=1000";
                    }}
                  />
                  
                  {/* Subtle highlight glow behind product */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-white via-transparent to-transparent opacity-50 -z-10 blur-3xl" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div>
              <h2 className="text-4xl font-headline font-black italic uppercase tracking-tighter text-gray-900">Latest Drops</h2>
              <p className="text-gray-400 font-bold text-[11px] tracking-widest uppercase">Batch 2.0.4 / Mixed Media</p>
            </div>
            <Link to="/shop" className="text-[13px] font-bold uppercase tracking-widest text-primary hover:underline underline-offset-8 transition-all">
              See all collections →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {localFeatured.map((product, idx) => (
              <motion.div
                key={`${product.id}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group"
              >
                <Link to={`/product/${product.id}`}>
                  <div className="relative aspect-[4/5] overflow-hidden bg-muted rounded-xl mb-6 border border-border group-hover:border-primary transition-all duration-500">
                    <img 
                      src={product.primary_image?.url_standard || "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=600&auto=format&fit=crop"} 
                      className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                      alt={product.name}
                    />
                    <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-md border border-border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      ${(product.price || 0).toFixed(2)}
                    </div>
                  </div>
                  <h3 className="text-lg font-headline font-black mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-tighter">Serial: {product.sku}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Print Society Method */}
      <section className="py-20 lg:py-32 bg-[#0A0D14] text-white">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <span className="text-[10px] font-black uppercase text-[#5719D3] tracking-[0.2em] mb-4 block">PRECISION IN EVERY CUT.</span>
            <h2 className="text-4xl md:text-6xl font-headline font-black italic uppercase tracking-tighter mb-6">
              THE PRINT SOCIETY<br className="hidden md:block"/>METHOD
            </h2>
            <p className="text-gray-400 text-sm md:text-base mb-10 mx-auto lg:mx-0 max-w-lg leading-relaxed">
              Go behind the scenes of our print shop. From digital proofing to precision die-cutting, see how we craft the world's most durable stickers.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-white/5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">UV-RESISTANT INKS</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-white/5">
                <Zap className="w-4 h-4 text-[#5719D3]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">PRECISION CUTTING</span>
              </div>
            </div>
          </div>
          
          <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform lg:rotate-1">
             <iframe
               src="https://www.youtube.com/embed/MJ9JaM7tI3w?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=MJ9JaM7tI3w&playsinline=1"
               className="absolute inset-0 w-full h-full object-cover scale-[1.2]"
               style={{ pointerEvents: 'none' }}
             />
             <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          </div>
        </div>
      </section>
    </div>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, User, Search, Menu, X, ChevronDown, ExternalLink, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { useAuth } from "../lib/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { getProducts, Product, getCategories, Category } from "../lib/api";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { products, setProducts, categories, setCategories, isLoading, setIsLoading } = useStore();
  const [megaMenuLinks, setMegaMenuLinks] = useState<{label: string, url: string}[]>([]);
  const cart = useStore((state) => state.cart);
  const { user } = useAuth();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * item.quantity, 0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    
    const loadData = async () => {
      // If we already have data, don't show global loader but still potentially refresh in background
      if (products.length > 0 && categories.length > 0) return;
      
      setIsLoading(true);
      try {
        const [prodData, catData] = await Promise.all([
          getProducts(),
          getCategories()
        ]);
        setProducts(prodData || []);
        setCategories(catData || []);
      } catch (error) {
        console.error("Failed to load navigation data", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Fetch Mega Menu links
    getDoc(doc(db, "settings", "global")).then(snap => {
      if (snap.exists() && snap.data().content) {
        const content = JSON.parse(snap.data().content);
        if (content.megaMenu) {
          const links = content.megaMenu.split('\n').filter((l: string) => l.includes(',')).map((line: string) => {
            const [label, url] = line.split(',');
            return { label: label.trim(), url: url.trim() };
          });
          setMegaMenuLinks(links);
        }
      }
    }).catch(e => console.error("Failed to load mega menu settings", e));

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMegaMenuOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false);
    }, 150) as unknown as number;
  };

  // Helper to get products for a specific sub-category
  const getProductsBySubCategory = (catId: number) => {
    return products.filter(p => p.categories?.includes(catId)).slice(0, 4);
  };

  const featuredDisplayProducts = products.slice(0, 2);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white border-b border-gray-100 py-2 shadow-sm" : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 flex items-center justify-between relative">
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0 z-50">
          <img 
            src="https://res.cloudinary.com/dabgothkm/image/upload/v1777400052/favicon55_xsors2.png" 
            alt="Print Society Co. Logo" 
            className="h-8 lg:h-10 w-auto group-hover:scale-105 transition-transform" 
          />
        </Link>
        
        <div className="hidden lg:flex items-center gap-8 flex-1 justify-end mr-12">
          {/* Products Mega Menu Wrapper */}
            <div 
              className="py-4" 
              onMouseEnter={handleMouseEnter} 
              onMouseLeave={handleMouseLeave}
            >
              <Link 
                to="/shop" 
                className={`flex items-center gap-1 text-[13px] font-medium transition-colors ${megaMenuOpen ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}
              >
                Products <ChevronDown className={`w-3 h-3 transition-transform ${megaMenuOpen ? 'rotate-180' : ''}`} />
              </Link>
              
              <AnimatePresence>
                {megaMenuOpen && (
                    <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 w-[1000px] bg-white rounded-2xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12)] border border-gray-100 p-8 flex gap-12"
                  >
                    {/* Left side: Brand Title */}
                    <div className="w-[180px] flex-shrink-0">
                      <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-6">Explore Gear</h3>
                      <h2 className="text-3xl font-headline font-black italic uppercase tracking-tighter leading-[0.9] text-gray-900 mb-8">
                        The <br /> Print <br /> Shop
                      </h2>
                      <Link 
                        to="/shop" 
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase bg-black text-white px-4 py-2 rounded-lg hover:bg-primary transition-colors tracking-widest"
                      >
                        Shop All <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Center: Hierarchy Stack (Category > Sub > Product) */}
                    <div className="flex-1 pt-1">
                      <div className="grid grid-cols-3 gap-x-8 gap-y-10">
                        {isLoading ? (
                          // Skeleton Columns
                          [1, 2, 3].map(i => (
                            <div key={i} className="space-y-6 animate-pulse">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-4 bg-gray-100 rounded" />
                                <div className="w-24 h-4 bg-gray-100 rounded" />
                              </div>
                              <div className="space-y-6 pl-4 border-l border-gray-50">
                                {[1, 2].map(j => (
                                  <div key={j} className="space-y-3">
                                    <div className="w-16 h-3 bg-gray-100 rounded" />
                                    <div className="space-y-2">
                                      <div className="w-full h-3 bg-gray-50 rounded" />
                                      <div className="w-3/4 h-3 bg-gray-50 rounded" />
                                      <div className="w-1/2 h-3 bg-gray-50 rounded" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : categories.filter(c => c.parent_id === 0 && c.is_visible).length > 0 ? (
                          categories.filter(c => c.parent_id === 0 && c.is_visible).map(parent => (
                            <div key={parent.id} className="space-y-6">
                              {/* Parent Category Header */}
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded leading-none uppercase">0{parent.id}</span>
                                <Link 
                                  to={`/shop?category=${parent.id}`} 
                                  className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-900 hover:text-primary transition-colors"
                                >
                                  {parent.name}
                                </Link>
                              </div>

                              {/* Sub-Categories and their hierarchy */}
                              <div className="space-y-6 pl-4 border-l border-gray-50">
                                {categories.filter(sub => sub.parent_id === parent.id && sub.is_visible).map(sub => (
                                  <div key={sub.id} className="space-y-3">
                                    <Link 
                                      to={`/shop?category=${sub.id}`} 
                                      className="text-[9px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-900 transition-colors block"
                                    >
                                      {sub.name}
                                    </Link>
                                    
                                    {/* Sub-sub categories and Products */}
                                    <div className="space-y-3">
                                      {categories.filter(c => c.parent_id === sub.id && c.is_visible).length > 0 && (
                                        <ul className="space-y-1.5 mb-2">
                                          {categories.filter(c => c.parent_id === sub.id && c.is_visible).slice(0, 4).map(deepSub => (
                                            <li key={deepSub.id}>
                                              <Link 
                                                to={`/shop?category=${deepSub.id}`}
                                                className="text-[12px] font-bold text-gray-500 hover:text-primary hover:translate-x-1 transition-all block whitespace-nowrap"
                                              >
                                                {deepSub.name}
                                              </Link>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      
                                      <ul className="space-y-1.5 border-t border-gray-50 pt-2">
                                        {getProductsBySubCategory(sub.id).slice(0, 3).map(prod => (
                                          <li key={prod.id}>
                                            <Link 
                                              to={`/product/${prod.id}`}
                                              className="text-[11px] font-medium text-gray-400 hover:text-primary hover:translate-x-1 transition-all block whitespace-nowrap"
                                            >
                                              {prod.name}
                                            </Link>
                                          </li>
                                        ))}
                                        <li>
                                          <Link 
                                            to={`/shop?category=${sub.id}`}
                                            className="text-[9px] font-black uppercase tracking-tighter text-primary/40 hover:text-primary transition-colors inline-flex items-center gap-1 group mt-1"
                                          >
                                            SEE ALL <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                                          </Link>
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          // Fallback categories (keep as secondary backup)
                          <>
                            <div className="space-y-6">
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded leading-none uppercase">01</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Vinyl Products</span>
                              </div>
                              <ul className="space-y-2">
                                <li><Link to="/shop" className="text-[12px] font-black uppercase tracking-tight text-gray-900 hover:text-primary transition-all block flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-gray-200" /> Cast Vinyl</Link></li>
                                <li><Link to="/shop" className="text-[12px] font-black uppercase tracking-tight text-gray-900 hover:text-primary transition-all block flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-gray-200" /> Holographic</Link></li>
                                <li><Link to="/shop" className="text-[12px] font-black uppercase tracking-tight text-gray-900 hover:text-primary transition-all block flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-gray-200" /> Cala-Stick</Link></li>
                              </ul>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right side: Trending Drops */}
                    <div className="w-[240px] flex-shrink-0 border-l border-gray-50 pl-10 flex flex-col pt-1">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Trending Drops</h3>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      </div>
                      <div className="space-y-6">
                        {isLoading ? (
                          [1, 2].map(i => (
                            <div key={i} className="space-y-3 animate-pulse">
                              <div className="aspect-square bg-gray-100 rounded-xl" />
                              <div className="space-y-2">
                                <div className="w-3/4 h-3 bg-gray-100 rounded" />
                                <div className="w-1/4 h-2 bg-gray-50 rounded" />
                              </div>
                            </div>
                          ))
                        ) : featuredDisplayProducts.length > 0 ? (
                          featuredDisplayProducts.map(p => (
                            <Link to={`/product/${p.id}`} key={p.id} className="group block">
                              <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3 border border-transparent group-hover:border-primary/20 transition-all">
                                {p.primary_image && (
                                  <img src={p.primary_image.url_standard} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-black uppercase tracking-tighter text-gray-900 group-hover:text-primary transition-colors whitespace-nowrap">{p.name}</p>
                                <p className="text-[9px] font-black text-gray-400">${(p.price || 0).toFixed(2)}</p>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <div className="text-[10px] text-gray-400 italic">No drops found</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/journal" className="flex items-center gap-1 text-[13px] font-medium text-gray-600 hover:text-primary transition-colors">
              <Menu className="w-3 h-3" /> Journal
            </Link>
            <Link to="/track" className="flex items-center gap-1 text-[13px] font-medium text-gray-600 hover:text-primary transition-colors">
              <Search className="w-3 h-3" /> Track Order
            </Link>
            <Link to="/about" className="text-[13px] font-medium text-gray-600 hover:text-primary transition-colors">About Us</Link>
            <Link to="/contact" className="text-[13px] font-medium text-gray-600 hover:text-primary transition-colors">Contact</Link>
          </div>

        <div className="flex items-center gap-3 lg:gap-6">
          <Link to="/cart" className="flex items-center gap-2 text-[13px] font-medium text-gray-600 hover:text-primary transition-colors relative">
            <ShoppingBag className="w-5 h-5" />
            <div className="flex flex-col items-start leading-none">
              <span className="hidden sm:inline uppercase font-black tracking-widest text-[9px]">Bag</span>
              {cartCount > 0 && <span className="hidden sm:inline text-[10px] font-black text-primary">${cartTotal.toFixed(2)}</span>}
            </div>
            {cartCount > 0 && (
              <span className="absolute -top-1 -left-2 bg-primary text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
          
          <div className="hidden sm:flex items-center gap-6">
            {user ? (
              <Link to="/dashboard" className="bg-primary text-white px-6 py-2.5 rounded-full text-[13px] font-bold hover:opacity-90 transition-all flex items-center gap-2">
                <User className="w-4 h-4" /> PROFILE
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-[13px] font-bold uppercase tracking-wider text-gray-900 hover:text-primary transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="bg-primary text-white px-6 py-2.5 rounded-full text-[13px] font-bold hover:opacity-90 transition-all flex items-center gap-2">
                  JOIN —
                </Link>
              </>
            )}
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:text-primary transition-colors z-50"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-40 lg:hidden flex flex-col pt-24 px-6 pb-12 overflow-y-auto"
          >
            <div className="flex flex-col gap-6 mb-12">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Navigation</h3>
              <nav className="flex flex-col gap-4">
                <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-headline font-black italic uppercase italic uppercase tracking-tighter text-gray-900">All Products</Link>
                <Link to="/journal" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-headline font-black italic uppercase tracking-tighter text-gray-900">Journal</Link>
                <Link to="/track" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-headline font-black italic uppercase tracking-tighter text-gray-900">Track Order</Link>
                <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-headline font-black italic uppercase tracking-tighter text-gray-900">About Us</Link>
                <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-headline font-black italic uppercase tracking-tighter text-gray-900">Contact</Link>
              </nav>
            </div>

            <div className="mt-auto pt-8 border-t border-gray-100 flex flex-col gap-4">
              {user ? (
                <Link 
                  to="/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-primary text-white py-4 rounded-xl text-center font-bold text-sm"
                >
                  My Profile
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full bg-gray-100 text-gray-900 py-4 rounded-xl text-center font-bold text-sm"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/signup" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full bg-primary text-white py-4 rounded-xl text-center font-bold text-sm"
                  >
                    Join —
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

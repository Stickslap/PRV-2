import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProducts, Product, getCategories, Category } from "../lib/api";
import { useStore } from "../store/useStore";
import { motion } from "motion/react";
import { Filter, ChevronDown, Tag, X } from "lucide-react";

export function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryId = searchParams.get('category');
  
  const { products, categories, setProducts, setCategories } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(products.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (products.length === 0 || categories.length === 0) {
        setLoading(true);
      }
      
      try {
        setLoading(true);
        const [allProducts, allCategories] = await Promise.all([
          getProducts(),
          getCategories()
        ]);
        setProducts(allProducts || []);
        setCategories(allCategories || []);
      } catch (err) {
        console.error("ProductList fetch error:", err);
        setError("Unable to load products. The store connection may be temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [products.length, categories.length]);

  const activeCategory = categories.find(c => c.id === Number(categoryId));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryId || (p.categories && p.categories.includes(Number(categoryId)));
    
    return matchesSearch && matchesCategory;
  });

  const clearCategory = () => {
    searchParams.delete('category');
    setSearchParams(searchParams);
  };

  if (loading) {
    return (
      <div className="pt-40 pb-20 max-w-7xl mx-auto px-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || (products.length === 0 && !loading)) {
    return (
      <div className="pt-40 pb-32 max-w-7xl mx-auto px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-headline font-black italic uppercase tracking-tighter mb-4">Store Offline</h2>
          <p className="text-gray-500 font-medium mb-10 leading-relaxed">
            {error || "Your BigCommerce catalog is currently being synced or the connection details are incorrect. Please ensure your Store Hash and API Token are active."}
          </p>
          <Link to="/" className="inline-flex bg-black text-white px-10 py-4 rounded-2xl font-black uppercase italic text-xs tracking-widest hover:bg-primary transition-all">
            Return to Base —
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 max-w-7xl mx-auto px-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
        <div>
          <h1 className="text-6xl font-headline font-black mb-4 uppercase tracking-tighter italic">
            {activeCategory ? activeCategory.name : "The Shop"}
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-gray-400 font-bold text-[11px] tracking-[0.2em] uppercase">{filteredProducts.length} Products Found</p>
            {activeCategory && (
              <button 
                onClick={clearCategory}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all group"
              >
                <Tag className="w-2 h-2" />
                Category: {activeCategory.name}
                <X className="w-2 h-2 opacity-50 group-hover:opacity-100" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-2.5 bg-gray-50 border border-gray-200 rounded-full font-bold uppercase text-[10px] tracking-widest outline-none focus:border-black transition-all w-full md:w-64"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
        {filteredProducts.map((product, idx) => (
          <motion.div
            key={`${product.id}-${idx}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="group"
          >
            <Link to={`/product/${product.id}`} className="block">
              <div className="relative aspect-[4/5] overflow-hidden bg-muted rounded-2xl mb-6 border border-border group-hover:border-primary transition-all duration-500">
                <img 
                  src={product.primary_image?.url_standard || "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=600&auto=format&fit=crop"} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  alt={product.name}
                />
                <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="bg-background/90 backdrop-blur-md border border-border p-3 rounded-xl flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest">Entry Detail</span>
                    <span className="text-[10px] font-mono">${(product.price || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-headline font-black mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
              <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-tighter">REF: {product.sku}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import { Package, Search, ExternalLink, SlidersHorizontal, ArrowRight, RefreshCcw, Filter, CheckCircle2, XCircle, AlertCircle, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { useStore } from "../../store/useStore";

interface AdminProduct {
  id: number;
  name: string;
  price: number;
  inventory_level: number;
  inventory_warning_level: number;
  custom_url: {
    url: string;
  };
  primary_image?: {
    url_standard: string;
  };
  template?: string;
  sku?: string;
  categories: number[];
  is_visible: boolean;
}

interface Category {
  id: number;
  name: string;
}

type StatusFilter = 'all' | 'visible' | 'hidden';
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const fetchProducts = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsSyncing(true);
      else setLoading(true);
      
      setError(null);
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get("/api/products"),
        axios.get("/api/categories").catch(() => ({ data: { data: [] } }))
      ]);
      
      if (categoriesRes.data?.data) {
        setCategories(categoriesRes.data.data);
      }

      if (productsRes.data?.data) {
        // Initialize mock template selection if not set by DB
        const mapped = productsRes.data.data.map((p: any) => ({
          ...p,
          template: localStorage.getItem(`product_template_${p.id}`) || 'standard'
        }));
        setProducts(mapped);
        setLastSynced(new Date());
        
        if (isManual) {
          toast.success(`Catalog Synced: found ${mapped.length} products`);
        }
      } else {
        setProducts([]);
        if (isManual) toast.error("No products returned from BigCommerce");
      }
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      const msg = error.response?.data?.error || "Unable to connect to BigCommerce. Please check your Store Hash and Access Token in the Settings menu.";
      setError(msg);
      if (isManual) toast.error(msg);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search term filter
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.id.toString().includes(searchTerm) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === 'visible' && !p.is_visible) return false;
      if (statusFilter === 'hidden' && p.is_visible) return false;

      // Stock filter
      if (stockFilter === 'out_of_stock' && p.inventory_level > 0) return false;
      if (stockFilter === 'in_stock' && p.inventory_level <= (p.inventory_warning_level || 0)) return false;
      if (stockFilter === 'low_stock' && (p.inventory_level <= 0 || p.inventory_level > (p.inventory_warning_level || 0))) return false;

      // Category filter
      if (categoryFilter !== 'all' && !p.categories?.includes(categoryFilter as number)) return false;

      return true;
    });
  }, [products, searchTerm, statusFilter, stockFilter, categoryFilter]);

  const handleTemplateChange = (productId: number, template: string) => {
    // Save to local storage for demo
    localStorage.setItem(`product_template_${productId}`, template);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, template } : p));
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    const deleteToast = toast.loading(`Deleting ${productToDelete.name}...`);
    try {
      await axios.delete(`/api/products/${productToDelete.id}`);
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success(`${productToDelete.name} has been purged.`, { id: deleteToast });
      setProductToDelete(null);
    } catch (error: any) {
      console.error("Delete failed:", error);
      toast.error(error.response?.data?.error || "Failed to delete product.", { id: deleteToast });
    } finally {
      setIsDeleting(false);
    }
  };

  const getTemplateBadge = (templateName: string) => {
    switch(templateName) {
      case 'print-society':
        return <span className="bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">Print Society App</span>;
      case 'standard':
      default:
        return <span className="bg-gray-100 text-gray-500 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest">Standard Default</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-headline font-black italic uppercase tracking-tight text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              Product Catalog
            </h2>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">{products.length} Items</span>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {lastSynced && (
              <span className="hidden lg:block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
                Last Sync: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button 
              onClick={() => fetchProducts(true)}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                isSyncing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-200 hover:bg-gray-50 text-black active:scale-95'
              }`}
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Products'}
            </button>

            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search catalog..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-[10px] font-bold tracking-widest outline-none focus:border-primary transition-all"
              />
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-all ${showFilters ? 'bg-black border-black text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-900 hover:text-black'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-6 animate-in slide-in-from-top duration-200">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Visibility Status</label>
              <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit">
                {(['all', 'visible', 'hidden'] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                      statusFilter === f ? 'bg-black text-white' : 'text-gray-400 hover:text-black'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Inventory Level</label>
              <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit">
                {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as StockFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStockFilter(f)}
                    className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                      stockFilter === f ? 'bg-black text-white' : 'text-gray-400 hover:text-black'
                    }`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {categories.length > 0 && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Category</label>
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-white px-4 py-1.5 rounded-lg border border-gray-200 text-[9px] font-black uppercase tracking-widest outline-none focus:border-black"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1" />
            
            <div className="flex items-end">
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter('all');
                  setStockFilter('all');
                  setCategoryFilter('all');
                }}
                className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors mb-2"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">
            Syncing with BigCommerce...
          </div>
        ) : error ? (
          <div className="p-20 text-center space-y-4">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-8 h-8 opacity-50" />
             </div>
             <h3 className="font-headline font-black italic uppercase text-2xl tracking-tighter">Connection Failed</h3>
             <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">{error}</p>
             <div className="pt-6">
               <button 
                 onClick={() => window.location.reload()}
                 className="bg-black text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg"
               >
                 Retry Connection
               </button>
             </div>
          </div>
        ) : products.length === 0 ? (
          <div className="p-20 text-center space-y-4">
             <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-8 h-8" />
             </div>
             <h3 className="font-headline font-black italic uppercase text-2xl tracking-tighter">No Products Found</h3>
             <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">Your store hash is connected, but we couldn't find any products in your BigCommerce catalog. Add products in your BigCommerce admin to see them here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Product</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Inventory</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Price</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Storefront Template</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                          {product.primary_image ? (
                            <img src={product.primary_image.url_standard} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 m-auto text-gray-300 mt-3" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 line-clamp-1">{product.name}</p>
                          </div>
                          <p className="text-[10px] text-gray-500 uppercase font-medium">ID: {product.id} {product.sku && `• SKU: ${product.sku}`}</p>
                          <div className="flex gap-1.5 mt-1.5">
                            {product.is_visible ? (
                              <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[8px] font-black uppercase tracking-widest border border-green-100 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Visible
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[8px] font-black uppercase tracking-widest border border-gray-100 flex items-center gap-1">
                                <XCircle className="w-2.5 h-2.5" /> Hidden
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          {product.inventory_level > (product.inventory_warning_level || 0) ? (
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                          ) : product.inventory_level > 0 ? (
                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                          <span className="text-xs font-bold text-gray-700">{product.inventory_level} in stock</span>
                        </div>
                        {product.inventory_level > (product.inventory_warning_level || 0) ? (
                          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded w-fit text-[8px] font-black uppercase tracking-widest border border-green-100">
                            In Stock
                          </span>
                        ) : product.inventory_level > 0 ? (
                          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded w-fit text-[8px] font-black uppercase tracking-widest border border-yellow-100">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded w-fit text-[8px] font-black uppercase tracking-widest border border-red-100">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs font-black italic font-headline">
                      ${(product.price || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                         {getTemplateBadge(product.template || 'standard')}
                         <button 
                           onClick={() => setSelectedProduct(product)}
                           className="text-gray-400 hover:text-black ml-2 transition-colors"
                         >
                           <SlidersHorizontal className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <button 
                           onClick={() => setSelectedProduct(product)}
                           className="p-1.5 px-3 bg-white border border-gray-200 hover:bg-gray-100 rounded text-black transition-all text-[10px] font-bold uppercase flex items-center gap-1.5"
                         >
                           Edit Route <ArrowRight className="w-3 h-3" />
                         </button>
                         <button 
                           onClick={() => setProductToDelete(product)}
                           className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                           title="Delete Product"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedProduct && (
        <TemplateEditorModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onSave={handleTemplateChange}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-headline font-black uppercase italic tracking-tighter mb-2">Confirm Destruction</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  You are about to delete <span className="font-bold text-black">{productToDelete.name}</span> from BigCommerce. This action is irreversible and will remove all associated variants and data.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setProductToDelete(null)}
                    disabled={isDeleting}
                    className="px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all disabled:opacity-50"
                  >
                    Cancel
                </button>
                  <button 
                    onClick={handleDeleteProduct}
                    disabled={isDeleting}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete Forever
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TemplateEditorModal({ product, onClose, onSave }: { product: AdminProduct, onClose: () => void, onSave: (id: number, template: string) => void }) {
  const [template, setTemplate] = useState(product.template || 'standard');
  const [activeTab, setActiveTab] = useState<'template'|'details'|'features'|'video'>('template');
  
  const [features, setFeatures] = useState(() => {
    const saved = localStorage.getItem(`product_features_${product.id}`);
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', label: 'MADE IN THE U.S.A', icon: 'flag' },
      { id: '2', label: 'CAST VINYL', icon: 'maximize' },
      { id: '3', label: 'BRIGHTEST COLOR', icon: 'flame' },
      { id: '4', label: 'FLO™ TECHNOLOGY', icon: 'zap' },
    ];
  });

  const [hero, setHero] = useState(() => {
    const saved = localStorage.getItem(`product_hero_${product.id}`);
    if (saved) return JSON.parse(saved);
    return {
      videoUrl: 'https://www.youtube.com/embed/MJ9JaM7tI3w',
      title: 'THE PRINT SOCIETY METHOD',
      subtitle: 'PRECISION IN EVERY CUT.',
      description: "Go behind the scenes of our print shop. From digital proofing to precision die-cutting, see how we craft the world's most durable stickers."
    };
  });

  const [specs, setSpecs] = useState(() => {
    const saved = localStorage.getItem(`product_specs_${product.id}`);
    if (saved) return JSON.parse(saved);
    return {
      outdoorLifeLabel: 'OUTDOOR LIFE',
      outdoorLife: '3-5 years',
      thicknessLabel: 'THICKNESS',
      thickness: 'Easy Peel',
      pressureSensLabel: 'PRESSURE SENS.',
      pressureSens: true,
      airReleaseLabel: 'AIR RELEASE',
      airRelease: true,
      ecoSolventLabel: 'ECO-SOLVENT TECHNOLOGY',
      ecoSolvent: true,
      hpLatexLabel: 'HP LATEX SERIES',
      hpLatex: false,
      trueSolventLabel: 'TRUE SOLVENT INKS',
      trueSolvent: false,
      uvLedCureLabel: 'UV-LED CURE',
      uvLedCure: true,
      standardWaterBasedLabel: 'STANDARD WATER-BASED',
      standardWaterBased: false
    };
  });

  const handleSave = () => {
    onSave(product.id, template);
    localStorage.setItem(`product_specs_${product.id}`, JSON.stringify(specs));
    localStorage.setItem(`product_hero_${product.id}`, JSON.stringify(hero));
    localStorage.setItem(`product_features_${product.id}`, JSON.stringify(features));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-headline font-black uppercase tracking-tighter italic text-gray-900 leading-none">
              Storefront Routing Editor
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">{product.name} (ID: {product.id})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200">
            <ExternalLink className="w-4 h-4 text-gray-500 rotate-45" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-6">
           <button 
             onClick={() => setActiveTab('template')}
             className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'template' ? 'text-primary border-b-2 border-primary': 'text-gray-400 hover:text-gray-900'}`}
           >
             Routing & Template
           </button>
           <button 
             onClick={() => setActiveTab('details')}
             className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'details' ? 'text-primary border-b-2 border-primary': 'text-gray-400 hover:text-gray-900'}`}
           >
             Display Options
           </button>
           <button 
             onClick={() => setActiveTab('features')}
             className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'features' ? 'text-primary border-b-2 border-primary': 'text-gray-400 hover:text-gray-900'}`}
           >
             Features Bar
           </button>
           <button 
             onClick={() => setActiveTab('video')}
             className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'video' ? 'text-primary border-b-2 border-primary': 'text-gray-400 hover:text-gray-900'}`}
           >
             Video Hero
           </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {activeTab === 'template' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-2">Select Display Template</h3>
                <p className="text-[11px] text-gray-500 mb-4 max-w-lg">Choose how this product should be presented to users on the storefront. Different templates expose different custom options and layouts.</p>
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Template Option */}
                  <label className={`cursor-pointer rounded-2xl border-2 transition-all p-4 ${template === 'standard' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex gap-4">
                      <div className="mt-1">
                        <input type="radio" checked={template === 'standard'} onChange={() => setTemplate('standard')} className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="block font-black text-xs uppercase tracking-widest mb-1">Standard Default</span>
                        <p className="text-[10px] text-gray-500 leading-relaxed">The basic BigCommerce product page layout. Shows standard options, images, and description. Best for generic merchandise.</p>
                        <div className="mt-4 p-3 bg-white border border-gray-100 rounded-lg">
                           <div className="w-full h-24 bg-gray-50 flex items-center justify-center rounded">
                             <div className="flex gap-2 w-full px-4">
                                <div className="w-1/3 bg-gray-200 h-16 rounded"/>
                                <div className="w-2/3 space-y-1 mt-1">
                                  <div className="w-3/4 h-2 bg-gray-200 rounded"/>
                                  <div className="w-1/2 h-2 bg-gray-200 rounded"/>
                                  <div className="w-full h-8 bg-gray-200 rounded mt-2"/>
                                </div>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Print Society Template Option */}
                  <label className={`cursor-pointer rounded-2xl border-2 transition-all p-4 ${template === 'print-society' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex gap-4">
                      <div className="mt-1">
                        <input type="radio" checked={template === 'print-society'} onChange={() => setTemplate('print-society')} className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="block font-black text-xs uppercase tracking-widest text-[#5719D3] mb-1">Print Society Custom Flow</span>
                        <p className="text-[10px] text-gray-500 leading-relaxed">The advanced three-column layout designed specifically for custom sticker printing. Maps width options, glossy/matte finish, and artwork uploads.</p>
                        <div className="mt-4 p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                           <div className="w-full h-24 bg-white flex flex-col items-center justify-center rounded">
                              <div className="w-full text-center mb-2"><div className="w-1/2 h-2 bg-[#5719D3] mx-auto rounded"/></div>
                              <div className="flex gap-1 w-full px-2">
                                <div className="w-1/3 bg-gray-100 h-12 rounded border-t-2 border-[#5719D3]"/>
                                <div className="w-1/3 bg-gray-100 h-12 rounded border-t-2 border-yellow-400"/>
                                <div className="w-1/3 bg-gray-100 h-12 rounded border-t-2 border-gray-300"/>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {template === 'print-society' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                  <ExternalLink className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-yellow-800 tracking-widest mb-1">Action Required in BigCommerce</h4>
                    <p className="text-[10px] text-yellow-700 leading-relaxed">
                      To utilize the "Print Society Custom Flow" effectively, ensure this product has a "Material Width" variant option, a "Finish" modifier (Gloss/Matte), and an active inventory limit if Processing Time calculation is required.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6 pb-20">
              <p className="text-[11px] text-gray-500 mb-4 max-w-lg">Modify presentation attributes for the storefront. These will overlay the core BigCommerce data.</p>
              
              <div className="grid grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                 <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Processing Time Display</label>
                    <input type="text" placeholder="e.g. 5 DAYS" defaultValue="5 DAYS" className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg text-xs font-bold font-headline outline-none focus:border-primary" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Quality Promise Highlight</label>
                    <input type="text" placeholder="Subtitle" defaultValue="Every project is hand-inspected..." className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg text-xs font-bold outline-none focus:border-primary" />
                 </div>
                 <div className="col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Artwork Guidelines Link</label>
                    <input type="url" placeholder="https://..." defaultValue="/artwork-guide" className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg text-xs font-medium outline-none focus:border-primary" />
                 </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-4">PRODUCTION SPECIFICATIONS</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-[#5719D3]">PHYSICAL ARCHITECTURE</h5>
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 group">
                       <input 
                         type="text" 
                         value={specs.outdoorLifeLabel || 'OUTDOOR LIFE'} 
                         onChange={e => setSpecs({...specs, outdoorLifeLabel: e.target.value})} 
                         className="text-xs font-bold text-gray-600 outline-none w-1/2 uppercase tracking-widest bg-transparent focus:border-b border-primary" 
                       />
                       <input 
                         type="text" 
                         value={specs.outdoorLife} 
                         onChange={e => setSpecs({...specs, outdoorLife: e.target.value})} 
                         className="text-xs font-black text-right outline-none w-1/2 bg-transparent focus:border-b border-primary italic" 
                         placeholder="3-5 years" 
                       />
                    </div>
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 group">
                       <input 
                         type="text" 
                         value={specs.thicknessLabel || 'THICKNESS'} 
                         onChange={e => setSpecs({...specs, thicknessLabel: e.target.value})} 
                         className="text-xs font-bold text-gray-600 outline-none w-1/2 uppercase tracking-widest bg-transparent focus:border-b border-primary" 
                       />
                       <input 
                         type="text" 
                         value={specs.thickness} 
                         onChange={e => setSpecs({...specs, thickness: e.target.value})} 
                         className="text-xs font-black text-right outline-none w-1/2 bg-transparent focus:border-b border-primary italic" 
                         placeholder="Easy Peel" 
                       />
                    </div>
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 group">
                       <input 
                         type="text" 
                         value={specs.pressureSensLabel || 'PRESSURE SENS.'} 
                         onChange={e => setSpecs({...specs, pressureSensLabel: e.target.value})} 
                         className="text-xs font-bold text-gray-600 outline-none w-1/2 uppercase tracking-widest bg-transparent focus:border-b border-primary" 
                       />
                       <input type="checkbox" checked={specs.pressureSens} onChange={e => setSpecs({...specs, pressureSens: e.target.checked})} className="ml-2 cursor-pointer" />
                    </div>
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 group">
                       <input 
                         type="text" 
                         value={specs.airReleaseLabel || 'AIR RELEASE'} 
                         onChange={e => setSpecs({...specs, airReleaseLabel: e.target.value})} 
                         className="text-xs font-bold text-gray-600 outline-none w-1/2 uppercase tracking-widest bg-transparent focus:border-b border-primary" 
                       />
                       <input type="checkbox" checked={specs.airRelease} onChange={e => setSpecs({...specs, airRelease: e.target.checked})} className="ml-2 cursor-pointer" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-[#5719D3]">INK COMPATIBILITY REGISTRY</h5>
                    <div className={`flex items-center justify-between border rounded-lg p-3 transition-colors ${specs.ecoSolvent ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-white border-gray-200'}`}>
                       <input 
                         type="text" 
                         value={specs.ecoSolventLabel || 'ECO-SOLVENT TECHNOLOGY'} 
                         onChange={e => setSpecs({...specs, ecoSolventLabel: e.target.value})} 
                         className="text-xs font-bold text-gray-800 outline-none w-5/6 uppercase tracking-widest bg-transparent focus:border-b border-primary" 
                       />
                       <label className="cursor-pointer">
                         <input type="checkbox" checked={specs.ecoSolvent} onChange={e => setSpecs({...specs, ecoSolvent: e.target.checked})} className="hidden" />
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${specs.ecoSolvent ? 'border-green-500 text-green-500' : 'border-gray-300 text-transparent'}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                         </div>
                       </label>
                    </div>
                    <div className={`flex items-center justify-between border rounded-lg p-3 transition-colors ${specs.hpLatex ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-white border-gray-200'}`}>
                       <input 
                         type="text" 
                         value={specs.hpLatexLabel || 'HP LATEX SERIES'} 
                         onChange={e => setSpecs({...specs, hpLatexLabel: e.target.value})} 
                         className="text-xs font-bold text-gray-800 outline-none w-5/6 uppercase tracking-widest bg-transparent focus:border-b border-primary" 
                       />
                       <label className="cursor-pointer">
                         <input type="checkbox" checked={specs.hpLatex} onChange={e => setSpecs({...specs, hpLatex: e.target.checked})} className="hidden" />
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${specs.hpLatex ? 'border-green-500 text-green-500' : 'border-gray-300 text-transparent'}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                         </div>
                       </label>
                    </div>
                    <div className={`flex items-center justify-between border rounded-lg p-3 transition-colors ${specs.trueSolvent ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-white border-gray-200'}`}>
                       <input 
                         type="text" 
                         value={specs.trueSolventLabel || 'TRUE SOLVENT INKS'} 
                         onChange={e => setSpecs({...specs, trueSolventLabel: e.target.value})} 
                         className="text-xs font-bold text-gray-800 outline-none w-5/6 uppercase tracking-widest bg-transparent focus:border-b border-primary" 
                       />
                       <label className="cursor-pointer">
                         <input type="checkbox" checked={specs.trueSolvent} onChange={e => setSpecs({...specs, trueSolvent: e.target.checked})} className="hidden" />
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${specs.trueSolvent ? 'border-green-500 text-green-500' : 'border-gray-300 text-transparent'}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                         </div>
                       </label>
                    </div>
                    <div className={`flex items-center justify-between border rounded-lg p-3 transition-colors ${specs.uvLedCure ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-white border-gray-200'}`}>
                       <input 
                         type="text" 
                         value={specs.uvLedCureLabel || 'UV-LED CURE'} 
                         onChange={e => setSpecs({...specs, uvLedCureLabel: e.target.value})} 
                         className="text-xs font-bold text-gray-800 outline-none w-5/6 uppercase tracking-widest bg-transparent focus:border-b border-primary" 
                       />
                       <label className="cursor-pointer">
                         <input type="checkbox" checked={specs.uvLedCure} onChange={e => setSpecs({...specs, uvLedCure: e.target.checked})} className="hidden" />
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${specs.uvLedCure ? 'border-green-500 text-green-500' : 'border-gray-300 text-transparent'}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                         </div>
                       </label>
                    </div>
                    <div className={`flex items-center justify-between border rounded-lg p-3 transition-colors ${specs.standardWaterBased ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-white border-gray-200'}`}>
                       <input 
                         type="text" 
                         value={specs.standardWaterBasedLabel || 'STANDARD WATER-BASED'} 
                         onChange={e => setSpecs({...specs, standardWaterBasedLabel: e.target.value})} 
                         className="text-xs font-bold text-gray-800 outline-none w-5/6 uppercase tracking-widest bg-transparent focus:border-b border-primary" 
                       />
                       <label className="cursor-pointer">
                         <input type="checkbox" checked={specs.standardWaterBased} onChange={e => setSpecs({...specs, standardWaterBased: e.target.checked})} className="hidden" />
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${specs.standardWaterBased ? 'border-green-500 text-green-500' : 'border-gray-300 text-transparent'}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                         </div>
                       </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">Features Bar Config</h3>
                  <p className="text-[11px] text-gray-500 max-w-lg">Manage the set of key characteristics displayed in the heavy dark cards bar.</p>
                </div>
                <button 
                  onClick={() => setFeatures([...features, { id: Date.now().toString(), label: 'NEW FEATURE', icon: 'check' }])}
                  className="px-4 py-2 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" /> Add Feature
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {features.map((feature: any, index: number) => (
                  <div key={feature.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-4 group">
                    <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 group-hover:border-primary group-hover:text-primary transition-colors">
                      <select 
                        value={feature.icon}
                        onChange={(e) => {
                          const newFeatures = [...features];
                          newFeatures[index].icon = e.target.value;
                          setFeatures(newFeatures);
                        }}
                        className="bg-transparent outline-none text-xs font-bold uppercase cursor-pointer"
                      >
                        <option value="flag">Flag</option>
                        <option value="maximize">Maximize</option>
                        <option value="flame">Flame</option>
                        <option value="zap">Zap</option>
                        <option value="check">Check</option>
                        <option value="shield">Shield</option>
                        <option value="truck">Truck</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text"
                        value={feature.label}
                        onChange={(e) => {
                          const newFeatures = [...features];
                          newFeatures[index].label = e.target.value;
                          setFeatures(newFeatures);
                        }}
                        placeholder="Feature Label"
                        className="w-full bg-transparent outline-none text-xs font-black uppercase tracking-[0.1em] border-b border-transparent focus:border-primary pb-1"
                      />
                    </div>
                    <button 
                      onClick={() => setFeatures(features.filter((f: any) => f.id !== feature.id))}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {features.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">No Features Configured</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-900 rounded-2xl p-6 text-white overflow-hidden relative">
                 <div className="flex items-center gap-3 mb-4 opacity-50">
                    <Package className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Live Preview Manifest</span>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {features.map((f: any) => (
                      <div key={f.id} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest">
                        {f.label}
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-2">Video Hero Customization</h3>
                <p className="text-[11px] text-gray-500 mb-6 max-w-lg">Configure the high-impact video showcase section for this product. Use a YouTube embed URL for the best compatibility.</p>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">YouTube Embed URL</label>
                    <input 
                      type="url" 
                      value={hero.videoUrl} 
                      onChange={e => setHero({...hero, videoUrl: e.target.value})} 
                      placeholder="https://www.youtube.com/embed/..." 
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-xs font-medium outline-none focus:border-primary transition-all" 
                    />
                    <p className="text-[8px] text-gray-400 mt-2 uppercase tracking-tight">Format: https://www.youtube.com/embed/VIDEO_ID</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Hero Title</label>
                      <input 
                        type="text" 
                        value={hero.title} 
                        onChange={e => setHero({...hero, title: e.target.value})} 
                        className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-tighter italic outline-none focus:border-primary transition-all" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Hero Subtitle</label>
                      <input 
                        type="text" 
                        value={hero.subtitle} 
                        onChange={e => setHero({...hero, subtitle: e.target.value})} 
                        className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-primary transition-all" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Hero Description</label>
                    <textarea 
                      value={hero.description} 
                      onChange={e => setHero({...hero, description: e.target.value})} 
                      rows={4}
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-xs font-medium outline-none focus:border-primary transition-all resize-none" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:text-black hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-lg">
            Save Route
          </button>
        </div>
      </div>
    </div>
  );
}

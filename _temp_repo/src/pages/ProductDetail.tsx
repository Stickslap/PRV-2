import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProduct, Product, buyNow, Variant } from "../lib/api";
import { useStore } from "../store/useStore";
import { ProductReviews } from "../components/ProductReviews";
import { ProductFeaturesBar } from "../components/ProductFeaturesBar";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, ArrowLeft, Shield, Truck, RotateCcw, Activity, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [specs, setSpecs] = useState<any>(null);
  const [template, setTemplate] = useState<string>('standard');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentVariant, setCurrentVariant] = useState<Variant | null>(null);
  const addItem = useStore((state) => state.addItem);

  const calculatePrice = (p: Product, options: Record<number, number>) => {
    let price = Number(p.price) || 0;
    let matchingV: Variant | null = null;

    // 1. Check for matching variant if all options are selected
    if (p.variants && p.options && p.options.length > 0) {
      const selectedOptionEntries = Object.entries(options).filter(([optId]) => 
        p.options?.some(o => o.id === Number(optId))
      );

      matchingV = p.variants.find(v => {
        if (!v.option_values) return false;
        return selectedOptionEntries.every(([optId, valId]) => 
          v.option_values?.some(vov => vov.option_id === Number(optId) && vov.id === Number(valId))
        );
      }) || null;

      if (matchingV && typeof matchingV.price === 'number') {
        price = matchingV.price;
      }
    }

    // 2. Add modifier adjustments
    if (p.modifiers) {
      p.modifiers.forEach(mod => {
        const selectedValId = options[mod.id];
        if (selectedValId) {
          const val = mod.option_values.find(v => v.id === selectedValId);
          if (val?.adjusters?.price) {
            const adj = val.adjusters.price;
            const adjVal = Number(adj.adjuster_value) || 0;
            if (adj.adjuster === 'relative') {
              price += adjVal;
            } else if (adj.adjuster === 'percentage') {
              price += ((Number(p.price) || 0) * (adjVal / 100));
            }
          }
        }
      });
    }

    setCurrentVariant(matchingV);
    return price;
  };

  const isOptionValueDisabled = (optionId: number, valueId: number) => {
    if (!product || !product.variants || !product.options) return false;

    // We check if choosing this value (along with other currently selected options)
    // leads to a variant that is disabled.
    // If it's the ONLY potential outcome for this specific selection, it's disabled.
    // Actually, usually we want to see if there is ANY enabled variant that matches
    // the current selections PLUS this new value.

    const testOptions = { ...selectedOptions, [optionId]: valueId };
    
    // Only consider options that create variants
    const variantOptionIds = product.options.map(o => o.id);
    const selectedVariantOptions = Object.entries(testOptions)
      .filter(([id]) => variantOptionIds.includes(Number(id)));

    // Find all variants that match the selections so far (including the one we are testing)
    const matchingVariants = product.variants.filter(v => {
      if (!v.option_values) return false;
      return selectedVariantOptions.every(([optId, valId]) => 
        v.option_values?.some(vov => vov.option_id === Number(optId) && vov.id === Number(valId))
      );
    });

    // If there are matching variants, but ALL of them are disabled, then this value is disabled.
    if (matchingVariants.length > 0) {
      return matchingVariants.every(v => v.purchasing_disabled);
    }

    return false;
  };

  useEffect(() => {
    if (product) {
      setCurrentPrice(calculatePrice(product, selectedOptions));
    }
  }, [product, selectedOptions]);

  useEffect(() => {
    if (id) {
      const savedTemplate = localStorage.getItem(`product_template_${id}`);
      if (savedTemplate) {
        setTemplate(savedTemplate);
      }
      
      getProduct(id).then(p => {
        const mainImg = p?.primary_image?.url_standard || "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=600&auto=format&fit=crop";
        setProduct(p);
        setSelectedImage(mainImg);
        setLoading(false);

        if (p) {
          const defaultOptions: Record<number, number> = {};
          if (p.options) {
            p.options.forEach(opt => {
              if (opt.option_values && opt.option_values.length > 0) {
                defaultOptions[opt.id] = opt.option_values[0].id;
              }
            });
          }
          if (p.modifiers) {
            p.modifiers.forEach(mod => {
              if (mod.option_values && mod.option_values.length > 0) {
                defaultOptions[mod.id] = mod.option_values[0].id;
              }
            });
          }
          setSelectedOptions(defaultOptions);
        }

        const savedStats = localStorage.getItem(`product_specs_${id}`);
        if (savedStats) {
          setSpecs(JSON.parse(savedStats));
        } else {
          setSpecs({
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
          });
        }
      });
    }
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      // Use the specific matching variant ID if found, otherwise fallback to base_variant_id
      const variantId = currentVariant?.id || product.base_variant_id || undefined;
      addItem(product, variantId, selectedOptions, currentPrice);
      toast.success("ADED TO BAG", {
        style: {
          background: '#000',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: 0,
        },
        iconTheme: {
          primary: '#ff0050',
          secondary: '#fff',
        },
      });
    }
  };

  const handleBuyNow = async () => {
    if (product) {
      // Add to cart first
      const variantId = currentVariant?.id || product.base_variant_id || undefined;
      addItem(product, variantId, selectedOptions, currentPrice);
      
      // Navigate to our custom checkout page
      navigate('/checkout');
    }
  };

  if (loading) return <div className="pt-40 text-center font-headline font-black animate-pulse uppercase tracking-[0.2em] text-xs">Accessing Lab Entry...</div>;
  if (!product) return <div className="pt-40 text-center font-headline font-black uppercase tracking-[0.2em] text-xs">Registry Error // Code 404</div>;

  const getCustomField = (name: string) => product?.custom_fields?.find(f => f.name === name)?.value;

  const savedHero = localStorage.getItem(`product_hero_${id}`);
  const heroData = savedHero ? JSON.parse(savedHero) : null;

  const heroVideo = getCustomField('hero_video_url') || heroData?.videoUrl || "https://www.youtube.com/embed/MJ9JaM7tI3w";
  const heroTitle = getCustomField('hero_title') || heroData?.title || "THE PRINT SOCIETY METHOD";
  const heroSubtitle = getCustomField('hero_subtitle') || heroData?.subtitle || "PRECISION IN EVERY CUT.";
  const heroDescription = getCustomField('hero_description') || heroData?.description || "Go behind the scenes of our print shop. From digital proofing to precision die-cutting, see how we craft the world's most durable stickers.";

  if (template === 'print-society') {
    return (
      <div className="pt-32 pb-20 bg-[#fafafa] min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-12 hover:text-[#5719D3] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Return to Lab
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
            {/* Left Header Area */}
            <div className="lg:col-span-7">
              <h1 className="text-5xl md:text-6xl font-headline font-black mb-4 uppercase tracking-tighter leading-[0.9] italic">{product.name}</h1>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 block mb-6">PRINT SOCIETY CO. —</span>
              
              <div className="prose prose-sm max-w-none text-gray-600 mb-10 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: product.description }} />

              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center text-amber-700 font-black text-xs">
                    BX
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">INVENTORY STATUS</div>
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">CURRENTLY IN STOCK: 10 ROLLS</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center text-[#5719D3] font-black text-xs">
                    TM
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">PROCESSING TIME</div>
                    <div className="text-[10px] font-black text-gray-900 uppercase tracking-widest">5 DAYS</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Gallery / Promise Area */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SHOWCASE GALLERY</h4>
              
              <div className="bg-white border text-center border-gray-200 rounded-3xl overflow-hidden self-start shadow-sm w-full relative">
                <img 
                  src={selectedImage || product.primary_image?.url_standard} 
                  className="w-full aspect-[4/3] object-contain bg-white"
                  alt={product.name}
                />
                
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 pointer-events-none">
                    {product.images.map((img, i) => (
                      <button 
                        key={i} 
                        onClick={() => setSelectedImage(img.url_standard)}
                        className={`w-12 h-12 rounded-lg border-2 pointer-events-auto overflow-hidden transition-all ${selectedImage === img.url_standard ? 'border-[#5719D3] shadow-lg scale-110' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                      >
                         <img src={img.url_standard} className="w-full h-full object-cover bg-white" alt={`${product.name} ${i}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-3xl p-8 border-dashed mt-auto">
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-6 h-6 bg-[#f5f3ff] text-[#5719D3] rounded-full flex items-center justify-center">
                     <Shield className="w-3.5 h-3.5" />
                   </div>
                   <h4 className="text-sm font-headline font-black italic uppercase">QUALITY PROMISE</h4>
                </div>
                <p className="text-[10px] text-gray-500 italic mb-6">
                  Every project is hand-inspected by our boutique production team for precision and adhesive integrity.
                </p>
                <button className="w-full py-3 border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-gray-900 transition-colors">
                  VIEW ARTWORK GUIDE —
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16 text-[#000]">
            
            {/* Column 1: Material Width */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden self-start shadow-sm">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                 <div className="text-[#5719D3]"><RotateCcw className="w-4 h-4" /></div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest">MATERIAL WIDTH</h3>
              </div>
              <div className="p-6 space-y-6">
                 {product.options && product.options.map(option => (
                   <div key={option.id}>
                     <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">{option.display_name}</label>
                     <select 
                       className="w-full border border-gray-200 rounded-xl p-4 text-[11px] font-bold outline-none focus:border-[#5719D3] appearance-none bg-white"
                       value={selectedOptions[option.id] || ''}
                       onChange={(e) => setSelectedOptions(prev => ({...prev, [option.id]: Number(e.target.value)}))}
                     >
                        {option.option_values.map(val => {
                          const priceAdj = val.adjusters?.price?.adjuster_value;
                          const adjText = priceAdj ? ` (+${val.adjusters?.price?.adjuster === 'percentage' ? priceAdj + '%' : '$' + priceAdj})` : '';
                          const isDisabled = isOptionValueDisabled(option.id, val.id);
                          return (
                            <option key={val.id} value={val.id} disabled={isDisabled}>
                              {val.label}{adjText}{isDisabled ? ' (Unavailable)' : ''}
                            </option>
                          );
                        })}
                     </select>
                   </div>
                 ))}
                 
                 {product.modifiers && product.modifiers.map(modifier => (
                   <div key={modifier.id}>
                     <label className="block text-[9px] font-black uppercase text-[#5719D3] tracking-widest mb-3">{modifier.display_name}</label>
                     <div className="grid grid-cols-2 gap-2">
                       {modifier.option_values.map(val => (
                         <button 
                           key={val.id}
                           onClick={() => setSelectedOptions(prev => ({...prev, [modifier.id]: val.id}))}
                           className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${selectedOptions[modifier.id] === val.id ? 'bg-[#6c2bd9] text-white' : 'border border-gray-200 text-gray-900 hover:bg-gray-50'}`}
                         >
                           {val.label}
                         </button>
                       ))}
                     </div>
                   </div>
                 ))}
                 
                 {(!product.options || product.options.length === 0) && (!product.modifiers || product.modifiers.length === 0) && (
                   <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">No additional options</div>
                 )}
              </div>
            </div>

            {/* Column 2: Procurement */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden self-start shadow-sm flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-[#f9fafb] flex items-center gap-2">
                 <div className="text-[#5719D3] font-black text-sm">#</div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest">PROCUREMENT</h3>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                 <button className="w-full py-4 border border-gray-100 rounded-xl text-[10px] font-black uppercase text-[#5719D3] tracking-widest mb-6">
                   STICKERS
                 </button>
                 
                 <div className="mb-6">
                   <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">QUANTITY (STICKERPACK)</label>
                   <input type="number" defaultValue="1" className="w-full border border-gray-200 rounded-xl p-4 text-sm font-black outline-none focus:border-[#5719D3] bg-white box-border" />
                   <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-2">STOCK VERIFIED</p>
                 </div>

                 <div className="bg-[#0A0D14] rounded-2xl p-6 text-center text-white mb-4 mt-auto">
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">ORDER TOTAL</p>
                   <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-headline font-black italic text-[#8B5CF6] tracking-tighter">${(currentPrice || 0).toFixed(2)}</span>
                     <span className="text-[10px] font-black text-[#5719D3] bg-[#2e1065] px-2 py-1 rounded max-h-min">${(currentPrice || 0).toFixed(2)}/EA</span>
                   </div>
                 </div>

                 <div className="bg-[#fbbf24] rounded-xl p-4 flex items-center justify-center gap-2 text-[#92400e] hover:brightness-105 cursor-pointer transition-all">
                   <Activity className="w-4 h-4" />
                   <span className="text-[9px] font-black uppercase tracking-widest">EARN $0.50 SOCIETY CREDIT</span>
                 </div>
              </div>
            </div>

            {/* Column 3: Order Workflow */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden self-start shadow-sm">
              <div className="p-4 border-b border-gray-100 bg-[#f9fafb] flex items-center gap-2">
                 <div className="text-[#5719D3]"><ArrowLeft className="w-4 h-4 rotate-180" /></div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest">ORDER WORKFLOW</h3>
              </div>
              <div className="p-6">
                
                <div className="border border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50/50 mb-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                    </svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest mb-1 text-center">CLICK TO UPLOAD ARTWORK</span>
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">PDF, AI, PNG | MAX 50MB</span>
                </div>

                <div className="mb-6">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">ORDER NOTES</label>
                  <textarea 
                    className="w-full border border-gray-200 rounded-xl p-4 text-[11px] outline-none focus:border-[#5719D3] resize-none h-24 bg-white"
                    placeholder="Add any special instructions or details for this order..."
                  />
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={handleAddToCart} 
                    disabled={currentVariant?.purchasing_disabled}
                    className="w-full py-4 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ADD TO CART —
                  </button>
                  <button 
                    onClick={handleBuyNow}
                    disabled={currentVariant?.purchasing_disabled}
                    className="w-full py-4 bg-[#7e22ce] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6b21a8] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {currentVariant?.purchasing_disabled ? "UNAVAILABLE" : "BUY IT NOW"} <ArrowLeft className="w-3 h-3 rotate-180" />
                  </button>
                </div>

              </div>
            </div>

          </div>

          <ProductFeaturesBar productId={id || ''} />

          {specs && (
            <div className="w-full border border-gray-200 rounded-3xl overflow-hidden shadow-sm bg-white">
              <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-[#FCFCFD]">
                <Activity className="w-5 h-5 text-[#5719D3]" />
                <h3 className="font-headline font-black italic uppercase text-lg tracking-tighter">PRODUCTION SPECIFICATIONS</h3>
              </div>
              <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-[#5719D3] tracking-widest mb-6">PHYSICAL ARCHITECTURE</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest"><RotateCcw className="w-3.5 h-3.5" /> {specs.outdoorLifeLabel || 'OUTDOOR LIFE'}</span>
                      <span className="text-xs font-black italic">{specs.outdoorLife}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                       <span className="text-[10px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest"><Truck className="w-3.5 h-3.5" /> {specs.thicknessLabel || 'THICKNESS'}</span>
                       <span className="text-xs font-black italic">{specs.thickness}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                       <span className="text-[10px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest"><Shield className="w-3.5 h-3.5" /> {specs.pressureSensLabel || 'PRESSURE SENS.'}</span>
                       {specs.pressureSens ? <span className="text-xs font-black italic text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> YES</span> : <span className="text-xs font-black italic text-gray-400">NO</span>}
                    </div>
                    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                       <span className="text-[10px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest"><Activity className="w-3.5 h-3.5" /> {specs.airReleaseLabel || 'AIR RELEASE'}</span>
                       {specs.airRelease ? <span className="text-xs font-black italic text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> YES</span> : <span className="text-xs font-black italic text-gray-400">NO</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-[#5719D3] tracking-widest mb-6">INK COMPATIBILITY REGISTRY</h4>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.ecoSolvent ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.ecoSolvent ? 'text-gray-900' : 'text-gray-400'}`}>{specs.ecoSolventLabel || 'ECO-SOLVENT TECHNOLOGY'}</span>
                      {specs.ecoSolvent ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    </div>
                    <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.hpLatex ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.hpLatex ? 'text-gray-900' : 'text-gray-400'}`}>{specs.hpLatexLabel || 'HP LATEX SERIES'}</span>
                      {specs.hpLatex ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    </div>
                    <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.trueSolvent ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.trueSolvent ? 'text-gray-900' : 'text-gray-400'}`}>{specs.trueSolventLabel || 'TRUE SOLVENT INKS'}</span>
                      {specs.trueSolvent ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    </div>
                    <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.uvLedCure ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.uvLedCure ? 'text-gray-900' : 'text-gray-400'}`}>{specs.uvLedCureLabel || 'UV-LED CURE'}</span>
                      {specs.uvLedCure ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    </div>
                    <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.standardWaterBased ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.standardWaterBased ? 'text-gray-900' : 'text-gray-400'}`}>{specs.standardWaterBasedLabel || 'STANDARD WATER-BASED'}</span>
                      {specs.standardWaterBased ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Video Hero Panel - Light Theme Split View */}
          <section className="mt-20 mb-12 bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] relative">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Text Side */}
              <div className="p-16 lg:p-24 flex flex-col justify-center bg-white">
                <motion.span 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="text-primary font-headline font-black text-xs uppercase tracking-[0.3em] mb-6"
                >
                  {heroSubtitle}
                </motion.span>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-gray-900 text-6xl lg:text-7xl font-headline font-black uppercase tracking-tighter italic leading-none mb-8"
                >
                  {heroTitle.split(' ').map((word, i) => (
                    <span key={i} className="block">{word}</span>
                  ))}
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-gray-500 text-lg font-medium leading-relaxed max-w-md mb-12"
                >
                  {heroDescription}
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-6 py-3 rounded-2xl">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-gray-900 text-[10px] font-black uppercase tracking-widest">UV-RESISTANT INKS</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-6 py-3 rounded-2xl">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-gray-900 text-[10px] font-black uppercase tracking-widest">PRECISION CUTTING</span>
                  </div>
                </motion.div>
              </div>

              {/* Video Side */}
              <div className="relative border-l border-gray-50 bg-gray-50/50 flex items-center justify-center min-h-[400px] lg:min-h-0">
                <div className="w-full h-full p-8 lg:p-12 flex items-center justify-center">
                  <div className="relative w-full aspect-video rounded-[30px] overflow-hidden border-4 border-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] bg-black group">
                    <iframe 
                      src={`${heroVideo}${heroVideo.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${heroVideo.split('/').pop()?.split('?')[0]}&playsinline=1`}
                      className="absolute inset-0 w-full h-full pointer-events-none scale-[1.01]"
                      title="Product Showreel"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          <ProductReviews productId={id || ''} />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-12 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Return to Lab
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
          {/* Images */}
          <div className="space-y-6">
            <motion.div 
              key={selectedImage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square bg-muted rounded-3xl overflow-hidden border border-border"
            >
              <img 
                src={selectedImage || product.primary_image?.url_standard} 
                className="w-full h-full object-cover"
                alt={product.name}
              />
            </motion.div>
            <div className="grid grid-cols-4 gap-4">
              {product.images?.map((img, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedImage(img.url_standard)}
                  className={`aspect-square bg-muted rounded-xl border ${selectedImage === img.url_standard ? 'border-primary' : 'border-border'} overflow-hidden cursor-pointer hover:border-primary transition-all`}
                >
                  <img src={img.url_standard} className={`w-full h-full object-cover transition-all ${selectedImage === img.url_standard ? 'grayscale-0' : 'grayscale hover:grayscale-0'}`} alt={`${product.name} ${i}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">In Stock & Verified</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{product.sku}</span>
              </div>
              <h1 className="text-6xl font-headline font-black mb-6 uppercase tracking-tighter leading-[0.9] italic">{product.name}</h1>
              <p className="text-4xl font-headline font-black mb-10 tracking-tight text-gray-900">${(currentPrice || 0).toFixed(2)}</p>
              
              <div className="prose prose-sm max-w-none text-gray-500 mb-12 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>

            {product.options && product.options.map((option) => (
              <div key={option.id} className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#5719D3] mb-3">
                  {option.display_name}
                </label>
                <div className="flex flex-wrap gap-3">
                  {option.option_values.map((val) => {
                    const isSelected = selectedOptions[option.id] === val.id;
                    const isDisabled = isOptionValueDisabled(option.id, val.id);
                    const priceAdj = val.adjusters?.price?.adjuster_value;
                    const adjText = priceAdj ? ` (+${val.adjusters?.price?.adjuster === 'percentage' ? priceAdj + '%' : '$' + priceAdj})` : '';
                    return (
                      <button 
                        key={val.id} 
                        disabled={isDisabled}
                        onClick={() => setSelectedOptions(prev => ({...prev, [option.id]: val.id}))}
                        className={`px-6 py-3 border rounded-xl text-xs font-bold transition-colors ${
                          isSelected ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' : 'border-gray-200 hover:border-black hover:bg-gray-50'
                        } ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                      >
                        {val.label}{adjText}{isDisabled ? ' (N/A)' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {product.modifiers && product.modifiers.map((modifier) => (
              <div key={modifier.id} className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#5719D3] mb-3">
                  {modifier.display_name}
                </label>
                <div className="flex flex-wrap gap-3">
                  {modifier.option_values.map((val) => {
                    const isSelected = selectedOptions[modifier.id] === val.id;
                    const priceAdj = val.adjusters?.price?.adjuster_value;
                    const adjText = priceAdj ? ` (+${val.adjusters?.price?.adjuster === 'percentage' ? priceAdj + '%' : '$' + priceAdj})` : '';
                    return (
                      <button 
                        key={val.id} 
                        onClick={() => setSelectedOptions(prev => ({...prev, [modifier.id]: val.id}))}
                        className={`px-6 py-3 border rounded-xl text-xs font-bold transition-colors ${
                          isSelected ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' : 'border-gray-200 hover:border-black hover:bg-gray-50'
                        }`}
                      >
                        {val.label}{adjText}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-3 mb-16">
              <button 
                onClick={handleAddToCart}
                disabled={currentVariant?.purchasing_disabled}
                className="w-full bg-primary text-white py-5 rounded-full text-[15px] font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <ShoppingBag className="w-5 h-5" /> {currentVariant?.purchasing_disabled ? "Unavailable" : "Add to Cart"}
              </button>
              <button 
                onClick={handleBuyNow}
                disabled={currentVariant?.purchasing_disabled}
                className="w-full border-2 border-gray-100 py-5 rounded-full text-[15px] font-bold uppercase tracking-wider hover:border-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {currentVariant?.purchasing_disabled ? "Unavailable" : "Buy it Now"}
              </button>
              {currentVariant?.purchasing_disabled && (
                <p className="text-center text-xs font-bold text-red-500 uppercase tracking-widest mt-2">
                  {currentVariant.purchasing_disabled_message || "Selection Unavailable"}
                </p>
              )}
            </div>
          </div>
        </div>

        <ProductFeaturesBar productId={id || ''} />

        {/* Production Specifications Panel */}
        {specs && (
          <div className="mt-16 w-full border border-gray-200 rounded-3xl overflow-hidden shadow-sm bg-white">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-[#FCFCFD]">
              <Activity className="w-5 h-5 text-[#5719D3]" />
              <h3 className="font-headline font-black italic uppercase text-lg tracking-tighter">PRODUCTION SPECIFICATIONS</h3>
            </div>
            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-16">
              
              {/* Physical Architecture */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-[#5719D3] tracking-widest mb-6">PHYSICAL ARCHITECTURE</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest"><RotateCcw className="w-3.5 h-3.5" /> {specs.outdoorLifeLabel || 'OUTDOOR LIFE'}</span>
                    <span className="text-xs font-black italic">{specs.outdoorLife}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                     <span className="text-[10px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest"><Truck className="w-3.5 h-3.5" /> {specs.thicknessLabel || 'THICKNESS'}</span>
                     <span className="text-xs font-black italic">{specs.thickness}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                     <span className="text-[10px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest"><Shield className="w-3.5 h-3.5" /> {specs.pressureSensLabel || 'PRESSURE SENS.'}</span>
                     {specs.pressureSens ? <span className="text-xs font-black italic text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> YES</span> : <span className="text-xs font-black italic text-gray-400">NO</span>}
                  </div>
                  <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                     <span className="text-[10px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest"><Activity className="w-3.5 h-3.5" /> {specs.airReleaseLabel || 'AIR RELEASE'}</span>
                     {specs.airRelease ? <span className="text-xs font-black italic text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> YES</span> : <span className="text-xs font-black italic text-gray-400">NO</span>}
                  </div>
                </div>
              </div>

              {/* Ink Compatibility */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-[#5719D3] tracking-widest mb-6">INK COMPATIBILITY REGISTRY</h4>
                <div className="space-y-3">
                  <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.ecoSolvent ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.ecoSolvent ? 'text-gray-900' : 'text-gray-400'}`}>{specs.ecoSolventLabel || 'ECO-SOLVENT TECHNOLOGY'}</span>
                    {specs.ecoSolvent ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.hpLatex ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.hpLatex ? 'text-gray-900' : 'text-gray-400'}`}>{specs.hpLatexLabel || 'HP LATEX SERIES'}</span>
                    {specs.hpLatex ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.trueSolvent ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.trueSolvent ? 'text-gray-900' : 'text-gray-400'}`}>{specs.trueSolventLabel || 'TRUE SOLVENT INKS'}</span>
                    {specs.trueSolvent ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.uvLedCure ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.uvLedCure ? 'text-gray-900' : 'text-gray-400'}`}>{specs.uvLedCureLabel || 'UV-LED CURE'}</span>
                    {specs.uvLedCure ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className={`flex items-center justify-between border rounded-xl p-4 transition-colors ${specs.standardWaterBased ? 'bg-[#f0fdf4] border-[#86efac]' : 'bg-gray-50/50 border-gray-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${specs.standardWaterBased ? 'text-gray-900' : 'text-gray-400'}`}>{specs.standardWaterBasedLabel || 'STANDARD WATER-BASED'}</span>
                    {specs.standardWaterBased ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Video Hero Panel - Light Theme Split View */}
        <section className="mt-24 mb-16 bg-white rounded-[44px] overflow-hidden border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] relative">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Text Side */}
            <div className="p-16 lg:p-24 flex flex-col justify-center bg-white">
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="text-primary font-headline font-black text-xs uppercase tracking-[0.3em] mb-6"
              >
                {heroSubtitle}
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-gray-900 text-6xl lg:text-7xl font-headline font-black uppercase tracking-tighter italic leading-none mb-8"
              >
                {heroTitle.split(' ').map((word, i) => (
                  <span key={i} className="block">{word}</span>
                ))}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-500 text-lg font-medium leading-relaxed max-w-md mb-12"
              >
                {heroDescription}
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-6 py-3 rounded-2xl">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-gray-900 text-[10px] font-black uppercase tracking-widest">UV-RESISTANT INKS</span>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-6 py-3 rounded-2xl">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-gray-900 text-[10px] font-black uppercase tracking-widest">PRECISION CUTTING</span>
                </div>
              </motion.div>
            </div>

            {/* Video Side */}
            <div className="relative border-l border-gray-50 bg-gray-50/50 flex items-center justify-center min-h-[400px] lg:min-h-0">
              <div className="w-full h-full p-8 lg:p-12 flex items-center justify-center">
                <div className="relative w-full aspect-video rounded-[30px] overflow-hidden border-4 border-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] bg-black group">
                  <iframe 
                    src={`${heroVideo}${heroVideo.includes('?') ? '&' : '?'}autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${heroVideo.split('/').pop()?.split('?')[0]}&playsinline=1`}
                    className="absolute inset-0 w-full h-full pointer-events-none scale-[1.01]"
                    title="Product Showreel"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <ProductReviews productId={id || ''} />
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { 
  Truck, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Edit3, 
  ExternalLink,
  Package,
  Activity,
  BarChart2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";

interface ShippingMethod {
  id: number;
  name: string;
  status: string;
  type: string;
  products?: string[];
}

interface Order {
  id: string;
  customer: string;
  shipping_method: string;
  tracking_number: string;
  carrier: string;
  ship_date: string;
  status: string;
  delivery_status: "pretransit" | "transit" | "delivered";
}

interface AdminShippingProps {
  onViewOrder?: (orderId: string) => void;
}

export function AdminShipping({ onViewOrder }: AdminShippingProps) {
  const [activeView, setActiveView] = useState<"queue" | "methods" | "settings">("queue");
  const [orders, setOrders] = useState<Order[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  useEffect(() => {
    const fetchShippingData = async () => {
      try {
        const [ordersRes, methodsRes] = await Promise.all([
          axios.get("/api/admin/shipping/orders"),
          axios.get("/api/admin/shipping/methods")
        ]);
        setOrders(ordersRes.data);
        setShippingMethods(methodsRes.data);
      } catch (err) {
        console.error("Error fetching shipping data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShippingData();
  }, []);

  const carriers = useMemo(() => Array.from(new Set(orders.map(o => o.carrier).filter(Boolean))), [orders]);
  const statuses = ["pretransit", "transit", "delivered"];
  const methods = useMemo(() => Array.from(new Set(orders.map(o => o.shipping_method).filter(Boolean))), [orders]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tracking_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const matchesCarrier = selectedCarriers.length === 0 || selectedCarriers.includes(order.carrier);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.delivery_status);
    const matchesMethod = selectedMethods.length === 0 || selectedMethods.includes(order.shipping_method);

    return matchesCarrier && matchesStatus && matchesMethod;
  });

  const toggleFilter = (list: string[], setList: (val: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const stats = {
    transit: orders.filter(o => o.delivery_status === "transit").length,
    awaiting: orders.filter(o => o.delivery_status === "pretransit").length,
    delivered: orders.filter(o => o.delivery_status === "delivered").length
  };

  if (loading) return <div className="text-center py-20 font-headline font-black animate-pulse uppercase tracking-[0.2em] text-xs">Accessing Logistics Manifest...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-headline font-black uppercase tracking-tighter italic text-gray-900">Shipping & Fulfillment</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage shipping methods, transit times, and your delivery queue.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-xl">
          {(["queue", "methods", "settings"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeView === view ? "bg-black text-white" : "text-gray-400 hover:text-gray-900"
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {activeView === "queue" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 p-6 rounded-2xl h-full flex flex-col">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">In Transit</p>
              <h3 className="text-3xl font-headline font-black italic">{stats.transit}</h3>
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Projects with active tracking</p>
            </div>
            <div className="bg-white border border-gray-200 p-6 rounded-2xl h-full flex flex-col">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Awaiting Dispatch</p>
              <h3 className="text-3xl font-headline font-black italic">{stats.awaiting}</h3>
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Labels pending generation</p>
            </div>
            <div className="bg-white border border-gray-200 p-6 rounded-2xl h-full flex flex-col">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Delivered</p>
              <h3 className="text-3xl font-headline font-black italic">{stats.delivered}</h3>
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Successful project deliveries</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="SEARCH BY ORDER #, MEMBER, OR TRACKING..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent pl-10 pr-4 py-2.5 rounded-xl text-[10px] font-bold tracking-widest outline-none focus:bg-white focus:border-primary transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                    showFilters 
                    ? "bg-black text-white border-black" 
                    : "bg-gray-50 text-gray-900 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" /> Filter {(selectedCarriers.length + selectedStatuses.length + selectedMethods.length) > 0 && `(${(selectedCarriers.length + selectedStatuses.length + selectedMethods.length)})`}
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 transition-all border border-black">
                  <Activity className="w-3.5 h-3.5" /> Carrier Stats
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-gray-100 bg-gray-50/50"
                >
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Delivery Status</p>
                      <div className="flex flex-wrap gap-2">
                        {statuses.map(s => (
                          <button
                            key={s}
                            onClick={() => toggleFilter(selectedStatuses, setSelectedStatuses, s)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                              selectedStatuses.includes(s)
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-900 hover:text-black"
                            }`}
                          >
                            {s.replace('pretransit', 'Ready')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Carrier</p>
                      <div className="flex flex-wrap gap-2">
                        {carriers.map(c => (
                          <button
                            key={c}
                            onClick={() => toggleFilter(selectedCarriers, setSelectedCarriers, c)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                              selectedCarriers.includes(c)
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-900 hover:text-black"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                        {carriers.length === 0 && <p className="text-[9px] text-gray-300 italic uppercase">No carriers detected</p>}
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Shipping Method</p>
                      <div className="flex flex-wrap gap-2">
                        {methods.map(m => (
                          <button
                            key={m}
                            onClick={() => toggleFilter(selectedMethods, setSelectedMethods, m)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                              selectedMethods.includes(m)
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-900 hover:text-black"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-3 pt-4 border-t border-gray-100 flex items-center justify-between">
                       <button 
                         onClick={() => {
                           setSelectedCarriers([]);
                           setSelectedStatuses([]);
                           setSelectedMethods([]);
                         }}
                         className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                       >
                         Clear All Filters
                       </button>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                         Showing {filteredOrders.length} of {orders.length} Logistical Units
                       </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left py-5 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Order Manifest</th>
                    <th className="text-left py-5 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Logistics Method</th>
                    <th className="text-left py-5 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Tracking & Carrier</th>
                    <th className="text-left py-5 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                    <th className="text-right py-5 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => onViewOrder?.(order.id)}
                    >
                      <td className="py-6 px-8">
                        <div>
                          <p className="text-xs font-black text-gray-900 mb-0.5">#{order.id}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{order.customer}</p>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Truck className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest">{order.shipping_method}</p>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        {order.tracking_number ? (
                          <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 hover:underline cursor-pointer flex items-center gap-1">
                              {order.tracking_number} <ExternalLink className="w-2.5 h-2.5" />
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{order.carrier}</p>
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold text-gray-300 italic uppercase">Label Pending</p>
                        )}
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            order.delivery_status === 'delivered' ? 'bg-green-500' : 
                            order.delivery_status === 'transit' ? 'bg-blue-500 animate-pulse' : 'bg-orange-500 text-orange-400'
                          }`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            order.delivery_status === 'delivered' ? 'text-green-600' : 
                            order.delivery_status === 'transit' ? 'text-blue-600' : 'text-orange-600'
                          }`}>
                            {order.delivery_status.replace('pretransit', 'READY')}
                          </span>
                        </div>
                      </td>
                      <td className="py-6 px-8 text-right">
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-gray-400 hover:text-black transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-center">
              <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Access Terminal Archives</button>
            </div>
          </div>
        </>
      )}

      {activeView === "methods" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm h-fit">
            <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 italic">Connected Carrier Methods</h3>
              <button className="text-[9px] font-black uppercase tracking-widest text-primary border-b border-primary">Add Method</button>
            </div>
            <div className="divide-y divide-gray-100">
              {shippingMethods.map((method) => (
                <div key={method.id} className="p-6 hover:bg-gray-50/30 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center font-headline font-black text-xs group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                      {method.type.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-900 mb-1">{method.name}</h4>
                      <div className="flex items-center gap-3">
                         <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{method.type}</span>
                         <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1">
                           <CheckCircle2 className="w-2.5 h-2.5" /> LIVE
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                       <p className="text-[10px] font-black text-gray-900 group-hover:text-primary transition-colors">{method.products?.length || 0} Products</p>
                       <p className="text-[9px] text-gray-400 font-bold uppercase">Mapped</p>
                    </div>
                    <button className="p-2.5 bg-gray-50 rounded-xl hover:bg-primary hover:text-white transition-all text-gray-400 border border-gray-100 hover:border-primary">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm h-fit">
            <div className="p-6 bg-gray-50/50 border-b border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 italic">Method-Product Mapping</h3>
            </div>
            <div className="p-8 space-y-8">
               {shippingMethods.filter(m => m.products && m.products.length > 0).map(method => (
                 <div key={method.id}>
                    <div className="flex items-center justify-between mb-4">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{method.name}</p>
                       <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{method.products?.length} Items</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {method.products?.map((p, i) => (
                         <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
                           <Package className="w-2.5 h-2.5 text-gray-400" />
                           <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tight">{p}</span>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
               <div className="pt-4 mt-8 border-t border-dashed border-gray-100">
                  <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adjust mapping in the product details workstation</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeView === "settings" && (
        <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-[32px] p-10 shadow-sm">
           <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                 <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                 <h3 className="text-xl font-headline font-black uppercase italic tracking-tight">Logistics Protocol</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configure global fulfillment rules and carrier triggers.</p>
              </div>
           </div>

           <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Domestic Flat Rate</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black">$</span>
                       <input type="text" defaultValue="5.00" className="w-full bg-gray-50 border border-gray-100 pl-8 pr-4 py-3 rounded-2xl text-sm font-black italic font-headline outline-none focus:bg-white focus:border-primary transition-all" />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Free Shipping Threshold</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black">$</span>
                       <input type="text" defaultValue="50.00" className="w-full bg-gray-50 border border-gray-100 pl-8 pr-4 py-3 rounded-2xl text-sm font-black italic font-headline outline-none focus:bg-white focus:border-primary transition-all" />
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 {[
                   { label: "Automatic Label Protocol", desc: "Generate carrier labels automatically upon order verification.", enabled: true },
                   { label: "Transit Notification Signal", desc: "Send automated dispatch emails with live tracking links.", enabled: true },
                   { label: "Carrier Rate Negotiation", desc: "Always fetch dynamically calculated carrier rates for heavy orders.", enabled: false }
                 ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between p-6 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-md transition-all group">
                      <div className="max-w-xs">
                         <p className="text-[11px] font-black uppercase tracking-widest text-gray-900 mb-1">{item.label}</p>
                         <p className="text-[9px] font-bold text-gray-400 leading-relaxed">{item.desc}</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer ${item.enabled ? 'bg-primary' : 'bg-gray-200'}`}>
                         <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${item.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                   </div>
                 ))}
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                 <button className="px-8 py-3 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">Reset Default</button>
                 <button className="px-8 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg hover:shadow-primary/20">Apply Protocol</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { motion } from "motion/react";
import { OrderProofs } from "../components/customer/OrderProofs";
import { LayoutDashboard, Package, LifeBuoy, Settings, LogOut, Search, Plus, ArrowRight, ChevronRight, Clock, CheckCircle2, CreditCard, Target, User, ShieldCheck, Send, Paperclip, ArrowLeft, MessageSquare, Star, Truck, MapPin, Menu, X } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

type Tab = 'overview' | 'orders' | 'support' | 'settings' | 'reviews';

interface Review { id: string; productId: string; userName: string; rating: number; comment: string; createdAt: string; status: string; }
interface Order { id: string; status: string; date: string; total: number; items: { name: string; units: number }[]; }
interface Profile { firstName: string; lastName: string; email: string; phone: string; registryId: string; memberSince: string; lastSync: string; status: string; credit: number; tier: string; }
interface Thread { id: string; subject: string; status: string; date: string; message: string; }

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [fullOrderDetails, setFullOrderDetails] = useState<any | null>(null);
  const [orderMessages, setOrderMessages] = useState<any[]>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [newOrderMsg, setNewOrderMsg] = useState("");
  const [sendingOrderMsg, setSendingOrderMsg] = useState(false);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    axios.get(`/api/customer/reviews?email=${encodeURIComponent(user.email || "")}`).then(r => setMyReviews(r.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedOrderId || !user) return;
    setLoadingOrder(true);
    Promise.all([
      axios.get(`/api/customer/orders/${selectedOrderId}?email=${encodeURIComponent(user.email || "")}`),
      axios.get(`/api/customer/orders/${selectedOrderId}/messages?email=${encodeURIComponent(user.email || "")}`)
    ]).then(([oR, mR]) => { setFullOrderDetails(oR.data); setOrderMessages(mR.data); })
      .catch(e => console.error("order detail", e))
      .finally(() => setLoadingOrder(false));
  }, [selectedOrderId, user]);

  const handleSendOrderMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderMsg.trim() || !user) return;
    setSendingOrderMsg(true);
    try {
      await axios.post(`/api/customer/orders/${selectedOrderId}/messages`, { email: user.email, message: newOrderMsg });
      setNewOrderMsg("");
      const r = await axios.get(`/api/customer/orders/${selectedOrderId}/messages?email=${encodeURIComponent(user.email || "")}`);
      setOrderMessages(r.data);
    } catch { console.error("send failed"); } finally { setSendingOrderMsg(false); }
  };

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    Promise.all([
      axios.get(`/api/customer/orders?email=${encodeURIComponent(user.email || "")}`),
      axios.get(`/api/customer/profile?email=${encodeURIComponent(user.email || "")}`)
    ]).then(([oR, pR]) => {
      setOrders(Array.isArray(oR.data) ? oR.data : oR.data?.data || []);
      setProfile(pR.data);
      axios.get(`/api/customer/threads?email=${encodeURIComponent(user.email || "")}`).then(r => setThreads(Array.isArray(r.data) ? r.data : [])).catch(() => setThreads([]));
    }).catch(err => { if (err.response?.status === 401 || err.response?.status === 404) logout(); })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user || loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-xs">Syncing Registry...</div>;

  const handleLogout = () => { logout(); navigate("/login"); };
  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("Delete this review?")) return;
    try { await axios.delete(`/api/customer/reviews/${id}`); setMyReviews(p => p.filter(r => r.id !== id)); toast.success("Deleted"); }
    catch { toast.error("Failed to delete"); }
  };
  const switchTab = (tab: string) => { setActiveTab(tab as Tab); setSelectedOrderId(null); setSidebarOpen(false); };

  const statusColor = (s: string) => s === 'SUBMITTED' || s === 'Awaiting Payment' ? 'bg-primary/10 text-primary' : s === 'Shipped' || s === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex pt-16 md:pt-20">
      {/* ---- MOBILE OVERLAY ---- */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ---- SIDEBAR (desktop: fixed left, mobile: slide-in drawer) ---- */}
      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex flex-col z-50 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:top-20`}>
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-50 md:hidden">
          <span className="text-[11px] font-black uppercase tracking-widest">Menu</span>
          <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <button key={item.id} onClick={() => switchTab(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:bg-gray-50'}`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-gray-50">
          <button onClick={handleLogout} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ---- MOBILE TOP BAR ---- */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-30 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-50"><Menu className="w-5 h-5" /></button>
        <span className="text-[11px] font-black uppercase tracking-widest">My Dashboard</span>
        <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-50"><LogOut className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* ---- MOBILE BOTTOM NAV ---- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-40 md:hidden safe-bottom">
        {NAV.map(item => (
          <button key={item.id} onClick={() => switchTab(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activeTab === item.id ? 'text-primary' : 'text-gray-300'}`}>
            <item.icon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ---- MAIN ---- */}
      <main className="flex-1 md:ml-64 px-4 py-6 md:px-10 md:py-12 pb-24 md:pb-12 w-full min-w-0">
        <div className="max-w-6xl mx-auto">

          {/* ===== OVERVIEW ===== */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <header className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                <div>
                  <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                    Member <span className="text-primary">Overview</span>
                  </h1>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Welcome Back, {profile?.firstName || user?.displayName?.split(' ')[0] || 'Member'}</p>
                </div>
                <Link to="/products" className="bg-primary text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 self-start sm:self-auto">
                  <Plus className="w-3 h-3" /> New Order
                </Link>
              </header>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 md:mb-12">
                {[
                  { label: 'Status', value: profile?.status || '—', sub: `Since ${profile?.memberSince || '—'}`, icon: ShieldCheck, color: 'text-primary' },
                  { label: 'Orders', value: orders.length, sub: 'Total Orders', icon: Package, color: 'text-primary' },
                  { label: 'Credit', value: `$${(profile?.credit || 0).toFixed(2)}`, sub: 'Balance', icon: CreditCard, color: 'text-green-500' },
                  { label: 'Tier', value: profile?.tier || '—', sub: 'Society Status', icon: Target, color: 'text-orange-500' },
                ].map((s, i) => (
                  <div key={i} className="bg-white border border-gray-100 p-5 md:p-8 rounded-3xl">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{s.label}</span>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <p className="text-2xl md:text-4xl font-headline font-black italic tracking-tighter mb-1 truncate">{s.value}</p>
                    <p className="text-[9px] font-bold text-gray-300 uppercase">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white border border-gray-100 rounded-[32px] p-6 md:p-10">
                  <div className="flex justify-between items-center mb-6 md:mb-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><Package className="w-4 h-4 text-primary" /></div>
                      <div>
                        <h3 className="text-sm font-headline font-black uppercase tracking-tight">Recent Orders</h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hidden md:block">Your Latest Activity</p>
                      </div>
                    </div>
                    <button onClick={() => switchTab('orders')} className="text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                      See All <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {orders.length === 0 ? (
                      <p className="text-center py-8 text-[10px] text-gray-300 font-black uppercase tracking-widest">No orders yet</p>
                    ) : orders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4 text-gray-300" /></div>
                          <div>
                            <p className="text-sm font-black tracking-tight italic">#{order.id}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{order.date}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${statusColor(order.status)}`}>{order.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[32px] p-6 md:p-10">
                  <div className="flex justify-between items-center mb-6 md:mb-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><LifeBuoy className="w-4 h-4 text-primary" /></div>
                      <h3 className="text-sm font-headline font-black uppercase tracking-tight">Support</h3>
                    </div>
                    <button onClick={() => switchTab('support')} className="text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                      View <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    {threads.length === 0 ? (
                      <p className="text-center py-8 text-[10px] text-gray-300 font-black uppercase tracking-widest">No active threads</p>
                    ) : threads.slice(0, 3).map(thread => (
                      <div key={thread.id}>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[11px] font-black uppercase tracking-tight truncate max-w-[140px]">{thread.subject}</h4>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${thread.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{thread.status}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 italic line-clamp-2">{thread.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== ORDERS LIST ===== */}
          {activeTab === 'orders' && !selectedOrderId && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <header className="mb-8 md:mb-12">
                <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">My <span className="text-primary">Orders</span></h1>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Your print project registry</p>
              </header>
              <div className="flex gap-3 mb-8">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input type="text" placeholder="Search orders..." className="w-full bg-white border border-gray-100 pl-12 pr-4 py-4 rounded-2xl text-xs font-bold tracking-widest outline-none focus:border-primary transition-all" />
                </div>
              </div>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-white border border-gray-100 rounded-[32px] p-16 text-center">
                    <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-headline font-black uppercase italic mb-2">No Orders Yet</h3>
                    <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-6">You have not placed any orders yet.</p>
                    <Link to="/products" className="bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all inline-block">Shop Now —</Link>
                  </div>
                ) : orders.map(order => (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-[24px] md:rounded-[32px] p-5 md:p-10 hover:shadow-xl hover:shadow-gray-100 transition-all">
                    <div className="flex items-start md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h2 className="text-xl md:text-2xl font-headline font-black italic tracking-tighter">#{order.id}</h2>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${statusColor(order.status)}`}>{order.status}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-300 uppercase mb-2">{order.date}</p>
                        {order.items?.[0] && (
                          <p className="text-xs font-black uppercase text-gray-600 truncate">{order.items[0].name} {order.items.length > 1 ? `+${order.items.length - 1} more` : ''}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl md:text-2xl font-headline font-black mb-3 tracking-tight">${(order.total || 0).toFixed(2)}</p>
                        <button onClick={() => setSelectedOrderId(order.id)} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all group text-right ml-auto">
                          View <ArrowRight className="w-4 h-4 text-primary" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ===== ORDER DETAIL ===== */}
          {activeTab === 'orders' && selectedOrderId && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <button onClick={() => { setSelectedOrderId(null); setFullOrderDetails(null); }} className="w-10 h-10 border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all flex-shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="text-3xl md:text-5xl font-headline font-black uppercase tracking-tighter italic leading-none">
                  Order <span className="text-primary">#{selectedOrderId}</span>
                </h1>
              </div>
              {loadingOrder ? (
                <div className="p-16 text-center font-headline font-black uppercase italic tracking-widest text-xs animate-pulse">Loading...</div>
              ) : fullOrderDetails ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <OrderProofs orderId={fullOrderDetails.id} />

                    {/* Timeline */}
                    <div className="bg-white border border-gray-100 p-6 md:p-10 rounded-[32px]">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Fulfillment Status</h3>
                      <div className="flex justify-between items-center relative overflow-x-auto">
                        <div className="absolute top-5 left-4 right-4 h-0.5 bg-gray-100 z-0" />
                        {['Submitted','Packing','Shipped','Delivered'].map((step, i) => {
                          const active = i === 0 || (i === 1 && ['Awaiting Shipment','Packing','Completed','Shipped','Ready for Pickup'].includes(fullOrderDetails.status)) || (i === 2 && ['Shipped','Completed'].includes(fullOrderDetails.status)) || (i === 3 && fullOrderDetails.status === 'Completed');
                          return (
                            <div key={i} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-black text-xs ${active ? 'bg-white border-primary text-primary shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                {active ? <CheckCircle2 className="w-5 h-5" /> : (i+1)}
                              </div>
                              <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${active ? 'text-gray-900' : 'text-gray-300'}`}>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white border border-gray-100 p-6 md:p-10 rounded-[32px] space-y-6">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Order Items</h3>
                      {(fullOrderDetails.items || []).map((item: any) => (
                        <div key={item.id} className="flex gap-4 border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                          <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0"><Package className="w-8 h-8 text-gray-200" /></div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base md:text-xl font-headline font-black italic tracking-tighter mb-1 uppercase truncate">{item.name}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Qty: {item.units}</p>
                            <p className="text-[11px] font-black text-primary">${(Number(item.price) || 0).toFixed(2)} / unit</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Messages */}
                    <div className="bg-white border border-gray-100 p-6 md:p-10 rounded-[32px] space-y-6">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Send className="w-4 h-4 text-primary" />Messages</h3>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {orderMessages.length === 0 ? (
                          <p className="text-center py-8 text-[10px] font-black uppercase text-gray-300 tracking-widest">No messages yet</p>
                        ) : orderMessages.map((m: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black uppercase text-gray-400">{new Date(m.date_created).toLocaleString()}</span>
                              <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 rounded">TEAM</span>
                            </div>
                            <p className="text-xs leading-relaxed font-bold italic text-gray-700">{m.message}</p>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleSendOrderMsg} className="pt-4 border-t border-gray-50 space-y-3">
                        <textarea value={newOrderMsg} onChange={e => setNewOrderMsg(e.target.value)} placeholder="Send a message..." className="w-full bg-[#F9F9F9] border border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-primary transition-all" rows={3} />
                        <div className="flex justify-end">
                          <button disabled={sendingOrderMsg} className="bg-black text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50">
                            {sendingOrderMsg ? "Sending..." : "Send —"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-black text-white p-6 md:p-10 rounded-[36px] shadow-2xl">
                      <h3 className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-6">Order Total</h3>
                      <div className="space-y-3 mb-8">
                        {[['Subtotal', fullOrderDetails.subtotal], ['Shipping', fullOrderDetails.shipping_cost], ['Tax', fullOrderDetails.tax]].map(([l, v]) => (
                          <div key={l as string} className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="text-gray-400">{l}</span><span>${(Number(v) || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                        <span className="text-xs font-black uppercase">Total</span>
                        <span className="text-4xl font-headline font-black italic tracking-tighter text-primary">${(fullOrderDetails.total || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {fullOrderDetails.shipping_address && (
                      <div className="bg-white border border-gray-100 p-6 md:p-8 rounded-[32px]">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Ship To</h3>
                        <p className="text-xs font-bold text-gray-900 leading-relaxed uppercase">
                          {fullOrderDetails.shipping_address.first_name} {fullOrderDetails.shipping_address.last_name}<br />
                          {fullOrderDetails.shipping_address.street_1}<br />
                          {fullOrderDetails.shipping_address.city}, {fullOrderDetails.shipping_address.state} {fullOrderDetails.shipping_address.zip}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-gray-400 font-bold">Failed to load order details.</div>
              )}
            </motion.div>
          )}

          {/* ===== SUPPORT ===== */}
          {activeTab === 'support' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <header className="mb-8 md:mb-16 text-center">
                <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">Resolution <span className="text-primary">Desk</span></h1>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Direct communication with the lab</p>
              </header>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-10">
                <div className="lg:col-span-3 bg-white border border-gray-100 rounded-[32px] p-6 md:p-12">
                  <div className="flex items-center gap-3 mb-8"><Send className="w-5 h-5 text-primary" /><h3 className="text-sm font-headline font-black uppercase tracking-tight">Open New Thread</h3></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <select className="w-full bg-white border border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-primary appearance-none uppercase">
                      <option>General Inquiry</option>
                      {orders.map(o => <option key={o.id}>Order #{o.id}</option>)}
                    </select>
                    <select className="w-full bg-white border border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-primary appearance-none uppercase">
                      <option>General Inquiry</option><option>Artwork Assist</option><option>Logistics Delay</option>
                    </select>
                  </div>
                  <input type="text" placeholder="Thread subject..." className="w-full bg-white border border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-primary uppercase mb-4" />
                  <textarea rows={4} placeholder="Describe your issue..." className="w-full bg-white border border-gray-100 p-5 rounded-2xl text-xs font-bold outline-none focus:border-primary resize-none uppercase mb-6" />
                  <button className="w-full bg-primary/40 text-white py-5 rounded-2xl font-headline font-black uppercase tracking-widest text-sm italic hover:bg-primary transition-all">Initiate Thread —</button>
                </div>
                <div className="lg:col-span-2 bg-[#0A0A0E] rounded-[32px] p-6 md:p-12 text-white">
                  <div className="flex items-center gap-3 mb-8"><Clock className="w-5 h-5 text-gray-500" /><h3 className="text-xs font-headline font-black uppercase tracking-widest">Active Threads</h3></div>
                  <div className="space-y-8">
                    {threads.length === 0 ? (
                      <p className="text-center py-8 text-[10px] text-gray-600 font-black uppercase tracking-widest">No active threads</p>
                    ) : threads.map(t => (
                      <div key={t.id}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ml-auto ${t.status === 'OPEN' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-500'}`}>{t.status}</span>
                        </div>
                        <h4 className="text-lg font-headline font-black italic tracking-tight mb-2 uppercase">{t.subject}</h4>
                        <p className="text-[11px] text-gray-400 italic leading-relaxed line-clamp-2">{t.message}</p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 mt-2 block">{t.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== SETTINGS ===== */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <header className="mb-8 md:mb-16 text-center">
                <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">Society <span className="text-primary">Settings</span></h1>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Your profile and preferences</p>
              </header>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-12">
                <div className="lg:col-span-3 bg-white border border-gray-50 rounded-[36px] p-6 md:p-14 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-primary/10 rounded-lg"><User className="w-4 h-4 text-primary" /></div>
                    <div><h3 className="text-lg font-headline font-black uppercase tracking-tight italic">Profile Identity</h3></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                      { label: 'First Name', val: profile?.firstName || user?.displayName?.split(' ')[0] || '' },
                      { label: 'Last Name', val: profile?.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '' },
                      { label: 'Phone', val: profile?.phone || '' },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-3">{f.label}</label>
                        <input defaultValue={f.val} className="w-full bg-[#F9F9F9] border border-gray-100 p-5 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" />
                      </div>
                    ))}
                    <div>
                      <label className="text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-3">Email</label>
                      <input defaultValue={profile?.email || user?.email || ''} disabled className="w-full bg-transparent border-2 border-dotted border-gray-200 p-5 rounded-2xl text-sm font-bold text-gray-400 outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8 flex-wrap">
                    <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">Save Profile —</button>
                    <button onClick={handleLogout} className="bg-white border text-red-500 border-red-100 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Log Out
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-1 bg-[#0A0A0E] rounded-[36px] p-6 md:p-10 text-white shadow-2xl h-fit">
                  <h3 className="text-[12px] font-headline font-black uppercase tracking-[0.2em] mb-8">Registry Info</h3>
                  <div className="space-y-6">
                    {[['Joined', profile?.memberSince], ['Last Sync', profile?.lastSync], ['UID', profile?.registryId]].map(([l, v]) => (
                      <div key={l} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-gray-600">{l}</span><span className="truncate ml-4 text-right">{v || '—'}</span>
                      </div>
                    ))}
                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20 flex flex-col items-center mt-4">
                      <ShieldCheck className="w-8 h-8 text-primary mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary text-center">Verified Member</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== REVIEWS ===== */}
          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <header className="mb-8 md:mb-12">
                <h1 className="text-4xl md:text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">My <span className="text-primary">Reviews</span></h1>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Your product feedback history</p>
              </header>
              {myReviews.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-[32px] p-16 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-xl font-headline font-black uppercase mb-2 italic">No Reviews Yet</h3>
                  <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-6">You have not reviewed any products.</p>
                  <button onClick={() => navigate('/')} className="bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all">Browse Products —</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myReviews.map(review => (
                    <div key={review.id} className="bg-white border border-gray-200 rounded-[28px] p-8 hover:shadow-xl hover:shadow-gray-100 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-[#FFD700] text-[#FFD700]' : 'text-gray-200'}`} />)}
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${review.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{review.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium italic leading-relaxed mb-4">"{review.comment}"</p>
                      <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-gray-400">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}</span>
                        <button onClick={() => handleDeleteReview(review.id)} className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}

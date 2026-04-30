import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { OrderProofs } from "../components/customer/OrderProofs";
import { 
  LayoutDashboard, 
  Package, 
  LifeBuoy, 
  Settings, 
  LogOut, 
  Search, 
  Plus, 
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Target,
  User,
  ShieldCheck,
  Send,
  Paperclip,
  ArrowLeft,
  MessageSquare,
  Star,
  Truck
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

type Tab = 'overview' | 'orders' | 'support' | 'settings' | 'reviews';

interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: string;
}

interface Order {
  id: string;
  status: string;
  date: string;
  total: number;
  items: { name: string; units: number }[];
}

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registryId: string;
  memberSince: string;
  lastSync: string;
  status: string;
  credit: number;
  tier: string;
}

interface Thread {
  id: string;
  subject: string;
  status: string;
  date: string;
  message: string;
}

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

  useEffect(() => {
    if (!user) return;
    
    const fetchReviews = async () => {
      try {
        const res = await axios.get(`/api/customer/reviews?email=${encodeURIComponent(user.email || "")}`);
        setMyReviews(res.data);
      } catch (err) {
        console.error("Error fetching my reviews:", err);
      }
    };
    
    fetchReviews();
  }, [user]);

  useEffect(() => {
    if (!selectedOrderId || !user) return;
    
    const fetchOrderDetail = async () => {
      setLoadingOrder(true);
      try {
        const [orderRes, msgRes] = await Promise.all([
          axios.get(`/api/customer/orders/${selectedOrderId}?email=${encodeURIComponent(user.email || "")}`),
          axios.get(`/api/customer/orders/${selectedOrderId}/messages?email=${encodeURIComponent(user.email || "")}`)
        ]);
        setFullOrderDetails(orderRes.data);
        setOrderMessages(msgRes.data);
      } catch (err) {
        console.error("Failed to fetch order detail:", err);
      } finally {
        setLoadingOrder(false);
      }
    };
    fetchOrderDetail();
  }, [selectedOrderId, user]);

  const handleSendOrderMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderMsg.trim() || !user) return;
    setSendingOrderMsg(true);
    try {
      await axios.post(`/api/customer/orders/${selectedOrderId}/messages`, {
        email: user.email,
        message: newOrderMsg
      });
      setNewOrderMsg("");
      const res = await axios.get(`/api/customer/orders/${selectedOrderId}/messages?email=${encodeURIComponent(user.email || "")}`);
      setOrderMessages(res.data);
    } catch (err) {
      console.error("Failed to send message");
    } finally {
      setSendingOrderMsg(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [ordersRes, profileRes] = await Promise.all([
          axios.get(`/api/customer/orders?email=${encodeURIComponent(user.email || "")}`),
          axios.get(`/api/customer/profile?email=${encodeURIComponent(user.email || "")}`)
        ]);
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.data && Array.isArray(ordersRes.data.data) ? ordersRes.data.data : []));
        setProfile(profileRes.data);

        // Fetch threads from backend
        // Assume API route for threads exists
        try {
          const threadsRes = await axios.get(`/api/customer/threads?email=${encodeURIComponent(user.email || "")}`);
          setThreads(Array.isArray(threadsRes.data) ? threadsRes.data : []);
        } catch (e) {
          console.error("Failed to fetch threads");
          setThreads([]);
        }

      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        if (err.response?.status === 401 || err.response?.status === 404) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, navigate]);

  if (!user || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white font-headline font-black uppercase tracking-[0.3em] text-xs">
      Syncing Registry...
    </div>
  );

  const handleLogout = () => {
    try {
      logout();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await axios.delete(`/api/customer/reviews/${reviewId}`);
      setMyReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success("Review deleted");
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex pt-20">
      {/* Sidebar */}
      <aside className="fixed left-0 top-20 bottom-0 w-64 bg-white border-r border-gray-100 flex flex-col z-40">
        <nav className="flex-1 px-4 py-8 space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'orders', label: 'My Orders', icon: Package },
            { id: 'reviews', label: 'My Reviews', icon: MessageSquare },
            { id: 'support', label: 'Support', icon: LifeBuoy },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as Tab); setSelectedOrderId(null); }}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${
                activeTab === item.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-6 border-t border-gray-50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-12">
        <div className="max-w-6xl mx-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <header className="mb-12 flex justify-between items-end">
                <div>
                  <h1 className="text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                    Member <span className="text-primary">Overview</span>
                  </h1>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Welcome Back, {profile?.firstName || user?.displayName?.split(' ')[0] || 'Member'}</p>
                </div>
                <button className="bg-primary text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                  <Plus className="w-3 h-3" /> Start New Project —
                </button>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-6 mb-12">
                <div className="bg-white border border-gray-100 p-8 rounded-3xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Membership Status</span>
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-4xl font-headline font-black italic tracking-tighter mb-2">{profile?.status}</p>
                  <p className="text-[9px] font-bold text-gray-300 uppercase">Society Member Since {profile?.memberSince}</p>
                </div>
                
                <div className="bg-white border border-gray-100 p-8 rounded-3xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Active Projects</span>
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-4xl font-headline font-black italic tracking-tighter mb-2">{orders.length}</p>
                  <p className="text-[9px] font-bold text-gray-300 uppercase">Total Registry Items</p>
                </div>

                <div className="bg-white border border-gray-100 p-8 rounded-3xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Available Credit</span>
                    <CreditCard className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-4xl font-headline font-black italic tracking-tighter mb-2">${(profile?.credit || 0).toFixed(2)}</p>
                  <p className="text-[9px] font-bold text-gray-300 uppercase">Society Registry Balance</p>
                </div>

                <div className="bg-[#FFF9F2] border border-orange-100 p-8 rounded-3xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Account Tier</span>
                    <Target className="w-4 h-4 text-orange-500" />
                  </div>
                  <p className="text-4xl font-headline font-black italic tracking-tighter mb-2 text-orange-900">{profile?.tier}</p>
                  <p className="text-[9px] font-bold text-orange-300 uppercase">Society Gold Status Activated</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-8">
                {/* Recent Registry */}
                <div className="col-span-3 bg-white border border-gray-100 rounded-[40px] p-10">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><Package className="w-4 h-4 text-primary" /></div>
                      <div>
                        <h3 className="text-sm font-headline font-black uppercase tracking-tight">Recent Registry</h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Your Latest Fulfillment Activity</p>
                      </div>
                    </div>
                    <Link to="/dashboard" onClick={() => setActiveTab('orders')} className="text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2">
                      See All <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="space-y-6">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center"><Clock className="w-5 h-5 text-gray-300" /></div>
                          <div>
                            <p className="text-sm font-black tracking-tight italic">#{order.id}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{order.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                            order.status === 'SUBMITTED' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {order.status === 'Awaiting Shipment' ? 'Packing' : order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Threads */}
                <div className="col-span-2 bg-white border border-gray-100 rounded-[40px] p-10">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><LifeBuoy className="w-4 h-4 text-primary" /></div>
                      <div>
                        <h3 className="text-sm font-headline font-black uppercase tracking-tight">Active Threads</h3>
                      </div>
                    </div>
                    <Link to="/dashboard" onClick={() => setActiveTab('support')} className="text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2">
                      Resolution Desk <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="space-y-8">
                    {threads.slice(0, 3).map((thread) => (
                      <div key={thread.id} className="group">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[11px] font-black uppercase tracking-tight">{thread.subject}</h4>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            thread.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{thread.status}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium italic leading-relaxed line-clamp-2">
                          {thread.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && !selectedOrderId && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <header className="mb-12">
                <h1 className="text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                  My <span className="text-primary">Registry</span>
                </h1>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">A comprehensive log of your society print projects</p>
              </header>

              <div className="flex gap-4 mb-10">
                <div className="flex-1 relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input 
                    type="text" 
                    placeholder="Filter by Order ID or Product Name..." 
                    className="w-full bg-white border border-gray-100 pl-16 pr-8 py-5 rounded-2xl text-xs font-bold tracking-widest outline-none focus:border-primary transition-all"
                  />
                </div>
                <button className="bg-white border border-gray-100 px-10 py-5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                  Refine
                </button>
                <button className="bg-primary text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                  New Project —
                </button>
              </div>

              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-[32px] p-10 flex items-center justify-between hover:shadow-xl hover:shadow-gray-100 transition-all">
                    <div className="flex items-center gap-10">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-headline font-black italic tracking-tighter">#{order.id}</h2>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                            order.status === 'SUBMITTED' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                          }`}>{order.status === 'Awaiting Shipment' ? 'Packing' : order.status}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-300 uppercase">Logged: {order.date}</p>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-200" />
                        </div>
                        <div>
                          <p className="text-xs font-black tracking-tight mb-1 uppercase">{order.items[0].name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Units: {order.items[0].units}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-headline font-black mb-4 tracking-tight">${(order.total || 0).toFixed(2)}</p>
                      <button 
                        onClick={() => setSelectedOrderId(order.id)}
                        className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all group"
                      >
                        View Project <ArrowRight className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Order Detail View */}
          {activeTab === 'orders' && selectedOrderId && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => { setSelectedOrderId(null); setFullOrderDetails(null); }} className="w-10 h-10 border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-4">
                  <h1 className="text-5xl font-headline font-black uppercase tracking-tighter italic leading-none">
                    Project <span className="text-primary italic">#{selectedOrderId}</span>
                  </h1>
                </div>
                <div className="ml-auto flex gap-4">
                  <button className="bg-white border border-gray-100 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50">New Project —</button>
                </div>
              </div>

              {loadingOrder ? (
                <div className="p-20 text-center font-headline font-black uppercase italic tracking-widest text-xs animate-pulse">Syncing Manifest...</div>
              ) : fullOrderDetails ? (
                <>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-12 ml-14">Initiated: {fullOrderDetails.date}</p>

                  <div className="grid grid-cols-3 gap-8">
                    <div className="col-span-2 space-y-12">
                      <OrderProofs orderId={fullOrderDetails.id} />
                      
                      {/* Timeline */}
                      <div className="bg-white border border-gray-100 p-12 rounded-[40px]">
                        <div className="flex items-center gap-3 mb-10">
                          <Clock className="w-4 h-4 text-primary" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Fulfillment Lifecycle</h3>
                        </div>
                        <div className="flex justify-between items-center relative">
                          <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-0.5 bg-gray-100 z-0" />
                          {[
                            { step: '1', label: 'Submitted', active: true },
                            { step: '2', label: 'Packing', active: ['Awaiting Shipment', 'Packing', 'Completed', 'Shipped', 'Ready for Pickup'].includes(fullOrderDetails.status) },
                            { step: '3', label: 'Shipped', active: ['Shipped', 'Completed'].includes(fullOrderDetails.status) },
                            { step: '4', label: 'Delivered', active: fullOrderDetails.status === 'Completed' },
                          ].map((item, i) => (
                            <div key={i} className="relative z-10 flex flex-col items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-black text-xs ${
                                item.active ? 'bg-white border-primary text-primary shadow-lg shadow-primary/10' : 'bg-gray-50 border-gray-100 text-gray-300'
                              }`}>
                                {item.active ? <CheckCircle2 className="w-5 h-5" /> : item.step}
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${item.active ? 'text-gray-900' : 'text-gray-300'}`}>{item.label}</span>
                            </div>
                          ))}
                        </div>

                        {fullOrderDetails.shipments && fullOrderDetails.shipments.length > 0 && (
                          <div className="pt-8 mt-8 border-t border-gray-50">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                              <Truck className="w-4 h-4 text-primary" /> Tracking Information
                            </h4>
                            <div className="space-y-4">
                              {fullOrderDetails.shipments.map((shipment: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                  <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      <p className="text-xs font-black uppercase tracking-tight text-gray-900">{shipment.shipping_provider || 'Carrier Carrier'}</p>
                                      <span className="text-[8px] font-bold px-2 py-0.5 bg-gray-200 rounded text-gray-600 uppercase">{shipment.shipping_method || 'Standard'}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                      {shipment.tracking_number ? `Tracking No: ${shipment.tracking_number}` : 'No tracking number available'}
                                    </p>
                                  </div>
                                  {shipment.tracking_link && (
                                    <a
                                      href={shipment.tracking_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] font-black uppercase tracking-widest bg-white hover:bg-gray-100 text-primary px-6 py-3 rounded-xl transition-colors border border-gray-200 flex flex-shrink-0 items-center justify-center"
                                    >
                                      Track Package <ArrowRight className="w-3 h-3 ml-2 inline-block" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Manifest Items */}
                      <div className="bg-white border border-gray-100 p-10 rounded-[40px] space-y-8">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Project Manifest</h3>
                        {fullOrderDetails.items.map((item: any) => (
                          <div key={item.id} className="flex gap-8 border-b border-gray-50 pb-8 last:border-0 last:pb-0">
                            <div className="w-32 h-32 bg-gray-50 rounded-3xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                              <Package className="w-12 h-12 text-gray-200" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-6">
                                <div>
                                  <h4 className="text-xl font-headline font-black italic tracking-tighter mb-1 uppercase">{item.name}</h4>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">ITEM ID: {item.id}</p>
                                </div>
                                <div className="bg-gray-100 px-3 py-1 rounded-md text-[10px] font-black uppercase">Qty: {item.units}</div>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-[11px] font-black text-primary">${(Number(item.price) || 0).toFixed(2)} / unit</div>
                                <Link 
                                  to={`/product/${item.product_id || item.id}`}
                                  className="text-[9px] font-black uppercase tracking-widest bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors border border-gray-100 flex items-center gap-2"
                                >
                                  <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" /> Write a Review
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Specific Messages */}
                      <div className="bg-white border border-gray-100 p-10 rounded-[40px] space-y-8">
                        <div className="flex items-center gap-3">
                          <Send className="w-4 h-4 text-primary" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Project Signal Journal</h3>
                        </div>
                        
                        <div className="space-y-6 max-h-[300px] overflow-y-auto pr-4">
                          {orderMessages.length === 0 ? (
                            <p className="text-center py-8 text-[10px] font-black uppercase text-gray-300 tracking-widest">No signals recorded for this manifest</p>
                          ) : (
                            orderMessages.map((m: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] font-black uppercase text-gray-400">{new Date(m.date_created).toLocaleString()}</span>
                                  <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 rounded">SOCIETY LAB</span>
                                </div>
                                <p className="text-xs leading-relaxed font-bold italic text-gray-700 tracking-tight">{m.message}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <form onSubmit={handleSendOrderMsg} className="pt-6 border-t border-gray-50 space-y-4">
                          <textarea 
                            value={newOrderMsg}
                            onChange={(e) => setNewOrderMsg(e.target.value)}
                            placeholder="TRANSMIT MESSAGE TO THE LAB..."
                            className="w-full bg-[#F9F9F9] border border-gray-100 p-6 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-primary transition-all uppercase placeholder:opacity-30"
                            rows={3}
                          />
                          <div className="flex justify-end">
                            <button 
                              disabled={sendingOrderMsg}
                              className="bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-lg disabled:opacity-50"
                            >
                              {sendingOrderMsg ? "TRANSMITTING..." : "SEND SIGNAL —"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Total Card */}
                      <div className="bg-black text-white p-10 rounded-[44px] shadow-2xl">
                        <h3 className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-8">Order Total</h3>
                        <div className="space-y-4 mb-10">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="text-gray-400">Subtotal</span>
                            <span>${(fullOrderDetails.subtotal || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="text-gray-400">Shipping</span>
                            <span>${(fullOrderDetails.shipping_cost || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="text-gray-400">Tax</span>
                            <span>${(fullOrderDetails.tax || 0).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="pt-8 border-t border-white/10 flex justify-between items-center">
                          <span className="text-xs font-black uppercase">Total</span>
                          <span className="text-5xl font-headline font-black italic tracking-tighter text-primary">${(fullOrderDetails.total || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Logistics Registry */}
                      {fullOrderDetails.shipping_address && (
                        <div className="bg-white border border-gray-100 p-8 rounded-[40px]">
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" /> Logistics Registry
                          </h3>
                          <div className="flex gap-4">
                            <div className="p-2 bg-gray-50 rounded-lg h-fit"><MapPin className="w-5 h-5 text-primary" /></div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-primary mb-1">Shipping Address</p>
                              <p className="text-xs font-bold text-gray-900 leading-relaxed uppercase">
                                {fullOrderDetails.shipping_address.first_name} {fullOrderDetails.shipping_address.last_name}<br />
                                {fullOrderDetails.shipping_address.street_1}<br />
                                {fullOrderDetails.shipping_address.city}, {fullOrderDetails.shipping_address.state} {fullOrderDetails.shipping_address.zip}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-20 text-center">Failed to load project details.</div>
              )}
            </motion.div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <header className="text-center mb-16">
                <h1 className="text-7xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                  Resolution <span className="text-primary italic">Desk</span>
                </h1>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Direct Communication Threads with the Society Lab</p>
              </header>

              <div className="grid grid-cols-5 gap-10">
                <div className="col-span-3 bg-white border border-gray-100 rounded-[40px] p-12">
                  <div className="flex items-center gap-3 mb-12">
                    <Send className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-headline font-black uppercase tracking-tight">Open New Thread</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 mb-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">
                    <p>Related Order</p>
                    <p>Inquiry Type</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <select className="w-full bg-white border border-gray-100 p-5 rounded-2xl text-xs font-bold outline-none focus:border-primary appearance-none uppercase">
                      <option>General Society Inquiry</option>
                      {orders.map(o => <option key={o.id}>Order #{o.id}</option>)}
                    </select>
                    <select className="w-full bg-white border border-gray-100 p-5 rounded-2xl text-xs font-bold outline-none focus:border-primary appearance-none uppercase">
                      <option>General Inquiry</option>
                      <option>Artwork Assist</option>
                      <option>Logistics Delay</option>
                    </select>
                  </div>

                  <div className="mb-8">
                    <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest block mb-4">Thread Subject</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Question about my artwork bleed..."
                      className="w-full bg-white border border-gray-100 p-5 rounded-2xl text-xs font-bold outline-none focus:border-primary uppercase"
                    />
                  </div>

                  <div className="mb-12">
                    <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest block mb-4">Resolution Message</label>
                    <textarea 
                      rows={5}
                      placeholder="Describe the issue or ask a question about your project..."
                      className="w-full bg-white border border-gray-100 p-8 rounded-3xl text-xs font-bold outline-none focus:border-primary resize-none uppercase"
                    />
                  </div>

                  <div className="mb-12">
                    <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest block mb-4">Evidence & Assets (Photos / Files)</label>
                    <div className="border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center group hover:border-primary transition-all cursor-pointer">
                      <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-4 group-hover:text-primary" />
                      <p className="text-[11px] font-black uppercase tracking-widest">Click to Attach Media</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase mt-2">PDF, AI, PNG, or JPG (Max 10MB per file)</p>
                    </div>
                  </div>

                  <button className="w-full bg-primary/40 text-white py-6 rounded-2xl font-headline font-black uppercase tracking-widest text-base italic hover:bg-primary transition-all">
                    Initiate Resolution Thread —
                  </button>
                </div>

                <div className="col-span-2 bg-[#0A0A0E] rounded-[40px] p-12 text-white relative shadow-2xl">
                  <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <h3 className="text-xs font-headline font-black uppercase tracking-widest">Resolution Journal</h3>
                    </div>
                    <div className="bg-white/10 w-1 h-32 rounded-full absolute right-8 top-32" />
                  </header>

                  <div className="space-y-12">
                    {threads.map((thread) => (
                      <div key={thread.id} className="relative">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-5 h-0.5 bg-gray-500 rounded-full" />
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ml-auto ${
                            thread.status === 'OPEN' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-500'
                          }`}>{thread.status}</span>
                        </div>
                        <h4 className="text-xl font-headline font-black italic tracking-tight mb-4 uppercase">{thread.subject}</h4>
                        <p className="text-[11px] text-gray-400 font-medium italic leading-relaxed mb-6">
                          {thread.message}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{thread.date}</span>
                          <button className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:underline">
                            View Thread <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <header className="text-center mb-16">
                <h1 className="text-7xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                  Society <span className="text-primary italic">Settings</span>
                </h1>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Your Professional Identity and Logistics Profile</p>
              </header>

              <div className="flex justify-center flex-wrap gap-6 mb-12">
                <div className="flex bg-white border border-gray-50 p-2 rounded-2xl">
                  {['Identity', 'Logistics', 'Business'].map((t, i) => (
                    <button key={i} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'bg-[#F9F9F9] text-gray-900 border border-gray-100 shadow-sm' : 'text-gray-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button className="bg-primary text-white px-8 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                    <Package className="w-4 h-4" /> Save Profile —
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="bg-white border text-red-500 border-red-100 px-8 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-12">
                <div className="col-span-3 bg-white border border-gray-50 rounded-[44px] p-14 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-10">
                    <div className="p-2 bg-primary/10 rounded-lg"><User className="w-4 h-4 text-primary" /></div>
                    <div>
                      <h3 className="text-lg font-headline font-black uppercase tracking-tight italic">Profile Identity</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your primary identification within the Society registry.</p>
                    </div>
                  </div>
                  <div className="h-px bg-gray-50 mb-12 -mx-14" />
                  
                  <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                    <div>
                      <label className="text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-4">First Name</label>
                      <input 
                        defaultValue={profile?.firstName || user?.displayName?.split(' ')[0] || ''}
                        className="w-full bg-[#F9F9F9] border border-gray-100 p-6 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-4">Last Name</label>
                      <input 
                        defaultValue={profile?.lastName || user?.displayName?.split(' ').slice(1).join(' ') || ''}
                        className="w-full bg-[#F9F9F9] border border-gray-100 p-6 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-4">Verified Email</label>
                      <div className="relative">
                        <input 
                          defaultValue={profile?.email || user?.email || ''}
                          className="w-full bg-transparent border-2 border-dotted border-gray-200 p-6 rounded-2xl text-sm font-bold text-gray-400 outline-none"
                          disabled
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase text-gray-900 tracking-widest block mb-4">Contact Phone</label>
                      <input 
                        defaultValue={profile?.phone}
                        className="w-full bg-transparent border border-gray-100 p-6 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-1 bg-[#0A0A0E] rounded-[44px] p-10 text-white shadow-2xl h-fit">
                  <h3 className="text-[12px] font-headline font-black uppercase tracking-[0.2em] mb-12">Registry Insight</h3>
                  <div className="space-y-8">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-gray-600">Member Joined</span>
                      <span>{profile?.memberSince}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-gray-600">Last Sync</span>
                      <span>{profile?.lastSync}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-8">
                      <span className="text-gray-600">Society UID</span>
                      <span className="text-primary truncate ml-8">{profile?.registryId}</span>
                    </div>
                    <div className="bg-primary/5 p-8 rounded-3xl border border-primary/20 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full border border-primary/40 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Registry Clearance Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <header className="mb-12">
                <h1 className="text-6xl font-headline font-black uppercase tracking-tighter italic leading-none mb-2">
                  My <span className="text-primary">Reviews</span>
                </h1>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">History of your feedback and ratings</p>
              </header>

              {myReviews.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-[40px] p-20 text-center">
                  <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                  <h3 className="text-xl font-headline font-black uppercase mb-2 italic">No Reviews Yet</h3>
                  <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-8">You haven't shared your thoughts on any products yet.</p>
                  <button 
                    onClick={() => navigate('/')}
                    className="bg-black text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-black/10"
                  >
                    Browse Products —
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {myReviews.map((review) => (
                    <div key={review.id} className="bg-white border border-gray-200 rounded-[32px] p-10 hover:shadow-xl hover:shadow-gray-100 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-[#FFD700] text-[#FFD700]' : 'text-gray-200'}`} 
                            />
                          ))}
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                          review.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>{review.status}</span>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Product</h4>
                        <Link to={`/product/${review.productId}`} className="text-sm font-black italic hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4">
                          View Project Original
                        </Link>
                      </div>

                      <p className="text-sm text-gray-600 font-medium italic leading-relaxed mb-6">"{review.comment}"</p>
                      
                      <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-gray-400">{review.createdAt?.toDate().toLocaleDateString()}</span>
                        <button 
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:opacity-70 transition-opacity"
                        >
                          Delete Review
                        </button>
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

function MapPin(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

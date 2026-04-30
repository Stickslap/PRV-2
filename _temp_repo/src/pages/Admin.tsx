import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  ExternalLink, 
  Plus, 
  ArrowUpRight,
  Search,
  Bell,
  Clock,
  MessageSquare,
  BookOpen,
  Layout,
  Image as ImageIcon, // For proofs
  Mail,
  Lock
} from "lucide-react";
import { motion } from "motion/react";
import axios from "axios";
import { AdminFAQs } from "../components/admin/AdminFAQs";
import { AdminJournals } from "../components/admin/AdminJournals";
import { AdminSettings } from "../components/admin/AdminSettings";
import { AdminMessages } from "../components/admin/AdminMessages";
import { AdminProducts } from "../components/admin/AdminProducts";
import { AdminCustomers } from "../components/admin/AdminCustomers";
import { AdminShipping } from "../components/admin/AdminShipping";
import { AdminAbout } from "../components/admin/AdminAbout";
import { AdminEmails } from "../components/admin/AdminEmails";
import { AttachProofModal } from "../components/admin/AttachProofModal";
import { OrderDetailModal } from "../components/admin/OrderDetailModal";
import { CustomerProfileModal } from "../components/admin/CustomerProfileModal";
import { auth, signInWithGoogle, logout } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";

interface Stats {
  revenue: number;
  orders: number;
  customers: number;
  conversion: string;
}

const ADMIN_EMAILS = [
  "hello@printsocietyco.com",
  "Arlington.A.Teheran@gmail.com",
  "arlington.a.teheran@gmail.com"
];

export function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "shipping" | "customers" | "messages" | "faqs" | "journals" | "about" | "settings" | "emails">("overview");
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const isStaff = localStorage.getItem("staff_authenticated") === "true";

    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (user) {
        const email = user.email || "";
        if (ADMIN_EMAILS.includes(email) || email.toLowerCase().includes("arlington.a.teheran")) {
          setAdminUser(user);
        } else if (isStaff && user.isAnonymous) {
          setAdminUser({ displayName: "Staff Terminal", email: "staff@printsocietyco.com", isAnonymous: true, uid: user.uid });
        } else if (!isStaff) {
          logout();
          navigate("/admin/login");
        }
      } else if (isStaff) {
        // If staff but no firebase user, we might be in a transient state or need to re-auth anonymously
        // AdminLogin already handles the initial sign-in, but if they refresh and session is lost:
        setAdminUser({ displayName: "Staff Terminal", email: "staff@printsocietyco.com", pendingAuth: true });
      } else {
        navigate("/admin/login");
      }
    });
    return () => unsub();
  }, [navigate]);

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [viewCustomerModal, setViewCustomerModal] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes, customersRes] = await Promise.all([
          axios.get("/api/admin/stats"),
          axios.get("/api/admin/orders"),
          axios.get("/api/admin/customers")
        ]);
        setStats(statsRes.data);
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.data && Array.isArray(ordersRes.data.data) ? ordersRes.data.data : []));
        setCustomersList(Array.isArray(customersRes.data) ? customersRes.data : []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="pt-40 text-center font-headline font-black animate-pulse uppercase tracking-[0.2em] text-xs">
      Initializing Administrative Workstation...
    </div>
  );

  if (!adminUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Sidebar - Desktop Only */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 pt-24 px-4 hidden lg:block z-40">
        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "overview" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Overview
          </button>
          
          <div className="pt-8 pb-4">
            <p className="px-4 text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">Management</p>
          </div>

          <button 
            onClick={() => setActiveTab("products")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "products" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <Package className="w-4 h-4" /> Products
          </button>

          <button 
            onClick={() => setActiveTab("shipping")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "shipping" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <Clock className="w-4 h-4" /> Shipping
          </button>

          <button 
            onClick={() => setActiveTab("customers")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "customers" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <Users className="w-4 h-4" /> Customers
          </button>

          <button 
            onClick={() => setActiveTab("messages")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "messages" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Comms & Proofs
          </button>

          <button 
            onClick={() => setActiveTab("emails")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "emails" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <Mail className="w-4 h-4" /> Email Lab
          </button>

          <button 
            onClick={() => setActiveTab("faqs")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "faqs" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> FAQ Registry
          </button>
          
          <button 
            onClick={() => setActiveTab("journals")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "journals" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <BookOpen className="w-4 h-4" /> Journals
          </button>

          <button 
            onClick={() => setActiveTab("about")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "about" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <Layout className="w-4 h-4" /> About Us
          </button>

          <button 
             onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeTab === "settings" ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-400"
            }`}
          >
            <Settings className="w-4 h-4" /> Lab Settings
          </button>

          <button 
            onClick={() => {
              localStorage.removeItem("staff_authenticated");
              localStorage.removeItem("staff_session_time");
              logout();
              navigate("/");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-red-50 text-red-400 mt-8"
          >
            <Lock className="w-4 h-4" /> Terminate Session
          </button>
        </nav>

        <div className="absolute bottom-8 left-4 right-4 p-4 bg-secondary rounded-2xl">
          <p className="text-[10px] font-black uppercase mb-1">BigCommerce Link</p>
          <p className="text-[10px] text-gray-600 mb-3 leading-tight font-medium">Full management tools are active in the BC control panel.</p>
          <a 
            href="https://login.bigcommerce.com/login" 
            target="_blank" 
            className="flex items-center justify-between bg-black text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase"
          >
            Open Admin <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="max-w-[1400px] mx-auto p-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h1 className="text-4xl font-headline font-black uppercase tracking-tighter italic text-gray-900">Workstation</h1>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Print Society Operational Hub • v1.0.4</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="SEARCH REGISTRY..." 
                  className="bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-[10px] font-bold tracking-widest outline-none focus:border-primary transition-all w-64"
                />
              </div>
              <button className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent rounded-full border border-white" />
              </button>
            </div>
          </header>

          {activeTab === "overview" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                  { label: "Net Revenue", val: `$${stats?.revenue.toLocaleString()}`, icon: BarChart3, color: "text-primary" },
                  { label: "Active Orders", val: stats?.orders, icon: Package, color: "text-orange-500" },
                  { label: "Registered Members", val: stats?.customers, icon: Users, color: "text-blue-500" },
                  { label: "Conversion Rate", val: stats?.conversion, icon: ArrowUpRight, color: "text-green-500" },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:border-primary transition-all group h-full flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 rounded-lg bg-gray-50 group-hover:bg-primary/5 transition-colors ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">+12.5%</span>
                    </div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</h3>
                    <p className="text-3xl font-headline font-black italic tracking-tighter">{stat.val}</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Orders Table */}
                <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="font-headline font-black italic uppercase tracking-tight text-lg">Live Manifest</h2>
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded">NEW</span>
                    </div>
                    <button className="text-[10px] font-black uppercase text-primary hover:underline">View All Entries</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Order ID</th>
                          <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Member</th>
                          <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Status</th>
                          <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Value</th>
                          <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Signal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orders.map((order, idx) => (
                          <tr 
                            key={idx} 
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setViewOrderId(order.id)}
                          >
                            <td className="py-4 px-6 text-xs font-bold text-gray-900">#{order.id}</td>
                            <td className="py-4 px-6 text-xs font-medium text-gray-600">{order.customer || "Member Guest"}</td>
                            <td className="py-4 px-6">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                order.status === 'Shipped' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs font-black italic font-headline">${(order.total || 0).toFixed(2)}</td>
                            <td className="py-4 px-6 text-right">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveOrderId(order.id);
                                }}
                                className="p-1 px-3 bg-black text-white hover:bg-gray-800 rounded transition-all text-[10px] font-bold uppercase flex items-center gap-2 ml-auto"
                              >
                                <ImageIcon className="w-3 h-3" /> Proofs
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notifications & System Info */}
                <div className="space-y-8 flex flex-col">
                  <div className="bg-primary text-white p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-primary/20 flex-1 flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> System Dispatch
                      </h3>
                      <p className="text-2xl font-headline font-black uppercase tracking-tighter mb-4 leading-none italic">Lab Maintenance <br />at 04:00 UTC</p>
                      <p className="text-xs opacity-80 mb-8 leading-relaxed">External API synchronization will be paused for protocol updates. All projects remain live.</p>
                      <button className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-secondary transition-all">
                        System Intel
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 p-8 rounded-3xl shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Dispatch History</h3>
                    <div className="space-y-6">
                      {[
                        { title: "Inventory Low: Premium Vinyl", time: "2h ago", color: "bg-red-500" },
                        { title: "New Member Registry", time: "5h ago", color: "bg-blue-500" },
                        { title: "Stripe Sync Complete", time: "12h ago", color: "bg-green-500" },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4">
                          <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.color}`} />
                          <div>
                            <p className="text-xs font-bold text-gray-900 mb-0.5">{item.title}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">{item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "messages" && (
            <div className="space-y-8">
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="font-headline font-black italic uppercase tracking-tight text-lg">Orders & Proofs Registry</h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Order ID</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Member</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Status</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Value</th>
                        <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map((order, idx) => (
                        <tr 
                          key={idx} 
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setViewOrderId(order.id)}
                        >
                          <td className="py-4 px-6 text-xs font-bold text-gray-900">#{order.id}</td>
                          <td className="py-4 px-6 text-xs font-medium text-gray-600">{order.customer || "Member Guest"}</td>
                          <td className="py-4 px-6">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                              order.status === 'Shipped' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs font-black italic font-headline">${(order.total || 0).toFixed(2)}</td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewOrderId(order.id);
                                }}
                                className="p-2 px-4 bg-gray-100 text-black hover:bg-gray-200 rounded-lg transition-all text-[10px] font-bold uppercase flex items-center gap-2"
                              >
                                View Details
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveOrderId(order.id);
                                }}
                                className="p-2 px-4 bg-black text-white hover:bg-gray-800 rounded-lg transition-all text-[10px] font-bold uppercase flex items-center gap-2"
                              >
                                <ImageIcon className="w-3 h-3" /> Attach Proof
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <AdminMessages />
            </div>
          )}

          {activeTab === "products" && <AdminProducts />}
          {activeTab === "shipping" && <AdminShipping onViewOrder={setViewOrderId} />}
          {activeTab === "about" && <AdminAbout />}
          {activeTab === "faqs" && <AdminFAQs />}
          {activeTab === "journals" && <AdminJournals />}
          {activeTab === "settings" && <AdminSettings />}
          {activeTab === "customers" && <AdminCustomers />}
          {activeTab === "emails" && <AdminEmails />}

          {activeOrderId && authReady && (
            <AttachProofModal 
              orderId={activeOrderId} 
              onClose={() => setActiveOrderId(null)} 
            />
          )}

          {activeOrderId && !authReady && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white p-8 rounded-3xl font-bold uppercase text-[10px] tracking-widest animate-pulse">
                Authenticating Security Protocol...
              </div>
            </div>
          )}

          {viewOrderId && (
            <OrderDetailModal
              orderId={viewOrderId}
              onClose={() => setViewOrderId(null)}
            />
          )}

          {viewCustomerModal && selectedCustomer && (
            <CustomerProfileModal
              customer={selectedCustomer}
              onClose={() => setViewCustomerModal(false)}
            />
          )}

        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, Package, MapPin, Mail, Phone, Calendar, Save, Trash2, Plus } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

type Tab = 'details' | 'address';

export function CustomerProfileModal({ customer, onClose }: { customer: any, onClose: () => void }) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    customer_group_id: 0,
    phone: "",
    store_credit: "0.00",
    accepts_reviews: false,
    force_password_reset: false,
    tax_exempt_category: "",
    _password: "",
    _confirm_password: ""
  });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await axios.get(`/api/admin/customers/${customer.id}`);
        setDetails(res.data);
        setFormData({
          first_name: res.data.first_name || "",
          last_name: res.data.last_name || "",
          company: res.data.company || "",
          email: res.data.email || "",
          customer_group_id: res.data.customer_group_id || 0,
          phone: res.data.phone || "",
          store_credit: res.data.store_credit || "0.00",
          accepts_reviews: res.data.accepts_marketing || false,
          force_password_reset: res.data.force_password_reset || false,
          tax_exempt_category: res.data.tax_exempt_category || "",
          _password: "",
          _confirm_password: ""
        });
      } catch (err) {
        console.error("Failed to fetch customer complete details", err);
      } finally {
        setLoading(false);
      }
    };
    if (customer?.id) fetchDetails();
  }, [customer]);

  const handleSave = async () => {
    if (formData._password && formData._password !== formData._confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        company: formData.company,
        email: formData.email,
        customer_group_id: formData.customer_group_id,
        phone: formData.phone,
        accepts_marketing: formData.accepts_reviews,
        force_password_reset: formData.force_password_reset,
        tax_exempt_category: formData.tax_exempt_category,
      };
      
      // Store credit requires specific handling in BigCommerce V3, but adding it minimally here
      if (formData.store_credit !== undefined) {
        payload.store_credit = parseFloat(formData.store_credit);
      }

      if (formData._password) {
        payload.authentication = { force_password_reset: formData.force_password_reset, new_password: formData._password };
      }

      await axios.put(`/api/admin/customers/${customer.id}`, payload);
      toast.success("Member intelligence updated");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile to BigCommerce");
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-[40px] p-10 max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden relative border border-gray-100"
        >
          <button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
          
          {/* Header */}
          <div className="flex items-center gap-6 mb-10 pr-16 bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-primary font-headline font-black text-3xl uppercase tracking-tighter">
              {customer.first_name[0]}{customer.last_name[0]}
            </div>
            <div>
              <h2 className="text-4xl font-headline font-black uppercase tracking-tighter italic text-gray-900 mb-2">
                {customer.first_name} {customer.last_name}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{customer.company !== "N/A" && customer.company ? customer.company : 'Individual'}</span>
                {details?.customer_group_id ? <span className="bg-primary/10 text-primary text-[10px] px-2.5 py-1 rounded-md uppercase font-black tracking-widest">Group {details.customer_group_id}</span> : null}
              </div>
            </div>
            
            <a 
              href={`https://login.bigcommerce.com/login`} 
              target="_blank" rel="noreferrer"
              className="ml-auto flex items-center gap-2 bg-white border border-gray-100 text-gray-900 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition shadow-sm"
            >
              Open in BC <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-gray-100 mb-8">
            <button 
              onClick={() => setActiveTab('details')}
              className={`pb-4 px-4 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === 'details' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Identity Profile
            </button>
            <button 
              onClick={() => setActiveTab('address')}
              className={`pb-4 px-4 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === 'address' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Logistics Destinations
            </button>
          </div>

          {loading ? (
             <div className="flex-1 flex justify-center items-center py-32 text-xs font-black uppercase tracking-widest text-gray-400 animate-pulse">
               Fetching secure dossier...
             </div>
          ) : (
            <div className="overflow-y-auto pr-2 pb-4 -mr-2">
              
              {activeTab === 'details' && (
                <div className="space-y-12">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">First Name</label>
                      <input 
                        type="text" 
                        value={formData.first_name} 
                        onChange={e => setFormData({...formData, first_name: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Last Name</label>
                      <input 
                        type="text" 
                        value={formData.last_name} 
                        onChange={e => setFormData({...formData, last_name: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Company Name</label>
                      <input 
                        type="text" 
                        value={formData.company} 
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Email Address</label>
                      <input 
                        type="email" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Customer Group</label>
                      <select 
                        value={formData.customer_group_id} 
                        onChange={e => setFormData({...formData, customer_group_id: parseInt(e.target.value)})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition appearance-none uppercase"
                      >
                        <option value={0}>-- None (no customer group) --</option>
                        <option value={1}>Group 1</option>
                        <option value={2}>Group 2</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Phone</label>
                      <input 
                        type="tel" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Store Credit ($)</label>
                      <input 
                        type="number" step="0.01"
                        value={formData.store_credit} 
                        onChange={e => setFormData({...formData, store_credit: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Receive ACS/Review Emails</label>
                      <select 
                        value={formData.accepts_reviews ? "Yes" : "No"} 
                        onChange={e => setFormData({...formData, accepts_reviews: e.target.value === "Yes"})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition appearance-none uppercase"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Force Password Reset on Next Login</label>
                      <select 
                        value={formData.force_password_reset ? "Yes" : "No"} 
                        onChange={e => setFormData({...formData, force_password_reset: e.target.value === "Yes"})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition appearance-none uppercase"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Tax Exempt Code</label>
                      <input 
                        type="text" 
                        value={formData.tax_exempt_category} 
                        onChange={e => setFormData({...formData, tax_exempt_category: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* Password Section */}
                  <div className="bg-gray-50 border border-gray-100 p-8 rounded-[32px]">
                    <h3 className="text-[12px] font-headline font-black uppercase tracking-tight text-gray-900 mb-6 flex items-center gap-3">
                      Authentication
                    </h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">New Password</label>
                        <input 
                          type="password" 
                          placeholder="Leave blank to keep current"
                          value={formData._password} 
                          onChange={e => setFormData({...formData, _password: e.target.value})}
                          className="w-full bg-white border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary transition"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3 pl-1">Confirm Password</label>
                        <input 
                          type="password" 
                          placeholder="Re-enter new password"
                          value={formData._confirm_password} 
                          onChange={e => setFormData({...formData, _confirm_password: e.target.value})}
                          className="w-full bg-white border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-primary transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-primary text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {saving ? "Syncing to BC..." : "Save Identity Changes"} <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'address' && (
                <div className="space-y-6">
                  <div className="flex gap-4 mb-8">
                    <button className="bg-gray-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition">
                      <Plus className="w-3 h-3" /> Add location
                    </button>
                    <button className="bg-gray-50 border border-gray-100 text-red-500 px-4 py-3 rounded-xl flex items-center justify-center hover:bg-red-50 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[24px] overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="p-4 w-12 text-center"><input type="checkbox" className="rounded" /></th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {details?.addresses && details.addresses.length > 0 ? details.addresses.map((addr: any) => (
                          <tr key={addr.id} className="hover:bg-gray-50">
                            <td className="p-4 text-center"><input type="checkbox" className="rounded" /></td>
                            <td className="p-4 text-xs font-bold text-primary">{addr.first_name} {addr.last_name}</td>
                            <td className="p-4 text-xs font-medium text-gray-600">{addr.phone || "-"}</td>
                            <td className="p-4">
                              <p className="text-xs font-bold text-gray-900 leading-relaxed uppercase">
                                {addr.street_1}
                                {addr.street_2 && <><br/>{addr.street_2}</>}
                                <br />{addr.city}, {addr.state} {addr.zip}
                                <br /><span className="text-gray-400">{addr.country}</span>
                              </p>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                              No logistics destinations logged.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

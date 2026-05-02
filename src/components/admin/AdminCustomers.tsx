import { useEffect, useState } from "react";
import axios from "axios";
import { Users, Search, ExternalLink, Mail, Phone, Calendar } from "lucide-react";

export function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/customers");
      setCustomers(res.data);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse">Syncing Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-headline font-black italic uppercase tracking-tight text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" /> Member Registry
            </h2>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-500 px-2 py-0.5 rounded uppercase">{customers.length} Entries</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="SEARCH MEMBERS..." 
                className="bg-gray-50 border border-gray-200 pl-10 pr-4 py-2 rounded-xl text-[10px] font-bold tracking-widest outline-none focus:border-primary transition-all w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">ID</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Name</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Contact</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Joined</th>
                <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 text-xs font-bold text-gray-400">BC-{c.id}</td>
                  <td className="py-4 px-6">
                    <p className="text-xs font-bold text-gray-900">{c.first_name} {c.last_name}</p>
                    {c.company && c.company !== "N/A" && (
                      <p className="text-[10px] text-gray-500 uppercase">{c.company}</p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs text-gray-600 mb-0.5">{c.email}</p>
                    <p className="text-[10px] text-gray-400">{c.phone}</p>
                  </td>
                  <td className="py-4 px-6 text-xs text-gray-500">
                    {new Date(c.date_created).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="p-2 px-4 bg-gray-100 text-black hover:bg-black hover:text-white rounded-lg transition-all text-[10px] font-bold uppercase"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                    No customers found in BigCommerce.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomerId && (
        <CustomerProfileModal customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
      )}
    </div>
  );
}

function CustomerProfileModal({ customerId, onClose }: { customerId: string, onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`/api/admin/customers/${customerId}`);
        setProfile(res.data);
      } catch (err) {
        console.error("Failed to fetch customer profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [customerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-headline font-black italic uppercase tracking-tight">Member Intel</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">BC-UID-{customerId}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-20 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse">Decrypting Profile Data...</p>
            </div>
          ) : !profile ? (
            <div className="py-20 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Failed to load profile.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Header Info */}
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl font-black text-gray-400 uppercase">
                  {profile.first_name[0]}{profile.last_name[0]}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-headline font-black uppercase tracking-tight mb-2">
                    {profile.first_name} {profile.last_name}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-600">
                    <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {profile.email}</div>
                    <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {profile.phone || "No phone"}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(profile.date_created).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <a 
                    href={`https://login.bigcommerce.com/login`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 p-2 px-4 bg-primary text-white rounded-lg text-[10px] font-bold uppercase transition-transform hover:-translate-y-0.5"
                  >
                    View in BC <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Known Coordinates</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.addresses && profile.addresses.length > 0 ? (
                    profile.addresses.map((addr: any, i: number) => (
                      <div key={i} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 text-xs text-gray-600">
                        <p className="font-bold text-gray-900 mb-1">{addr.first_name} {addr.last_name}</p>
                        <p>{addr.address1}</p>
                        {addr.address2 && <p>{addr.address2}</p>}
                        <p>{addr.city}, {addr.state_or_province} {addr.postal_code}</p>
                        <p>{addr.country}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 text-center col-span-2">
                       No coordinates filed on record.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Recent Operations</h4>
                {profile.orders && profile.orders.length > 0 ? (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="py-3 px-4 text-[10px] font-black uppercase text-gray-400">Order ID</th>
                          <th className="py-3 px-4 text-[10px] font-black uppercase text-gray-400">Date</th>
                          <th className="py-3 px-4 text-[10px] font-black uppercase text-gray-400">Status</th>
                          <th className="py-3 px-4 text-[10px] font-black uppercase text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {profile.orders.map((o: any, i: number) => (
                          <tr key={i}>
                            <td className="py-3 px-4 text-xs font-bold">#{o.id}</td>
                            <td className="py-3 px-4 text-xs text-gray-500">{o.date}</td>
                            <td className="py-3 px-4">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-gray-100 text-gray-600">
                                {o.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-black italic">${(o.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 text-center">
                    No active operations found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

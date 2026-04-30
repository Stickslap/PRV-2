import React, { useState, useEffect } from 'react';
import { X, Package, Mail, Send, FileText, Image as ImageIcon, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AttachProofModal } from './AttachProofModal';

interface Product {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

interface Address {
  first_name: string;
  last_name: string;
  company: string;
  street_1: string;
  street_2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
}

interface OrderDetail {
  id: string | number;
  status_id?: number;
  customer: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  date: string;
  ip_address: string;
  payment_method: string;
  billing_address?: Address | null;
  shipping_address?: Address | null;
  products: Product[];
}

export function OrderDetailModal({ orderId, onClose }: { orderId: string | number, onClose: () => void }) {
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchDetail = async () => {
    try {
      const [orderRes, statusRes, msgRes] = await Promise.all([
        axios.get(`/api/admin/orders/${orderId}`),
        axios.get("/api/admin/order-statuses"),
        axios.get(`/api/admin/orders/${orderId}/messages`)
      ]);
      setOrder(orderRes.data);
      setStatuses(statusRes.data);
      setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);
    } catch (err: any) {
      console.error("Error fetching order data:", err);
      const detail = err.response?.data?.details || err.response?.data?.error || err.message;
      toast.error(`BigCommerce: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchDetail();
  }, [orderId]);

  const handleStatusChange = async (statusId: string) => {
    try {
      await axios.put(`/api/admin/orders/${orderId}/status`, { status_id: parseInt(statusId) });
      toast.success("Order status updated");
      fetchDetail();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleResendInvoice = async () => {
    try {
      await axios.post(`/api/admin/orders/${orderId}/resend-invoice`);
      toast.success("Invoice transmitted to customer");
    } catch (err) {
      toast.error("Failed to resend invoice");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    try {
      await axios.post(`/api/admin/orders/${orderId}/messages`, { message: newMessage });
      toast.success("Message transmitted");
      setNewMessage("");
      const res = await axios.get(`/api/admin/orders/${orderId}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-7xl w-full shadow-2xl rounded-sm max-h-[95vh] overflow-y-auto text-sm text-gray-700">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <div className="flex items-center gap-8">
            <span className="font-bold text-gray-600">{order?.date ? new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
            <span className="text-gray-800 font-bold">ORDER #{orderId}</span>
            <span className="text-blue-500 font-medium">{order?.customer}</span>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-gray-400">Status:</span>
              <select 
                value={order?.status_id || ''} 
                onChange={(e) => handleStatusChange(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white font-bold"
              >
                {statuses.map(s => {
                  const label = s.status === 'Awaiting Shipment' ? 'Packing' : s.status;
                  return <option key={s.id} value={s.id}>{label}</option>;
                })}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/track?orderId=${orderId}`)}
              className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 rounded-lg px-3 py-1.5"
            >
              <MapPin className="w-3 h-3" /> Track Order
            </button>
            <button 
              onClick={handleResendInvoice}
              className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 hover:text-primary transition-colors border border-gray-200 rounded-lg px-3 py-1.5"
            >
              <FileText className="w-3 h-3" /> Resend Invoice
            </button>
            <button 
              onClick={() => setShowProofModal(true)}
              className="flex items-center gap-2 text-[10px] font-black uppercase text-white bg-black hover:bg-gray-800 rounded-lg px-3 py-1.5 transition-colors"
            >
              <ImageIcon className="w-3 h-3" /> Manage Proofs
            </button>
            <span className="text-gray-800 font-bold ml-4">${(order?.total || 0).toFixed(2)}</span>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500 ml-4">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-0">
          {loading ? (
             <div className="flex justify-center p-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
             </div>
          ) : !order ? (
             <div className="text-center p-12 text-gray-500 font-bold uppercase tracking-widest">Entry Not Found</div>
          ) : (
             <div className="flex flex-col">
               <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200 border-b border-gray-200">
                 {/* Billing Section */}
                 <div className="flex-1 p-6 space-y-4">
                   <div className="flex justify-between items-center">
                     <h3 className="font-headline font-black italic uppercase text-gray-900 text-base">Billing Identity</h3>
                     <button className="flex items-center gap-1 text-blue-500 text-[10px] font-bold uppercase border border-blue-200 rounded px-2 py-1 hover:bg-blue-50">
                       Registry Copy
                     </button>
                   </div>
                   
                   <div className="flex gap-4">
                     <div className="w-6 hidden sm:block"></div>
                     <div className="text-sm space-y-1">
                       <p className="font-bold">{order.billing_address?.first_name} {order.billing_address?.last_name}</p>
                       {order.billing_address?.company && <p className="italic text-gray-500">{order.billing_address.company}</p>}
                       <p>{order.billing_address?.street_1}</p>
                       {order.billing_address?.street_2 && <p>{order.billing_address.street_2}</p>}
                       <p>{order.billing_address?.city}, {order.billing_address?.state} {order.billing_address?.zip}</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-[24px_1fr] gap-4 items-center mt-6">
                     <span className="text-gray-400">🌐</span>
                     <span className="font-medium tracking-tight whitespace-nowrap">{order.billing_address?.country || "Default Region"}</span>
                     
                     <span className="text-gray-400">📞</span>
                     <span className="tracking-tighter">{order.billing_address?.phone || "N/A"}</span>
                     
                     <span className="text-gray-400">✉️</span>
                     <a href={`mailto:${order.billing_address?.email}`} className="text-blue-500 hover:underline font-medium">{order.billing_address?.email}</a>
                     
                     <span className="text-gray-400">📅</span>
                     <span className="text-gray-500">{new Date(order.date).toLocaleString()}</span>
                     
                     <span className="text-gray-400 text-[10px] font-bold leading-none uppercase">IP Log</span>
                     <span className="text-blue-500 font-mono text-[11px]">{order.ip_address}</span>
                     
                     <span className="text-gray-400 hover:text-gray-600 cursor-pointer">💳</span>
                     <span className="font-bold uppercase text-[10px] text-gray-400">{order.payment_method}</span>
                   </div>
                 </div>

                 {/* Shipping Section */}
                 <div className="flex-1 p-6 space-y-4">
                   <div className="flex justify-between items-center">
                     <h3 className="font-headline font-black italic uppercase text-gray-900 text-base">Destination</h3>
                     <button className="flex items-center gap-1 text-blue-500 text-[10px] font-bold uppercase border border-blue-200 rounded px-2 py-1 hover:bg-blue-50">
                       Copy
                     </button>
                   </div>
                   
                   <div className="flex gap-4">
                     <div className="w-6 hidden sm:block"></div>
                     <div className="text-sm space-y-1">
                       <p className="font-bold">{order.shipping_address?.first_name || order.billing_address?.first_name} {order.shipping_address?.last_name || order.billing_address?.last_name}</p>
                       {(order.shipping_address?.company || order.billing_address?.company) && <p className="italic text-gray-500">{order.shipping_address?.company || order.billing_address?.company}</p>}
                       <p>{order.shipping_address?.street_1 || order.billing_address?.street_1}</p>
                       {(order.shipping_address?.street_2 || order.billing_address?.street_2) && <p>{order.shipping_address?.street_2 || order.billing_address?.street_2}</p>}
                       <p>{order.shipping_address?.city || order.billing_address?.city}, {order.shipping_address?.state || order.billing_address?.state} {order.shipping_address?.zip || order.billing_address?.zip}</p>
                     </div>
                   </div>

                   <div className="mt-8 pt-6 border-t border-gray-100">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Carrier Protocol</h4>
                      <p className="text-gray-800 font-bold">Standard Shipping</p>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500 text-xs tracking-tight">Assigned Zone Rates</span>
                        <span className="font-bold text-gray-900">${(order.shipping_cost || 0).toFixed(2)}</span>
                      </div>
                   </div>

                   <div className="mt-6 pt-6 border-t border-gray-100">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Direct Contact</h4>
                      <div className="grid grid-cols-[24px_1fr] gap-3 items-center">
                        <span className="text-gray-400">📞</span>
                        <span className="text-xs font-bold">{order.shipping_address?.phone || order.billing_address?.phone || "N/A"}</span>
                        
                        <span className="text-gray-400">✉️</span>
                        <a href={`mailto:${order.shipping_address?.email || order.billing_address?.email}`} className="text-blue-500 hover:underline text-xs font-medium">{order.shipping_address?.email || order.billing_address?.email}</a>
                      </div>
                   </div>
                 </div>

                 {/* Items Section */}
                 <div className="flex-1 flex flex-col bg-gray-50/30">
                   <div className="p-6 flex-1">
                     <div className="flex justify-between items-center mb-6">
                       <h3 className="font-headline font-black italic uppercase text-gray-900 text-base text-primary">Manifest</h3>
                       <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded text-primary">{order.products?.length || 0} ITEMS</span>
                     </div>
                     
                     <div className="space-y-4">
                       {order.products?.map((p, idx) => (
                         <div key={idx} className="flex justify-between items-start text-sm bg-white p-3 border border-gray-100 rounded-lg shadow-sm">
                           <div className="font-bold"><span className="text-primary mr-2 opacity-50">{p.quantity}X</span>{p.name} (SKU: {p.sku}) • {p.quantity} units @ ${(p.price || 0).toFixed(2)} ea</div>
                           <div className="font-headline italic font-black">${(p.total || 0).toFixed(2)}</div>
                         </div>
                       ))}
                     </div>

                     <button className="mt-8 w-full flex items-center justify-center gap-3 bg-white text-primary border border-primary/20 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm">
                       <Package className="w-4 h-4" /> Finalize Shipment Protocol
                     </button>
                   </div>
                   
                   <div className="bg-gray-100/50 p-6 space-y-3 text-[11px] text-gray-800 border-t border-gray-200">
                     <div className="flex justify-between opacity-60 font-bold uppercase tracking-widest">
                       <span>Sub-Total Manifest</span>
                       <span>${(order.subtotal || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between opacity-60 font-bold uppercase tracking-widest">
                       <span>Transit Logic</span>
                       <span>${(order.shipping_cost || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between opacity-60 font-bold uppercase tracking-widest">
                       <span>Regulatory Tax</span>
                       <span>${(order.tax || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between font-black pt-4 border-t border-gray-300 text-lg italic font-headline text-primary tracking-tighter">
                       <span className="uppercase">Grand Total</span>
                       <span>${(order.total || 0).toFixed(2)}</span>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Messages/Communication Section */}
               <div className="p-6 bg-white flex flex-col md:flex-row gap-8">
                 <div className="flex-1">
                   <h3 className="font-headline font-black italic uppercase text-gray-900 text-base mb-6 flex items-center gap-2">
                     <Mail className="w-4 h-4 opacity-30" /> Communication Log
                   </h3>
                   <div className="space-y-4 max-h-[400px] overflow-y-auto mb-6 pr-4">
                     {messages.length === 0 ? (
                       <p className="text-center py-12 text-[10px] font-black uppercase text-gray-300 tracking-widest">No signals recorded for this order</p>
                     ) : (
                       messages.map((m: any, idx: number) => (
                         <div key={idx} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl relative">
                           <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-black uppercase text-gray-400">{new Date(m.date_created).toLocaleString()}</span>
                             {!m.is_customer_visible && <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 rounded">INTERNAL ONLY</span>}
                           </div>
                           <p className="text-sm leading-relaxed text-gray-700">{m.message}</p>
                         </div>
                       ))
                     )}
                   </div>
                   <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                     <textarea 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="DISPATCH MESSAGE TO CUSTOMER..."
                        className="w-full h-24 p-4 border border-gray-200 rounded-2xl text-xs font-bold tracking-widest uppercase outline-none focus:border-primary transition-all bg-gray-50/50"
                        required
                     />
                     <div className="flex justify-end">
                       <button 
                        disabled={sendingMessage}
                        className="flex items-center gap-3 bg-black text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary transition-all disabled:opacity-50"
                       >
                         {sendingMessage ? "TRANSMITTING..." : "SEND SIGNAL"} <Send className="w-3 h-3" />
                       </button>
                     </div>
                   </form>
                 </div>
                 
                 <div className="w-full md:w-80 bg-gray-50 rounded-3xl p-6">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">Quick Protocol Controls</h4>
                    <div className="space-y-3">
                      <button className="w-full text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-primary transition-all">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Trigger</p>
                        <p className="text-xs font-bold">Email Proof Reminder</p>
                      </button>
                      <button className="w-full text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-primary transition-all">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Action</p>
                        <p className="text-xs font-bold">Mark as "Ready for Pickup"</p>
                      </button>
                      <button className="w-full text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-primary transition-all">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Administrative</p>
                        <p className="text-xs font-bold text-red-500">Void/Cancel Entry</p>
                      </button>
                    </div>
                    
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Metadata Hash</p>
                      <div className="space-y-2 font-mono text-[9px] text-gray-400 uppercase">
                        <p>Origin: {order.ip_address}</p>
                        <p>Agent: Web-Protocol-V3</p>
                        <p>Secure: Verified SSL</p>
                      </div>
                    </div>
                 </div>
               </div>
             </div>
          )}
        </div>
      </div>
      {showProofModal && (
        <AttachProofModal 
          orderId={String(orderId)} 
          onClose={() => setShowProofModal(false)} 
        />
      )}
    </div>
  );
}

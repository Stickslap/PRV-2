import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import axios from "axios";
import { useAuth } from "../../lib/AuthContext";
import { CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface OrderProofsProps {
  orderId: string;
}

export function OrderProofs({ orderId }: OrderProofsProps) {
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const fetchProofs = async () => {
      try {
        const snap = await getDocs(collection(db, `orders/${orderId}/proofs`));
        setProofs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProofs();
  }, [orderId]);

  const handleUpdate = async (id: string, status: string, feedbackText: string = "") => {
    try {
      await updateDoc(doc(db, `orders/${orderId}/proofs`, id), {
        status,
        feedback: feedbackText,
        updatedAt: serverTimestamp()
      });

      if (user) {
        try {
          await axios.post(`/api/customer/orders/${orderId}/messages`, {
            email: user.email,
            message: `CUSTOMER ${status} PROOF. Feedback: ${feedbackText || 'None'}`
          });
        } catch (bcErr) {
          console.warn("Failed to notify admin via BigCommerce", bcErr);
        }
      }

      setProofs(ps => ps.map(p => p.id === id ? { ...p, status, feedback: feedbackText } : p));
      setActiveRejectId(null);
      setRejectReason("");
      toast.success(status === 'APPROVED' ? "Proof Approved" : "Revision Requested");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}/proofs`);
    }
  };

  if (loading) return null;
  if (proofs.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-10 mt-8 mb-8 shadow-sm">
      <h3 className="font-headline font-black text-2xl uppercase italic mb-6 tracking-tighter">Digital Proofs</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {proofs.map(p => (
          <div key={p.id} className="border border-gray-100 rounded-2xl overflow-hidden p-4 md:p-6 bg-[#FCFCFD]">
            <a href={p.imageUrl} target="_blank" rel="noopener noreferrer">
              <img src={p.imageUrl} alt="Artwork Proof" className="w-full h-auto aspect-video object-contain rounded-xl bg-gray-100 mb-6 border border-gray-200 cursor-zoom-in hover:brightness-95 transition-all" />
            </a>
            
            {activeRejectId === p.id ? (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#5719D3]">Revision Required *</label>
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-4 text-[11px] outline-none focus:border-red-500 bg-white min-h-[80px]"
                  placeholder="Please specify what needs to be changed..."
                  autoFocus
                />
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <button 
                    onClick={() => setActiveRejectId(null)} 
                    className="w-full sm:w-auto px-4 py-3 sm:py-2 text-[10px] uppercase font-bold text-gray-500 hover:text-black border border-gray-200 sm:border-transparent rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (!rejectReason.trim()) {
                        toast.error("Please provide a reason for rejection.");
                        return;
                      }
                      handleUpdate(p.id, "REJECTED", rejectReason);
                    }}
                    className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-red-500 text-white rounded-lg text-[10px] uppercase font-black tracking-widest hover:bg-red-600"
                  >
                    Submit Revision
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Status</p>
                  <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${p.status === 'APPROVED' ? 'text-emerald-500' : p.status === 'REJECTED' ? 'text-red-500' : 'text-orange-500'}`}>
                    {p.status === 'APPROVED' && <CheckCircle2 className="w-4 h-4" />}
                    {p.status === 'REJECTED' && <XCircle className="w-4 h-4" />}
                    {p.status}
                  </p>
                </div>
                {p.status === "PENDING" && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <button 
                      onClick={() => handleUpdate(p.id, "APPROVED")} 
                      className="w-full sm:w-auto bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors border border-emerald-100"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => setActiveRejectId(p.id)} 
                      className="w-full sm:w-auto bg-red-50 text-red-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors border border-red-100"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {p.feedback && p.status !== "PENDING" && (
              <p className="mt-6 text-xs bg-gray-50 border border-gray-100 text-gray-600 italic p-4 rounded-xl leading-relaxed">
                <span className="font-bold block not-italic uppercase tracking-widest text-[9px] mb-2 text-gray-400">Your Feedback</span>
                {p.feedback}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

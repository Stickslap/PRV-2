import { useState, useEffect } from "react";
import { collection, query, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import axios from "axios";
import { useAuth } from "../../lib/AuthContext";

interface OrderProofsProps {
  orderId: string;
}

export function OrderProofs({ orderId }: OrderProofsProps) {
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleUpdate = async (id: string, status: string) => {
    const feedback = prompt("Optional feedback:") || "";
    try {
      await updateDoc(doc(db, `orders/${orderId}/proofs`, id), {
        status,
        feedback,
        updatedAt: serverTimestamp()
      });

      // Notify admin via BigCommerce message
      if (user) {
        try {
          await axios.post(`/api/customer/orders/${orderId}/messages`, {
            email: user.email,
            message: `CUSTOMER ${status} PROOF. Feedback: ${feedback || 'None'}`
          });
        } catch (bcErr) {
          console.warn("Failed to notify admin via BigCommerce", bcErr);
        }
      }

      setProofs(ps => ps.map(p => p.id === id ? { ...p, status, feedback } : p));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}/proofs`);
    }
  };

  if (loading) return null; // or skeleton
  if (proofs.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-10 mt-8 mb-8">
      <h3 className="font-headline font-black text-2xl uppercase italic mb-6">Digital Proofs</h3>
      <div className="grid grid-cols-2 gap-6">
        {proofs.map(p => (
          <div key={p.id} className="border border-gray-100 rounded-2xl overflow-hidden p-4">
            <img src={p.imageUrl} className="w-full h-auto aspect-video object-cover rounded-xl bg-gray-50 mb-4" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</p>
                <p className={`text-xs font-black uppercase ${p.status === 'APPROVED' ? 'text-green-500' : p.status === 'REJECTED' ? 'text-red-500' : 'text-orange-500'}`}>
                  {p.status}
                </p>
              </div>
              {p.status === "PENDING" && (
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(p.id, "APPROVED")} className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-green-100">Approve</button>
                  <button onClick={() => handleUpdate(p.id, "REJECTED")} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100">Reject</button>
                </div>
              )}
            </div>
            {p.feedback && <p className="mt-4 text-xs bg-gray-50 p-3 rounded-lg">Reply: {p.feedback}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import toast from "react-hot-toast";
import axios from "axios";

interface AttachProofModalProps {
  orderId: string;
  onClose: () => void;
}

export function AttachProofModal({ orderId, onClose }: AttachProofModalProps) {
  const [proofUrl, setProofUrl] = useState("");
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProofs = async () => {
      try {
        const snap = await getDocs(collection(db, `orders/${orderId}/proofs`));
        setProofs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `orders/${orderId}/proofs`);
      } finally {
        setLoading(false);
      }
    };
    fetchProofs();
  }, [orderId]);

    const [status, setStatus] = useState("PENDING");
    const [feedback, setFeedback] = useState("");

    const handleAttach = async () => {
    if (!proofUrl.trim()) return;
    try {
      await addDoc(collection(db, `orders/${orderId}/proofs`), {
        orderId,
        imageUrl: proofUrl.trim(),
        status: status,
        feedback: feedback.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Notify via BigCommerce Order Messages
      try {
        await axios.post(`/api/admin/orders/${orderId}/messages`, {
          message: `NEW ARTWORK PROOF UPLOADED: ${proofUrl.trim()}\n\nPlease review in your dashboard and approve or reject with feedback.`,
          is_customer_visible: true
        });
      } catch (bcErr) {
        console.warn("Failed to send BigCommerce notification for proof", bcErr);
      }

      toast.success("Proof attached and customer notified!");
      setProofUrl("");
      setFeedback("");
      setStatus("PENDING");
      // re-fetch
      const snap = await getDocs(collection(db, `orders/${orderId}/proofs`));
      setProofs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}/proofs`);
      toast.error("Failed to attach proof");
    }
  };

  const handleUpdate = async (id: string, newStatus: string, newFeedback: string) => {
    try {
      await updateDoc(doc(db, `orders/${orderId}/proofs`, id), {
        status: newStatus,
        feedback: newFeedback,
        updatedAt: serverTimestamp(),
      });
      toast.success("Proof updated!");
      setProofs(proofs.map(p => p.id === id ? { ...p, status: newStatus, feedback: newFeedback } : p));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}/proofs`);
      toast.error("Failed to update proof");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline font-black uppercase text-xl">Proofs for #{orderId}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black">Close</button>
        </div>

        <div className="mb-8 space-y-4 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="text-sm text-gray-500">Loading proofs...</div>
          ) : proofs.length === 0 ? (
            <div className="text-sm text-gray-500">No proofs attached yet.</div>
          ) : (
            proofs.map(p => (
              <div key={p.id} className="flex flex-col gap-4 p-4 border border-gray-100 rounded-xl items-start">
                <div className="flex gap-4 w-full items-center">
                  <img src={p.imageUrl} alt="Proof" className="w-16 h-16 object-cover rounded bg-gray-100" />
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-bold text-gray-500">Status: <span className={p.status === 'APPROVED' ? 'text-green-500' : p.status === 'REJECTED' ? 'text-red-500' : 'text-orange-500'}>{p.status}</span></p>
                    {p.feedback && <p className="text-xs text-gray-800 mt-1">Feedback: {p.feedback}</p>}
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <select 
                    value={p.status} 
                    onChange={e => handleUpdate(p.id, e.target.value, p.feedback)}
                    className="p-2 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Update feedback..." 
                    defaultValue={p.feedback}
                    onBlur={e => {
                      if(e.target.value !== p.feedback) handleUpdate(p.id, p.status, e.target.value)
                    }}
                    className="flex-1 p-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-xl">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Attach New Proof</label>
          <div className="space-y-3">
            <input 
              type="text" 
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="Paste Image URL..." 
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="w-1/3 p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary bg-white"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <input 
                type="text" 
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Feedback/Notes..." 
                className="flex-1 p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>
            <button 
              onClick={handleAttach}
              className="w-full bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
            >
              Attach Proof
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

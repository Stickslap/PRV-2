import { useEffect, useState } from "react";
import { collection, query, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import toast from "react-hot-toast";

export function AdminFAQs() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "faqs"));
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      fetched.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setFaqs(fetched);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "faqs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleUpdate = async (id: string, updates: any) => {
    try {
      await updateDoc(doc(db, "faqs", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      toast.success("FAQ updated");
      fetchFaqs();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "faqs");
      toast.error("Update failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "faqs", id));
      toast.success("FAQ deleted");
      fetchFaqs();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "faqs");
    }
  };

  if (loading) return <div>Loading FAQs...</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8">
      <h2 className="font-headline font-black italic uppercase text-2xl mb-8">FAQ Registry</h2>
      
      <div className="space-y-6">
        {faqs.map(faq => (
          <div key={faq.id} className="border border-gray-100 rounded-xl p-6 bg-gray-50/50">
            <p className="font-bold text-gray-900 mb-2">{faq.question}</p>
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-4">Status: {faq.status}</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const answer = new FormData(e.currentTarget).get("answer") as string;
              handleUpdate(faq.id, { answer, status: "ANSWERED" });
            }}>
              <textarea
                name="answer"
                rows={3}
                defaultValue={faq.answer || ""}
                placeholder="Write your answer..."
                className="w-full p-4 mb-4 border border-gray-200 rounded-xl text-sm"
              />
              <div className="flex gap-4">
                <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold">
                  {faq.status === "PENDING" ? "Publish Answer" : "Update Answer"}
                </button>
                <button type="button" onClick={() => handleDelete(faq.id)} className="bg-red-50 text-red-600 px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold">
                  Delete FAQ
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

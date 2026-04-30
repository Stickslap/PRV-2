import { useEffect, useState } from "react";
import { collection, query, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import toast from "react-hot-toast";

export function AdminFAQs() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

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

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    try {
      const docRef = doc(collection(db, "faqs"));
      await setDoc(docRef, {
        question: newQuestion,
        answer: newAnswer,
        status: newAnswer ? "ANSWERED" : "PENDING",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("FAQ added");
      setNewQuestion("");
      setNewAnswer("");
      setIsAdding(false);
      fetchFaqs();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "faqs");
      toast.error("Failed to add FAQ");
    }
  };

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
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-headline font-black italic uppercase text-2xl">FAQ Registry</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary text-white px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-opacity"
        >
          {isAdding ? "Cancel" : "+ Add FAQ"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddFaq} className="border border-primary/20 rounded-xl p-6 bg-primary/5 mb-8">
          <h3 className="font-bold text-sm mb-4 uppercase tracking-widest text-primary">Create New FAQ</h3>
          <input 
            type="text" 
            placeholder="Question..." 
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="w-full p-4 mb-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
            required
          />
          <textarea 
            placeholder="Answer (optional initially)..." 
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            rows={3}
            className="w-full p-4 mb-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
          />
          <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-opacity">
            Save FAQ
          </button>
        </form>
      )}
      
      <div className="space-y-6">
        {faqs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">No FAQs in registry</p>
            <p className="text-[10px] font-bold text-gray-400 mt-2">Click "+ Add FAQ" to create your first entry.</p>
          </div>
        ) : (
          faqs.map(faq => (
            <div key={faq.id} className="border border-gray-100 rounded-xl p-6 bg-gray-50/50 hover:border-gray-200 transition-colors">
              <input 
                type="text"
                defaultValue={faq.question}
                onBlur={(e) => {
                  if (e.target.value !== faq.question) {
                    handleUpdate(faq.id, { question: e.target.value });
                  }
                }}
                className="w-full font-bold text-gray-900 mb-2 bg-transparent outline-none focus:border-b focus:border-primary border-b border-transparent transition-colors"
              />
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-4">Status: {faq.status}</p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const answer = new FormData(e.currentTarget).get("answer") as string;
                handleUpdate(faq.id, { answer, status: answer.trim() ? "ANSWERED" : "PENDING" });
              }}>
                <textarea
                  name="answer"
                  rows={3}
                  defaultValue={faq.answer || ""}
                  placeholder="Write your answer..."
                  className="w-full p-4 mb-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors"
                />
                <div className="flex gap-4">
                  <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-opacity">
                    {faq.status === "PENDING" ? "Publish Answer" : "Update Answer"}
                  </button>
                  <button type="button" onClick={() => handleDelete(faq.id)} className="bg-red-50 text-red-600 px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold hover:bg-red-100 transition-colors">
                    Delete FAQ
                  </button>
                </div>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

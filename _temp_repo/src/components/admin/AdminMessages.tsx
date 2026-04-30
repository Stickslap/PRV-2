import { useEffect, useState } from "react";
import { collection, query, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "../../lib/firebase";
import toast from "react-hot-toast";

export function AdminMessages() {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "threads"));
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        fetched.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setThreads(fetched);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, "threads");
      } finally {
        setLoading(false);
      }
    };

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchThreads();
      } else {
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!activeThread) return;
    
    const messagesRef = collection(db, `threads/${activeThread}/messages`);
    const q = query(messagesRef);
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `threads/${activeThread}/messages`);
    });

    return () => unsub();
  }, [activeThread]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread) return;
    const content = new FormData(e.currentTarget as HTMLFormElement).get("content") as string;
    if (!content.trim()) return;

    try {
      await addDoc(collection(db, `threads/${activeThread}/messages`), {
        threadId: activeThread,
        senderId: auth.currentUser?.uid,
        content: content.trim(),
        createdAt: serverTimestamp()
      });
      // Optionally update thread status to "OPEN" or something if it was closed
      await updateDoc(doc(db, "threads", activeThread), {
        status: "OPEN",
        updatedAt: serverTimestamp()
      });
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `threads/${activeThread}/messages`);
      toast.error("Failed to send");
    }
  };

  const closeThread = async (id: string) => {
    try {
      await updateDoc(doc(db, "threads", id), { status: "CLOSED", updatedAt: serverTimestamp() });
      setThreads(ts => ts.map(t => t.id === id ? { ...t, status: "CLOSED" } : t));
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, "threads");
    }
  };

  if (loading) return <div>Loading messages...</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex h-[700px]">
      <div className="w-1/3 border-r border-gray-200 bg-gray-50/50 overflow-y-auto p-4 shrink-0">
        <h3 className="font-headline font-black italic uppercase text-lg mb-6">Customer Comm.</h3>
        {threads.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveThread(t.id)}
            className={`w-full text-left p-4 rounded-xl mb-2 transition-colors ${activeThread === t.id ? "bg-white shadow-sm border border-gray-200" : "hover:bg-white border border-transparent"}`}
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-bold text-sm truncate flex-1">{t.subject}</p>
              {t.type === "INQUIRY" && (
                <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded ml-2">INQUIRY</span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 uppercase mt-0.5">
              Ref: {t.userName || t.userId || t.userEmail || "Anonymous"}
            </p>
            <p className={`text-[9px] font-black uppercase mt-2 ${t.status === 'CLOSED' ? 'text-gray-400' : 'text-green-500'}`}>{t.status}</p>
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {activeThread ? (
          <>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <h3 className="font-bold">Thread: {threads.find(t => t.id === activeThread)?.subject}</h3>
              <button onClick={() => closeThread(activeThread)} className="text-[10px] uppercase font-bold text-gray-400 hover:text-red-500">
                Close Thread
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
              {messages.map(m => {
                const isAdmin = m.senderId === auth.currentUser?.uid;
                const senderDisplay = isAdmin ? "You" : (m.senderName || m.senderEmail || "Customer");
                return (
                  <div key={m.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 px-2">{senderDisplay}</span>
                    <div className={`max-w-[75%] p-4 text-sm ${isAdmin ? 'bg-black text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-gray-200 shadow-sm rounded-2xl rounded-tl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleReply} className="p-4 border-t border-gray-100 bg-white flex gap-2">
              <input 
                name="content"
                type="text" 
                placeholder="Type your reply..." 
                className="flex-1 p-3 border border-gray-200 rounded-xl focus:border-primary outline-none text-sm"
                required
              />
              <button className="bg-primary text-white px-6 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 font-bold uppercase text-xs tracking-widest">
            Select a thread to view
          </div>
        )}
      </div>
    </div>
  );
}

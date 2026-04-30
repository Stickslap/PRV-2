import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp } from "lucide-react";

type Tab = "shipping" | "returns" | "legal" | "faq";

interface FAQ {
  id: string;
  question: string;
  answer?: string;
  status: "PENDING" | "ANSWERED";
  createdAt: any;
}

export function Support() {
  const [activeTab, setActiveTab] = useState<Tab>("faq");
  
  // FAQ Data
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // New FAQ form
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const q = query(
          collection(db, "faqs"),
          where("status", "==", "ANSWERED"),
          // Note: we might need a composite index for where + orderBy. We will just fetch and sort locally if not indexed
        );
        const snapshot = await getDocs(q);
        const fetchedFaqs: FAQ[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FAQ));
        
        // Sort locally to avoid needing index
        fetchedFaqs.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA; // newest first
        });
        
        setFaqs(fetchedFaqs);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
        handleFirestoreError(error, OperationType.LIST, "faqs");
      } finally {
        setLoading(false);
      }
    }
    fetchFaqs();
  }, []);

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "faqs"), {
        question: question.trim(),
        status: "PENDING",
        createdAt: serverTimestamp(),
      });
      toast.success("Question submitted! We will answer it soon.");
      setQuestion("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit question.");
      handleFirestoreError(error, OperationType.CREATE, "faqs");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "faq", label: "FAQ & Help" },
    { id: "shipping", label: "Shipping Info" },
    { id: "returns", label: "Returns & Exchanges" },
    { id: "legal", label: "Legal" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-headline font-black uppercase tracking-tighter italic mb-12 text-center text-gray-900">
          Support & Help Center
        </h1>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
          {/* Sidebar Tabs */}
          <div className="md:w-64 bg-gray-50/50 border-r border-gray-100 p-6 space-y-2 shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="p-8 md:p-12 flex-1 min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "shipping" && (
                  <div className="prose prose-sm max-w-none text-gray-600">
                    <h2 className="text-2xl font-headline font-black uppercase tracking-tighter italic text-gray-900 mb-6">Shipping Information</h2>
                    <p>We partner with top carriers to ensure your products arrive safely and efficiently.</p>
                    <h3 className="font-bold text-gray-900 mt-6 mb-2">Processing Times</h3>
                    <p>All orders require 1-3 business days of processing time before they are shipped, as each item goes through our quality assurance checks.</p>
                    <h3 className="font-bold text-gray-900 mt-6 mb-2">Delivery Times</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>Standard Shipping:</strong> 5-7 business days</li>
                      <li><strong>Expedited Shipping:</strong> 2-3 business days</li>
                      <li><strong>International Shipping:</strong> 10-15 business days depending on customs</li>
                    </ul>
                    <p className="mt-6 text-xs text-gray-500">* Delivery times are estimates and may vary based on weather conditions or carrier delays.</p>
                  </div>
                )}

                {activeTab === "returns" && (
                  <div className="prose prose-sm max-w-none text-gray-600">
                    <h2 className="text-2xl font-headline font-black uppercase tracking-tighter italic text-gray-900 mb-6">Returns & Exchanges</h2>
                    <p>We stand behind the quality of our products. If you are not completely satisfied, we are here to help.</p>
                    <h3 className="font-bold text-gray-900 mt-6 mb-2">30-Day Return Policy</h3>
                    <p>You have 30 days from the date of delivery to initiate a return or exchange. Items must be unused, in their original condition, and in the original packaging.</p>
                    <h3 className="font-bold text-gray-900 mt-6 mb-2">How to Initiate</h3>
                    <p>To start a return, please open a support thread in your account dashboard. Our team will provide you with a return authorization and a prepaid shipping label (for domestic orders).</p>
                    <h3 className="font-bold text-gray-900 mt-6 mb-2">Refunds</h3>
                    <p>Once your return is received and inspected, we will notify you and process your refund to the original payment method within 3-5 business days.</p>
                  </div>
                )}

                {activeTab === "legal" && (
                  <div className="prose prose-sm max-w-none text-gray-600">
                    <h2 className="text-2xl font-headline font-black uppercase tracking-tighter italic text-gray-900 mb-6">Legal</h2>
                    <h3 className="font-bold text-gray-900 mt-6 mb-2">Terms of Service</h3>
                    <p>By using our website, you agree to our terms of service which govern your access and use of our platform.</p>
                    <h3 className="font-bold text-gray-900 mt-6 mb-2">Privacy Policy</h3>
                    <p>We respect your privacy and are committed to protecting your personal data. We only collect information necessary to process your orders and improve our service. We do not sell your data to third parties.</p>
                    <h3 className="font-bold text-gray-900 mt-6 mb-2">Copyright</h3>
                    <p>All content on this website, including designs, text, graphics, and logos, is the property of Print Society Co. LLC and is protected by copyright laws.</p>
                  </div>
                )}

                {activeTab === "faq" && (
                  <div>
                    <h2 className="text-2xl font-headline font-black uppercase tracking-tighter italic text-gray-900 mb-6">Frequently Asked Questions</h2>
                    
                    <div className="mb-12">
                      <div className="flex border border-gray-100 rounded-2xl overflow-hidden focus-within:border-black transition-colors focus-within:ring-4 ring-gray-50">
                        <input
                          type="text"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="Have a question? Ask us anything..."
                          className="flex-1 px-6 py-4 focus:outline-none text-sm bg-gray-50/50"
                        />
                        <button
                          onClick={handleQuestionSubmit}
                          disabled={submitting || !question.trim()}
                          className="bg-black text-white px-8 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? "..." : "Submit"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-3 ml-2">Questions will be reviewed and posted here once answered.</p>
                    </div>

                    {loading ? (
                      <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-16 bg-gray-100 rounded-2xl" />
                        ))}
                      </div>
                    ) : faqs.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-100 rounded-2xl">
                        No answered questions yet. Be the first to ask!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {faqs.map((faq) => (
                          <div 
                            key={faq.id} 
                            className="border border-gray-100 rounded-2xl overflow-hidden bg-white hover:border-gray-200 transition-colors"
                          >
                            <button
                              onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                              className="w-full flex items-center justify-between p-6 text-left"
                            >
                              <span className="font-bold text-gray-900 pr-8">{faq.question}</span>
                              {expandedFaq === faq.id ? (
                                <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                              )}
                            </button>
                            {expandedFaq === faq.id && faq.answer && (
                              <div className="px-6 pb-6 pt-2 text-gray-600 prose prose-sm">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                  {faq.answer}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

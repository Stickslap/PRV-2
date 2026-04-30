import { motion } from "motion/react";
import { Mail, Phone, MapPin, Instagram, Twitter, Upload, MessageSquare, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";

export function Contact() {
  const [settings, setSettings] = useState<any>({
    contactEmail: "print@printsocietyco.com",
    contactPhone: "405-510-8669",
    contactAddress: "HQ & Lab",
    officeHoursMonFri: "9:00 AM — 6:00 PM PST",
    officeHoursSat: "10:00 AM — 2:00 PM PST",
    officeHoursSun: "Closed",
    instagramUrl: "#",
    twitterUrl: "#",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists() && snap.data().content) {
          const content = JSON.parse(snap.data().content);
          setSettings((prev: any) => ({ ...prev, ...content }));
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    
    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const subject = fd.get("subject") as string;
    const message = fd.get("message") as string;

    try {
      // Create a thread for this inquiry
      const threadRef = await addDoc(collection(db, "threads"), {
        userEmail: email,
        userName: name,
        subject: `Contact Inquiry: ${subject}`,
        type: "INQUIRY",
        status: "OPEN",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Add the first message
      await addDoc(collection(db, `threads/${threadRef.id}/messages`), {
        threadId: threadRef.id,
        content: message,
        senderEmail: email,
        senderName: name,
        createdAt: serverTimestamp()
      });

      setSubmitted(true);
      toast.success("Inquiry received. We'll be in touch!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send inquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white pt-24 pb-20 px-6 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-4xl font-headline font-black uppercase italic tracking-tighter">Mission Received.</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Your inquiry has been logged in our system. A Print Society Co. representative will review your request and get back to you shortly.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="text-primary font-black uppercase tracking-widest text-xs hover:underline"
          >
            Send another message
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-12">
            
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-6">Direct Lines</h3>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-gray-700" />
                </div>
                <div className="pt-1">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Support & Sales</p>
                  <p className="text-sm font-bold text-black">{settings.contactEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-gray-700" />
                </div>
                <div className="pt-1">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Call the Shop</p>
                  <p className="text-sm font-bold text-black">{settings.contactPhone}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{settings.contactAddress}</p>
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-gray-50/50 border border-gray-200 rounded-3xl p-6 md:p-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-black mb-6">Office Hours</h3>
              <div className="space-y-3 text-xs md:text-sm font-medium">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Mon — Fri</span>
                  <span className="text-black font-bold">{settings.officeHoursMonFri}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Saturday</span>
                  <span className="text-black font-bold">{settings.officeHoursSat}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Sunday</span>
                  <span className="text-primary font-black uppercase tracking-wider text-xs">{settings.officeHoursSun}</span>
                </div>
              </div>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-4">
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-400 transition-colors">
                <Instagram className="w-5 h-5 text-gray-700" />
              </a>
              <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-400 transition-colors">
                <Twitter className="w-5 h-5 text-gray-700" />
              </a>
            </div>

          </div>

          {/* Right Column (Form) */}
          <div className="lg:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] rounded-[2.5rem] p-8 md:p-12"
            >
              <form className="space-y-8" onSubmit={handleSubmit}>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Identity</label>
                    <input 
                      name="name"
                      type="text" 
                      required
                      placeholder="Full Name" 
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black focus:border-black outline-none transition-colors placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Return Email</label>
                    <input 
                      name="email"
                      type="email" 
                      required
                      placeholder="Email Address" 
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black focus:border-black outline-none transition-colors placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Reason For Contact</label>
                  <select name="subject" required className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black focus:border-black outline-none transition-colors cursor-pointer">
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Order Status">Order Status</option>
                    <option value="Custom Quote">Custom Quote</option>
                    <option value="Artwork Support">Artwork Support</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Inquiry Details</label>
                  <textarea 
                    name="message"
                    required
                    rows={6}
                    placeholder="How can we help? Please include order numbers if applicable." 
                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-sm font-medium text-black focus:border-black outline-none transition-colors placeholder:text-gray-400 resize-none"
                  ></textarea>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Attachments (Artwork / References)</label>
                  <div className="w-full border border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50/30 hover:bg-gray-50/80 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 mb-3 text-gray-500 group-hover:text-black transition-colors flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-black text-black uppercase tracking-tight mb-1">Click to Upload Files</span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">PDF, AI, PNG, or SVG (Max 10MB)</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0a0a0f] text-white py-5 rounded-2xl font-headline font-black uppercase tracking-[0.2em] italic text-[13px] hover:bg-black/80 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" /> {loading ? "SENDING..." : "SEND INQUIRY —"}
                </button>

              </form>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Instagram, Twitter, Facebook, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState, FormEvent } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import axios from "axios";
import { toast } from "react-hot-toast";

export function Footer() {
  const [footerLinks, setFooterLinks] = useState<{label: string, url: string}[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch Mega Menu links from Firebase
    getDoc(doc(db, "settings", "global")).then(snap => {
      if (snap.exists() && snap.data().content) {
        const content = JSON.parse(snap.data().content);
        if (content.footerLinks) {
          const links = content.footerLinks.split('\n').filter((l: string) => l.includes(',')).map((line: string) => {
            const [label, url] = line.split(',');
            return { label: label.trim(), url: url.trim() };
          });
          setFooterLinks(links);
        }
      }
    }).catch(e => console.error("Failed to load footer settings", e));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const response = await axios.post("/api/newsletter/subscribe", { email });
      if (response.data.success) {
        toast.success("Welcome to the society!");
        setEmail("");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Subscription failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-gray-50 text-gray-900 pt-20 pb-10 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-3xl font-headline font-black italic mb-6">Join the society</h2>
            <p className="text-gray-500 mb-8 max-w-sm text-sm font-medium">Get exclusive drops, early access to limited edition stickers, and a bit of street soul in your inbox.</p>
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="EMAIL@EXAMPLE.COM" 
                required
                className="flex-1 bg-white border border-gray-200 px-4 py-3 text-xs font-bold tracking-widest focus:outline-none focus:border-primary transition-colors rounded-xl"
              />
              <button 
                type="submit"
                disabled={loading}
                className="bg-primary text-white px-6 py-3 font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-all flex items-center gap-2 rounded-xl disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join"} <ArrowRight className="w-3 h-3" />
              </button>
            </form>
          </div>
          
          <div>
            <h4 className="font-headline text-xs font-black mb-6 uppercase tracking-widest text-gray-400">Support</h4>
            <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-gray-600">
              <li><Link to="/support" className="hover:text-primary transition-colors">Shipping Info</Link></li>
              <li><Link to="/support" className="hover:text-primary transition-colors">Returns & Exchanges</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/support" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/admin" className="hover:text-primary transition-colors border-t border-gray-200 mt-4 pt-4 block opacity-50">Staff Terminal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline text-xs font-black mb-6 uppercase tracking-widest text-gray-400">External Links</h4>
            <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-gray-600">
              {footerLinks.map((link, idx) => (
                <li key={idx}><a href={link.url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">{link.label}</a></li>
              ))}
              {footerLinks.length === 0 && (
                <li><Link to="/support" className="hover:text-primary transition-colors">Legal Info</Link></li>
              )}
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src="https://res.cloudinary.com/dabgothkm/image/upload/v1777400052/favicon55_xsors2.png" 
              alt="Print Society Co. Logo" 
              className="h-8 w-auto group-hover:scale-105 transition-transform" 
            />
          </Link>
          <div className="flex gap-6 text-gray-400">
            <a href="#" className="hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></a>
            <a href="#" className="hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></a>
            <a href="#" className="hover:text-primary transition-colors"><Facebook className="w-5 h-5" /></a>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">© 2026 PRINT SOCIETY CO. | ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  );
}

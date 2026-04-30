import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!res.ok) {
        if (data.help) toast.error(data.help, { duration: 6000 });
        throw new Error(data.error || "Login failed");
      }

      if (data.email) {
        login(data.email, data.firstName, data.lastName);
      }

      toast.success("VERIFICATION SUCCESSFUL");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/customer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate password reset");
      toast.success("Password reset instructions requested.");
      setIsForgotPassword(false);
    } catch (err: any) {
      toast.error(err.message || "Could not process password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-y-auto overflow-x-hidden selection:bg-white selection:text-black">
      {/* Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-black/50 z-10" />
        <iframe
          src="https://www.youtube.com/embed/MJ9JaM7tI3w?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=MJ9JaM7tI3w&playsinline=1"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-[177.77vh] h-[56.25vw] opacity-100 select-none"
          allow="autoplay; encrypted-media"
          tabIndex={-1}
        />
      </div>

      <Link to="/" className="absolute top-8 left-8 z-50 flex items-center gap-3 text-white/60 hover:text-white transition-colors group">
        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="font-bold text-xs uppercase tracking-[0.2em]">Return to Shop</span>
      </Link>

      <div className="relative z-10 w-full px-4 py-12 flex flex-col items-center justify-center min-h-screen">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          {/* Sign In Form */}
          <div className="p-8 md:p-10 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
             <div className="text-center mb-10">
                <h1 className="text-4xl font-headline font-black uppercase tracking-tighter text-white italic">Login</h1>
             </div>

             {isForgotPassword ? (
               <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="flex flex-col gap-4 pt-2">
                     <button 
                       type="submit" 
                       disabled={loading}
                       className="w-full bg-primary text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                     >
                       {loading ? "Sending..." : "Reset Password"}
                     </button>
                     <button 
                       type="button"
                       onClick={() => setIsForgotPassword(false)}
                       className="text-[10px] font-bold text-white/50 hover:text-white uppercase tracking-widest transition-colors"
                     >
                       Back to sign in
                     </button>
                  </div>
               </form>
             ) : (
               <form onSubmit={handleAuth} className="space-y-6">
                  <div>
                     <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Email</label>
                     <input 
                       type="email" 
                       required
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all"
                       placeholder="you@example.com"
                     />
                  </div>
                  <div>
                     <div className="flex justify-between items-center mb-3">
                       <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Password</label>
                       <button 
                         type="button"
                         onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); }}
                         className="text-[10px] font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest"
                       >
                         Forgot?
                       </button>
                     </div>
                     <input 
                       type="password" 
                       required
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all"
                       placeholder="••••••••"
                     />
                  </div>
                  <div className="pt-4">
                     <button 
                       type="submit" 
                       disabled={loading}
                       className="w-full bg-primary text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 shadow-[0_20px_40px_-10px_rgba(124,58,237,0.4)]"
                     >
                       {loading ? "Verifying..." : "Sign in"}
                     </button>
                  </div>
                  
                  <div className="text-center pt-8 border-t border-white/5">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                      New Here? <Link to="/signup" className="text-white hover:text-primary transition-colors">Create Account</Link>
                    </p>
                  </div>
               </form>
             )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

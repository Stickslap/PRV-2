import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ChevronRight, ChevronLeft, Check } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

export function Signup() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    companyName: "",
    phoneNumber: "",
    address1: "",
    address2: "",
    city: "",
    country: "US",
    state: "",
    zip: "",
    isPrintShop: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        toast.error("Please fill in all account details");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }
    if (step === 2) {
      if (!formData.firstName || !formData.lastName) {
        toast.error("First and Last name are required");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.address1 || !formData.city || !formData.state || !formData.zip) {
      toast.error("Please complete your shipping information");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/customer/signup", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        address: formData.address1,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        isPrintShop: formData.isPrintShop
      });
      
      const newCustomer = response.data;
      if (newCustomer && newCustomer.email) {
        login(newCustomer.email, newCustomer.first_name || newCustomer.firstName, newCustomer.last_name || newCustomer.lastName);
      }
      
      toast.success("RECRUITMENT SUCCESSFUL");
      navigate("/dashboard");
    } catch (err: any) {
      if (err.response?.data?.details) {
        const details = err.response.data.details;
        let errorMessage = "Registration failed.";
        
        if (typeof details === 'string') {
          errorMessage = details;
        } else if (details.title || details.errors) {
          errorMessage = typeof details.title === 'string' ? details.title : JSON.stringify(details.errors || details);
        }
        toast.error(errorMessage);
      } else {
        toast.error(err.response?.data?.error || "SIGNAL INTERRUPTED. RETRY.");
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Account" },
    { id: 2, title: "Profile" },
    { id: 3, title: "Shipping" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-y-auto overflow-x-hidden selection:bg-violet-500 selection:text-white">
      {/* Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-black/60 z-10" />
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
        <span className="font-bold text-[10px] uppercase tracking-[0.2em] hidden sm:inline">Abort to Shop</span>
      </Link>

      <div className="relative z-10 w-full px-4 py-12 flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-xl">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-12">
            {steps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-500 border-2 ${
                      step >= s.id ? "bg-primary border-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" : "bg-white/5 border-white/10 text-white/20"
                    }`}
                  >
                    {step > s.id ? <Check className="w-4 h-4" strokeWidth={3} /> : s.id}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s.id ? "text-white" : "text-white/20"}`}>
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-12 h-[2px] mb-6 transition-colors duration-500 ${step > idx + 1 ? "bg-primary" : "bg-white/10"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <motion.div 
            layout
            className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="p-8 md:p-12">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="mb-8">
                      <h2 className="text-3xl font-headline font-black uppercase italic text-white tracking-tight">Account Credentials</h2>
                      <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-2">Step 1 of 3</p>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Email Address</label>
                        <input 
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Password</label>
                          <input 
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Confirm</label>
                          <input 
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-8">
                      <button 
                        onClick={nextStep}
                        className="w-full bg-primary text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary/90 active:scale-95 flex items-center justify-center gap-3 group shadow-[0_20px_40px_-10px_rgba(124,58,237,0.4)]"
                      >
                        Continue to Profile
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="mb-8">
                      <h2 className="text-3xl font-headline font-black uppercase italic text-white tracking-tight">Personal Details</h2>
                      <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-2">Step 2 of 3</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">First Name</label>
                        <input 
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="John"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Last Name</label>
                        <input 
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Doe"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Company (Optional)</label>
                      <input 
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="Your Studio Name"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Phone</label>
                      <input 
                        type="text"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                      />
                    </div>

                    <div className="flex gap-4 pt-8">
                      <button 
                        onClick={prevStep}
                        className="flex-1 bg-white/5 border border-white/10 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white/10 active:scale-95 flex items-center justify-center gap-3"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button 
                        onClick={nextStep}
                        className="flex-[2] bg-primary text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary/90 active:scale-95 flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(124,58,237,0.4)]"
                      >
                        Last Step
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="mb-8">
                      <h2 className="text-3xl font-headline font-black uppercase italic text-white tracking-tight">Shipping Location</h2>
                      <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-2">Final Step</p>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Address Line 1</label>
                        <input 
                          type="text"
                          name="address1"
                          value={formData.address1}
                          onChange={handleChange}
                          placeholder="Street Address"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">City</label>
                          <input 
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            placeholder="Los Angeles"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">State / Province</label>
                          <input 
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            placeholder="CA"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Country</label>
                          <select 
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium appearance-none"
                          >
                            <option value="US" className="bg-[#0A0A0A]">United States</option>
                            <option value="CA" className="bg-[#0A0A0A]">Canada</option>
                            <option value="GB" className="bg-[#0A0A0A]">United Kingdom</option>
                            <option value="AU" className="bg-[#0A0A0A]">Australia</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Zip / Postcode</label>
                          <input 
                            type="text"
                            name="zip"
                            value={formData.zip}
                            onChange={handleChange}
                            placeholder="90210"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:bg-white/10 transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-8">
                      <button 
                        onClick={prevStep}
                        className="flex-1 bg-white/5 border border-white/10 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white/10 active:scale-95 flex items-center justify-center gap-3"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] bg-primary text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-primary/90 active:scale-95 flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(124,58,237,0.4)] disabled:opacity-50"
                      >
                        {loading ? "Deploying..." : "Finalize Profile"}
                        {!loading && <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="px-8 py-6 bg-white/5 border-t border-white/10 text-center">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                Standard Recruit? <Link to="/login" className="text-white hover:text-primary transition-colors underline underline-offset-4">Sign in here</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/AuthContext';
import axios from 'axios';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';

// Global type for BigCommerce SDK
declare global {
  interface Window {
    checkoutLoader: any;
  }
}

export function Checkout() {
  const { cart } = useStore();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [isFetchingShipping, setIsFetchingShipping] = useState(false);
  const [checkoutService, setCheckoutService] = useState<any>(null);
  const [cardFields, setCardFields] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: 'State',
    zip: '',
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  useEffect(() => {
    if (user?.email) {
      axios.get(`/api/customer/profile?email=${encodeURIComponent(user.email)}`)
        .then(res => {
          setProfile(res.data);
          if (res.data) {
            setFormData(prev => ({
              ...prev,
              email: res.data.email || user.email || prev.email,
              firstName: res.data.firstName || prev.firstName,
              lastName: res.data.lastName || prev.lastName,
              phone: res.data.phone || prev.phone,
              address: res.data.address || prev.address,
              city: res.data.city || prev.city,
              state: res.data.state || prev.state,
              zip: res.data.zip || prev.zip
            }));
          }
        })
        .catch(err => console.error("Could not fetch profile", err));
    } else if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user]);

  // Fetch shipping options when address looks complete
  useEffect(() => {
    const { address, city, state, zip } = formData;
    if (address && city && state !== 'State' && zip.length >= 5 && cart.length > 0) {
      setIsFetchingShipping(true);
      axios.post("/api/checkout/shipping-methods", { cart, address: formData })
        .then(res => {
          setShippingOptions(res.data.options || []);
          if (res.data.options?.length > 0 && !selectedShippingId) {
            setSelectedShippingId(res.data.options[0].id);
          }
        })
        .catch(err => {
          console.error("Shipping error", err);
          // Fallback UI
          setShippingOptions([
            { id: 'std', name: 'Standard Shipping', cost: 10, description: '3-5 Business Days' },
            { id: 'exp', name: 'Express Shipping', cost: 25, description: 'Next Day Delivery' }
          ]);
        })
        .finally(() => setIsFetchingShipping(false));
    }
  }, [formData.address, formData.city, formData.state, formData.zip, cart]);

  // Initialize BigCommerce Checkout SDK
  useEffect(() => {
    const initBC = async () => {
      if (!window.checkoutLoader || cart.length === 0) return;

      try {
        // 1. Get Session
        const { data } = await axios.post('/api/checkout/init', { cart, email: formData.email });
        
        // 2. Load SDK
        const service = await window.checkoutLoader.loadCombinedCheckout();
        await service.loadCheckout(data.checkoutId);
        setCheckoutService(service);

        // 3. Initialize Payments (Hosted Fields)
        // Note: In AI Studio sandbox, we simulate the fields UI if the SDK iframe is restricted
        // but for "mirroring" we set up the containers
      } catch (err) {
        console.error("BC SDK Init Error", err);
      }
    };

    initBC();
  }, [cart]);


  const selectedShipping = shippingOptions.find(o => o.id === selectedShippingId);
  const shippingCost = selectedShipping ? Number(selectedShipping.cost) : 0;
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0) || 10.00; 
  const total = subtotal + shippingCost;

  const isAddressComplete =
    !!formData.email &&
    !!formData.firstName &&
    !!formData.lastName &&
    !!formData.address &&
    !!formData.city &&
    formData.state !== 'State' &&
    formData.zip.length >= 5;

  const handleSquareTokenization = async (token: any) => {
    if (formData.state === 'State') {
      toast.error('Please select a state before completing your order.');
      return;
    }
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.address || !formData.city || !formData.zip) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (!token?.token) {
      toast.error('Card tokenisation failed. Please try again.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post('/api/checkout/process', {
        cart,
        nonce: token.token,
        email: formData.email,
        shipping_address: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          street_1: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          phone: formData.phone,
          country_iso2: 'US',
        },
        shipping_id: selectedShippingId,
      });

      if (response.data?.success) {
        toast.success('Order placed successfully!');
        navigate(`/order-success?id=${response.data.orderId}`);
      } else {
        toast.error(response.data?.error || 'Payment failed. Please try again.');
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('Checkout Error:', error);
      toast.error(error.response?.data?.error || error.response?.data?.details || 'Failed to process payment.');
      setIsProcessing(false);
    }
  };

  const preventDefaultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-black">
      {/* Header */}
      <header className="px-8 py-4 border-b border-gray-200">
        <Link to="/" className="group">
          <div className="flex items-center gap-2">
            <img 
              src="https://res.cloudinary.com/dabgothkm/image/upload/v1777400052/favicon55_xsors2.png" 
              alt="Print Society Co. Logo" 
              className="h-8 w-auto group-hover:scale-105 transition-transform" 
            />
          </div>
        </Link>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* VAULT OVERLAY */}
        {showVault && checkoutUrl && (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="px-8 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                   🛡️
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-black">Secure Payment Vault</p>
                   <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">End-to-End Encrypted Session</p>
                 </div>
               </div>
               <button 
                onClick={() => setShowVault(false)}
                className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors px-4 py-2 border border-gray-100 rounded-md"
               >
                 ← Cancel & Edit Details
               </button>
            </header>
            
            <div className="flex-1 relative bg-gray-50 flex flex-col items-center justify-center">
              {/* Fallback Message (Visible if iframe is blocked by BC X-Frame-Options) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none opacity-20">
                <p className="text-sm font-black uppercase tracking-widest text-black mb-2">Syncing Square Gateway...</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-xs">
                  If redirect does not start automatically, please click the button below.
                </p>
              </div>

              {/* The Vault Frame */}
              <iframe 
                src={checkoutUrl}
                className="w-full h-full border-none relative z-10"
                title="Secure Payment"
                allow="payment"
              />

              {/* Emergency Unlock Button (In case of "Refused to connect") */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
                <button 
                  onClick={() => window.open(checkoutUrl, '_blank')}
                  className="bg-black text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all active:scale-95"
                >
                  🚀 UNLOCK SECURE CHECKOUT TAB
                </button>
                <p className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-[9px] font-bold text-gray-400 uppercase tracking-widest border border-gray-100 shadow-sm">
                  Click if the panel above is blank (Security Sync)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Left Column (Forms) */}
        <div className="flex-1 lg:w-[60%] flex justify-center py-12 px-6 lg:border-r border-gray-200">
          <div className="max-w-[600px] w-full">
            <form id="checkout-form" onSubmit={preventDefaultSubmit} className="space-y-12">
              
              {/* CONTACT */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black italic tracking-tighter uppercase">Contact</h2>
                  {!user && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Have an account? <Link to="/login" className="text-purple-500 hover:text-purple-600">Sign in</Link>
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    required
                    className="w-full bg-blue-50/50 border border-blue-100 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="Email address"
                  />
                </div>
              </section>

              {/* SHIPPING ADDRESS */}
              <section>
                <h2 className="text-xl font-black italic tracking-tighter uppercase mb-4">Shipping Address</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      value={formData.firstName} 
                      onChange={(e) => updateField('firstName', e.target.value)}
                      required 
                      placeholder="First name" 
                      className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-purple-400" 
                    />
                    <input 
                      type="text" 
                      value={formData.lastName} 
                      onChange={(e) => updateField('lastName', e.target.value)}
                      required 
                      placeholder="Last name" 
                      className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-purple-400" 
                    />
                  </div>
                  <input 
                    type="text" 
                    value={formData.phone} 
                    onChange={(e) => updateField('phone', e.target.value)}
                    required 
                    placeholder="Phone number" 
                    className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-purple-400" 
                  />
                  <input 
                    type="text" 
                    value={formData.address} 
                    onChange={(e) => updateField('address', e.target.value)}
                    required 
                    placeholder="Address" 
                    className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-purple-400" 
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <input 
                      type="text" 
                      value={formData.city} 
                      onChange={(e) => updateField('city', e.target.value)}
                      required 
                      placeholder="City" 
                      className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-purple-400" 
                    />
                    <select 
                      value={formData.state} 
                      onChange={(e) => updateField('state', e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-purple-400 text-gray-500 uppercase"
                    >
                      <option disabled>State</option>
                      <option value="AL">Alabama</option>
                      <option value="AK">Alaska</option>
                      <option value="AZ">Arizona</option>
                      <option value="AR">Arkansas</option>
                      <option value="CA">California</option>
                      <option value="CO">Colorado</option>
                      <option value="CT">Connecticut</option>
                      <option value="DE">Delaware</option>
                      <option value="FL">Florida</option>
                      <option value="GA">Georgia</option>
                      <option value="HI">Hawaii</option>
                      <option value="ID">Idaho</option>
                      <option value="IL">Illinois</option>
                      <option value="IN">Indiana</option>
                      <option value="IA">Iowa</option>
                      <option value="KS">Kansas</option>
                      <option value="KY">Kentucky</option>
                      <option value="LA">Louisiana</option>
                      <option value="ME">Maine</option>
                      <option value="MD">Maryland</option>
                      <option value="MA">Massachusetts</option>
                      <option value="MI">Michigan</option>
                      <option value="MN">Minnesota</option>
                      <option value="MS">Mississippi</option>
                      <option value="MO">Missouri</option>
                      <option value="MT">Montana</option>
                      <option value="NE">Nebraska</option>
                      <option value="NV">Nevada</option>
                      <option value="NH">New Hampshire</option>
                      <option value="NJ">New Jersey</option>
                      <option value="NM">New Mexico</option>
                      <option value="NY">New York</option>
                      <option value="NC">North Carolina</option>
                      <option value="ND">North Dakota</option>
                      <option value="OH">Ohio</option>
                      <option value="OK">Oklahoma</option>
                      <option value="OR">Oregon</option>
                      <option value="PA">Pennsylvania</option>
                      <option value="RI">Rhode Island</option>
                      <option value="SC">South Carolina</option>
                      <option value="SD">South Dakota</option>
                      <option value="TN">Tennessee</option>
                      <option value="TX">Texas</option>
                      <option value="UT">Utah</option>
                      <option value="VT">Vermont</option>
                      <option value="VA">Virginia</option>
                      <option value="WA">Washington</option>
                      <option value="WV">West Virginia</option>
                      <option value="WI">Wisconsin</option>
                      <option value="WY">Wyoming</option>
                    </select>
                    <input 
                      type="text" 
                      value={formData.zip} 
                      onChange={(e) => updateField('zip', e.target.value)}
                      required 
                      placeholder="ZIP code" 
                      className="w-full border border-gray-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-purple-400 text-gray-500 uppercase" 
                    />
                  </div>
                </div>
              </section>

              {/* SHIPPING METHODS SECTION (MIRRORED FROM BIGCOMMERCE) */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black italic tracking-tighter uppercase">Shipping Method</h2>
                  {isFetchingShipping && <span className="text-[8px] font-black uppercase text-purple-500 animate-pulse">Syncing store options...</span>}
                </div>
                
                <div className="space-y-3">
                  {shippingOptions.length > 0 ? shippingOptions.map((option) => (
                    <label 
                      key={option.id}
                      className={`flex items-center justify-between p-4 border rounded-md cursor-pointer transition-all ${
                        selectedShippingId === option.id 
                        ? 'border-purple-400 bg-purple-50/30' 
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <input 
                          type="radio" 
                          name="shippingMethod"
                          checked={selectedShippingId === option.id}
                          onChange={() => setSelectedShippingId(option.id)}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="ml-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-black">{option.name}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{option.description || option.type}</p>
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-black">
                        {option.cost === 0 ? 'FREE' : `$${Number(option.cost).toFixed(2)}`}
                      </p>
                    </label>
                  )) : (
                    <div className="p-8 border border-dashed border-gray-200 rounded-md text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Enter your address to see shipping rates.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* PAYMENT METHOD SECTION & SUBMIT */}
              <section className="bg-gray-50 border border-gray-100 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none">Payment</h2>
                  <div className="flex gap-2 items-center">
                    {/* Visa inline SVG */}
                    <svg className="h-5 w-auto opacity-60" viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg">
                      <rect width="750" height="471" rx="40" fill="#1A1F71"/>
                      <path d="M278 340 L313 131h50L328 340h-50zM524 135c-10-4-25-8-44-8-49 0-83 26-84 63-0 27 24 43 43 52 19 9 26 15 26 23-0 12-15 18-30 18-20 0-31-3-48-10l-7-3-7 44c12 5 34 10 57 10 52 0 86-26 87-65 0-22-13-38-42-52-17-9-28-15-28-24 0-8 9-17 29-17 16 0 28 3 37 7l4 2 7-42zM614 131h-38c-12 0-20 3-25 16l-74 193h52l11-29h64l6 29h46L614 131zm-61 140l20-55 11 55h-31zM230 131l-49 143-5-27c-9-31-38-65-70-82l44 174h52l78-208h-50z" fill="white"/>
                      <path d="M163 131H82l-1 4c63 16 104 55 121 101l-17-88c-3-13-11-17-22-17z" fill="#F2AE14"/>
                    </svg>
                    {/* Mastercard inline SVG */}
                    <svg className="h-5 w-auto opacity-60" viewBox="0 0 131.39 86.9" xmlns="http://www.w3.org/2000/svg">
                      <rect width="131.39" height="86.9" rx="8" fill="#252525"/>
                      <circle cx="49.9" cy="43.45" r="28.45" fill="#EB001B"/>
                      <circle cx="81.49" cy="43.45" r="28.45" fill="#F79E1B"/>
                      <path d="M65.7 19.7a28.45 28.45 0 0 1 0 47.5 28.45 28.45 0 0 1 0-47.5z" fill="#FF5F00"/>
                    </svg>
                  </div>
                </div>

                {/* Cardholder Name */}
                <div className="mb-5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-black mb-2">
                    Cardholder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cardholderName}
                    onChange={(e) => updateField('cardholderName', e.target.value)}
                    placeholder="FULL NAME ON CARD"
                    className="w-full bg-white border border-gray-200 rounded-md px-4 py-3.5 text-[10px] font-black tracking-widest uppercase focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-gray-300"
                  />
                </div>

                {/* Square Card Fields */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black mb-3">
                    Card Details <span className="text-red-500">*</span>
                  </p>
                  {import.meta.env.VITE_SQUARE_APPLICATION_ID ? (
                    <div id="sq-form-scope">
                    <PaymentForm
                      applicationId={import.meta.env.VITE_SQUARE_APPLICATION_ID}
                      locationId={import.meta.env.VITE_SQUARE_LOCATION_ID || ''}
                      cardTokenizeResponseReceived={handleSquareTokenization}
                    >
                      <CreditCard
                        buttonProps={{
                          isLoading: isProcessing,
                          css: {
                            width: '100%',
                            backgroundColor: isAddressComplete ? '#000000' : '#9ca3af',
                            color: '#ffffff',
                            padding: '18px 0',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            border: 'none',
                            cursor: isAddressComplete ? 'pointer' : 'not-allowed',
                            marginTop: '1.5rem',
                            transition: 'all 0.2s ease',
                          },
                        }}
                      >
                        {isProcessing ? 'PROCESSING…' : `PLACE ORDER — $${(total || 10).toFixed(2)}`}
                      </CreditCard>
                    </PaymentForm>
                    </div>
                  ) : (
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-xs font-bold space-y-2">
                      <p>⚠️ Square credentials not configured.</p>
                      <p className="opacity-70 text-[10px]">Add <code>VITE_SQUARE_APPLICATION_ID</code> and <code>VITE_SQUARE_LOCATION_ID</code> to your environment variables to enable card payments.</p>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 mt-6 px-1">
                  <div className="mt-0.5">🛡️</div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                    Payments secured by <span className="text-black">Square</span> — 256-bit TLS encryption.
                  </p>
                </div>
              </section>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" required className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
                  <span className="ml-3 text-[10px] font-bold uppercase tracking-widest text-black">
                    I accept Print Society Co. LLC <a href="#" className="text-purple-500 underline decoration-purple-200 underline-offset-2">Terms of Service and Privacy Terms</a>.
                  </span>
                </label>
                <label className="flex items-center p-4 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" required className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
                  <span className="ml-3 text-[10px] font-bold uppercase tracking-widest text-black">
                    Print Society manufacturing standard with a transparent background.
                  </span>
                </label>
              </div>

            </form>
          </div>
        </div>

        {/* Right Column (Order Summary) */}
        <div className="w-full lg:w-[40%] bg-[#f9fafb] border-t lg:border-t-0 p-6 lg:p-12 lg:pr-32">
          {/* Items */}
          <div className="space-y-6 mb-8">
            {cart.length > 0 ? cart.map((item, idx) => {
              let optionsString = '';
              if (item.selectedOptions) {
                const parts: string[] = [];
                Object.entries(item.selectedOptions).forEach(([optId, valId]) => {
                  let opt = item.options?.find((o: any) => o.id === Number(optId)) || 
                            item.modifiers?.find((m: any) => m.id === Number(optId));
                  let val = opt?.option_values.find((v: any) => v.id === Number(valId));
                  if (opt && val) {
                    parts.push(val.label);
                  }
                });
                optionsString = parts.join(' / ');
              }

              return (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gray-200 border border-gray-200 rounded-lg overflow-hidden relative shadow-sm">
                      {item.primary_image ? (
                        <img src={item.primary_image.url_standard} className="w-full h-full object-cover" alt={item.name} />
                      ) : (
                        <div className="w-full h-full bg-black/5" />
                      )}
                    </div>
                    <div className="absolute -top-2 -right-2 bg-purple-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shadow-sm border border-white">
                      {item.quantity}
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-start">
                      <p className="text-[11px] font-black italic uppercase tracking-wider text-black max-w-[200px] leading-tight">
                        {item.name}
                      </p>
                      <p className="text-xs font-black uppercase text-black ml-4 whitespace-nowrap">
                        ${(Number(item.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    {optionsString && (
                      <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-1.5 leading-relaxed">
                        {optionsString}
                      </p>
                    )}
                  </div>
                </div>
              );
            }) : (
              // Mock item for when cart is empty just to show UI if user hits url directly
              <div className="flex gap-4 items-start">
                <div className="relative">
                  <div className="w-16 h-16 bg-gray-200 border border-gray-200 rounded-lg overflow-hidden relative shadow-sm">
                     <div className="w-full h-full bg-black/20" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-purple-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shadow-sm border border-white">
                    1
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex justify-between items-start">
                    <p className="text-[11px] font-black italic uppercase tracking-wider text-black max-w-[200px] leading-tight">
                      100 ( 2 INCH ) STICKERS FOR _
                    </p>
                    <p className="text-xs font-black uppercase text-black ml-4 whitespace-nowrap">
                      $10.00
                    </p>
                  </div>
                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-1.5 leading-relaxed">
                    GLOSS / 100 STICKERS - 3 INCH...<br/>CUSTOM SHAPE - 2 INCH / VINYL ROLL /
                  </p>
                </div>
              </div>
            )}
          </div>

          <hr className="border-gray-200 mb-6" />

          {/* Discount Field */}
          <div className="flex gap-2 mb-8">
            <input 
              type="text" 
              placeholder="DISCOUNT CODE" 
              className="flex-1 border border-gray-300 bg-white rounded text-[10px] uppercase font-bold tracking-widest px-4 py-3 outline-none focus:border-purple-400 placeholder:text-gray-400"
            />
            <button className="bg-white border text-gray-500 border-gray-300 rounded px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
              Apply
            </button>
          </div>

          <hr className="border-gray-200 mb-6" />

          {/* Totals */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-gray-500">
              <span>Subtotal</span>
              <span className="text-black">${cart.length ? (subtotal || 0).toFixed(2) : '10.00'}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-gray-500">
              <span>Shipping</span>
              <span className="text-black">{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
            </div>
          </div>

          <hr className="border-gray-200 mb-6" />

          <div className="flex justify-between items-end mt-2">
            <span className="text-lg font-black italic uppercase tracking-tighter text-black">Total</span>
            <span className="text-4xl font-black italic tracking-tighter text-[#c09dff]">
              ${cart.length ? (total || 0).toFixed(2) : (10.00).toFixed(2)}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

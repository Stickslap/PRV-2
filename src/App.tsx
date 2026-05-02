import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { ProductList } from "./pages/ProductList";
import { ProductDetail } from "./pages/ProductDetail";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Dashboard } from "./pages/Dashboard";
import { Admin } from "./pages/Admin";
import { AdminLogin } from "./pages/AdminLogin";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Contact } from "./pages/Contact";
import { About } from "./pages/About";
import { TrackOrder } from "./pages/TrackOrder";
import { Journal } from "./pages/Journal";
import { OrderSuccess } from "./pages/OrderSuccess";
import { Support } from "./pages/Support";
import { Toaster } from "react-hot-toast";

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/checkout', '/admin/login'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {!isAuthPage && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/support" element={<Support />} />
          <Route path="/order-success" element={<OrderSuccess />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
      <Toaster position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

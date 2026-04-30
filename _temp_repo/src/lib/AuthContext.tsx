import { createContext, useContext, useEffect, useState } from 'react';

interface CustomUser {
  email: string | null;
  displayName: string | null;
  uid: string;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  login: (email: string, firstName?: string, lastName?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  login: () => {}, 
  logout: () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const email = localStorage.getItem("printsociety_customer_email");
      const name = localStorage.getItem("printsociety_customer_name");
      if (email) {
        setUser({
          email,
          displayName: name,
          uid: email,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
    
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const login = (email: string, firstName?: string, lastName?: string) => {
    const name = firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : null;
    localStorage.setItem("printsociety_customer_email", email);
    if (name) localStorage.setItem("printsociety_customer_name", name);
    
    setUser({
      email,
      displayName: name,
      uid: email,
    });
  };

  const logout = () => {
    localStorage.removeItem("printsociety_customer_email");
    localStorage.removeItem("printsociety_customer_name");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


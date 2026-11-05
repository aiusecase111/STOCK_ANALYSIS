import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextValue {
  isLoggedIn: boolean;
  login: (id: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  login: () => false,
  logout: () => {},
});

const STORAGE_KEY = 'stock-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const login = (id: string, pass: string): boolean => {
    if (id === 'Dharm' && pass === 'Dharm') {
      setIsLoggedIn(true);
      localStorage.setItem(STORAGE_KEY, 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

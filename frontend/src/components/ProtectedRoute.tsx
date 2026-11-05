import { type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <>{children}</> : <Login />;
}

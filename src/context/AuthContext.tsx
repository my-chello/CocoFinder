import { createContext, ReactNode, useContext } from 'react';
import type { AppRole, AppViewMode } from '../lib/auth';

type AuthContextValue = {
  authRole: AppRole | null;
  activeViewMode: AppViewMode;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AuthContextValue;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

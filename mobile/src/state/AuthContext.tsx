import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { clearSession, fetchMe, loadSession, type User } from '../api/auth';
import { USER_KEY, TOKEN_KEY } from '../config';

interface AuthState {
  user: User | null;
  token: string | null;
  booting: boolean;
  /** Called after register/login/social sign-in so screens update instantly. */
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  booting: true,
  signIn: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session) {
        // Validate the stored token — revoked/expired sessions are dropped.
        const me = await fetchMe(session.token);
        if (me) {
          setToken(session.token);
          setUser({ id: me.id || (me as any)._id, name: me.name, email: me.email, role: me.role });
        } else {
          await clearSession();
        }
      }
      setBooting(false);
    })();
  }, []);

  const signIn = async (t: string, u: User) => {
    setToken(t);
    setUser(u);
    await SecureStore.setItemAsync(TOKEN_KEY, t);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
  };

  const signOut = async () => {
    setUser(null);
    setToken(null);
    await clearSession();
  };

  const refresh = async () => {
    if (!token) return;
    const me = await fetchMe(token);
    if (me) {
      const u = { id: me.id || (me as any)._id, name: me.name, email: me.email, role: me.role };
      setUser(u);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
    } else {
      await signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, booting, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

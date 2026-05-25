"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";

interface AuthUser {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  // ✅ AJOUTÉ — permet aux pages protégées d'attendre la fin du bootstrap
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/auth/refresh", { method: "POST" })
      .then((res) => {
        if (res.ok) {
          return res.json().then((data) => {
            setUser(data.user);
            setAccessToken(data.accessToken);
          });
        }
        // Pas de cookie valide → on reste déconnecté, pas de redirection ici
      })
      .catch(() => {
        // Erreur réseau → on reste déconnecté
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback((user: AuthUser, token: string) => {
    setUser(user);
    setAccessToken(token);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        logout,
        isAuthenticated: !!accessToken,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
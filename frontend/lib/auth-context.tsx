"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, type AuthUser } from "./api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, returnTo?: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: string }, returnTo?: string) => Promise<void>;
  loginWithOAuth: (provider: string, providerId: string, email: string, name: string, returnTo?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem("davinci_token");
      const userRaw = localStorage.getItem("davinci_user");
      if (token && userRaw) {
        setState({ user: JSON.parse(userRaw), token, loading: false });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const persist = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem("davinci_token", token);
    localStorage.setItem("davinci_user", JSON.stringify(user));
    setState({ user, token, loading: false });
  }, []);

  const login = useCallback(async (email: string, password: string, returnTo?: string) => {
    const res = await authApi.login({ email, password });
    persist(res.data.accessToken, res.data.user);
    router.push(returnTo || "/dashboard");
  }, [persist, router]);

  const register = useCallback(async (data: { name: string; email: string; password: string; role: string }, returnTo?: string) => {
    const res = await authApi.register(data);
    persist(res.data.accessToken, res.data.user);
    router.push(returnTo || "/dashboard");
  }, [persist, router]);

  const loginWithOAuth = useCallback(async (provider: string, providerId: string, email: string, name: string, returnTo?: string) => {
    const res = await authApi.oauthCallback({ provider, providerId, email, name });
    persist(res.data.accessToken, res.data.user);
    router.push(returnTo || "/dashboard");
  }, [persist, router]);

  const logout = useCallback(() => {
    localStorage.removeItem("davinci_token");
    localStorage.removeItem("davinci_user");
    setState({ user: null, token: null, loading: false });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        loginWithOAuth,
        logout,
        isAuthenticated: !!state.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

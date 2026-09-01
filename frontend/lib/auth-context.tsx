"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authService as authApi } from "@/services/auth.service";
import { safeReturnTo } from "@/lib/security";
import type { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, returnTo?: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: string }, returnTo?: string) => Promise<void>;
  /**
   * Punto de entrada de las sesiones que NO nacen de un formulario de esta app:
   * hoy, el OAuth de Google (`exchangeGoogleCredential` → `setSession`) y el
   * handoff por cookie del callback de GitHub.
   *
   * Acá NO existe un `loginWithOAuth`, y es a propósito. El que había tomaba
   * `(provider, providerId, email, name)` y posteaba esa identidad autoafirmada
   * a `/auth/oauth/callback`: el cliente decía de quién era la cuenta y el
   * backend le creía. Se borró junto con el shape que lo habilitaba. La
   * identidad ahora la establece auth-service verificando la credencial del
   * proveedor, y lo único que vuelve al cliente es la sesión ya emitida — que es
   * lo que recibe esta función.
   */
  setSession: (token: string, user: AuthUser, returnTo?: string) => void;
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

  /**
   * Único punto de redirección post-autenticación.
   *
   * `returnTo` viaja por querystring (`/login?returnTo=`, `/register?returnTo=`,
   * y el `state` del OAuth de GitHub que termina en `/oauth-success?returnTo=`),
   * o sea que lo controla quien arma el link. Sin normalizar, un
   * `?returnTo=https://evil.tld` convierte a la app en una redirección abierta:
   * el usuario hace clic en un link de vinciinventa.com, se autentica de verdad
   * y termina en el sitio del atacante — que es el pretexto ideal para pedirle
   * la contraseña "otra vez".
   *
   * `safeReturnTo` colapsa cualquier destino externo al fallback interno.
   */
  const navigateTo = useCallback(
    (returnTo: string | undefined, replace = false) => {
      const target = safeReturnTo(returnTo);
      if (replace) router.replace(target);
      else router.push(target);
    },
    [router]
  );

  const login = useCallback(async (email: string, password: string, returnTo?: string) => {
    const res = await authApi.login({ email, password });
    persist(res.data.accessToken, res.data.user);
    navigateTo(returnTo);
  }, [persist, navigateTo]);

  const register = useCallback(async (data: { name: string; email: string; password: string; role: string }, returnTo?: string) => {
    const res = await authApi.register(data);
    persist(res.data.accessToken, res.data.user);
    navigateTo(returnTo);
  }, [persist, navigateTo]);

  const setSession = useCallback((token: string, user: AuthUser, returnTo?: string) => {
    persist(token, user);
    navigateTo(returnTo, true);
  }, [persist, navigateTo]);

  const logout = useCallback(() => {
    localStorage.removeItem("davinci_token");
    localStorage.removeItem("davinci_user");
    setState({ user: null, token: null, loading: false });
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ ...state, login, register, setSession, logout, isAuthenticated: !!state.token }),
    [state, login, register, setSession, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

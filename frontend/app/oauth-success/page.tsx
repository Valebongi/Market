"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import type { AuthUser } from "@/types";

function OAuthSuccessHandler() {
  const { setSession } = useAuth();
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userRaw = params.get("user");
    const returnTo = params.get("returnTo") || "/dashboard";

    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as AuthUser;
        setSession(token, user, returnTo);
      } catch {
        setError(true);
      }
    } else {
      setError(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-snow-gray">
        <p className="text-slate-gray text-sm">
          Error al procesar la sesión.{" "}
          <a href="/login" className="text-electric-blue underline">Volver al login</a>
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-snow-gray">
      <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-snow-gray">
          <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OAuthSuccessHandler />
    </Suspense>
  );
}

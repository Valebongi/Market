"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Check, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError("El enlace de recuperación no es válido.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Token inválido o expirado.");
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-snow-gray dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-deep-emerald rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-xl font-bold text-carbon-gray dark:text-gray-100">Da Vinci Inventa</span>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-medium p-8 border border-fog-gray dark:border-white/10">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Check className="h-8 w-8 text-deep-emerald" />
              </div>
              <h1 className="text-2xl font-bold text-carbon-gray dark:text-gray-100 mb-2">
                ¡Contraseña actualizada!
              </h1>
              <p className="text-slate-gray dark:text-gray-400 text-sm leading-relaxed mb-6">
                Tu contraseña fue restablecida correctamente. Serás redirigido al inicio de sesión.
              </p>
              <Link
                href="/login"
                className="text-sm text-electric-blue hover:underline font-medium"
              >
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-carbon-gray dark:text-gray-100 mb-2">
                Restablecer contraseña
              </h1>
              <p className="text-sm text-slate-gray dark:text-gray-400 mb-7">
                Ingresá tu nueva contraseña para recuperar el acceso a tu cuenta.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-carbon-gray dark:text-gray-200 mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="Mínimo 8 caracteres"
                      autoFocus
                      disabled={!token}
                      className="w-full h-11 pl-10 pr-10 border border-fog-gray dark:border-white/10 rounded-xl text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-electric-blue dark:focus:border-blue-500 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-gray hover:text-carbon-gray"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-carbon-gray dark:text-gray-200 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                      placeholder="Repetí tu contraseña"
                      disabled={!token}
                      className="w-full h-11 pl-10 pr-4 border border-fog-gray dark:border-white/10 rounded-xl text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-electric-blue dark:focus:border-blue-500 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-soft-coral bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full h-11 bg-electric-blue hover:bg-midnight-blue text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  {loading ? "Guardando..." : "Restablecer contraseña"}
                </button>
              </form>

              <p className="text-center text-sm text-slate-gray dark:text-gray-400 mt-6">
                <Link href="/login" className="text-electric-blue hover:underline font-medium">
                  Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

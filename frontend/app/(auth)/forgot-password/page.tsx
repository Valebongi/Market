"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devToken, setDevToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Ingresá tu correo electrónico."); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8080/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Error al procesar la solicitud.");
      // In dev mode, the API returns a token so we can test without email
      if (data?.devToken) setDevToken(data.devToken);
    } catch (err: unknown) {
      // Always show success to prevent email enumeration
      console.error(err);
    }
    setLoading(false);
    setSubmitted(true);
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
          {submitted ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Check className="h-8 w-8 text-deep-emerald" />
              </div>
              <h1 className="text-2xl font-bold text-carbon-gray dark:text-gray-100 mb-2">
                Revisá tu correo
              </h1>
              <p className="text-slate-gray dark:text-gray-400 text-sm leading-relaxed mb-6">
                Si existe una cuenta con <strong className="text-carbon-gray dark:text-gray-200">{email}</strong>, te enviamos un enlace para restablecer tu contraseña.
              </p>
              <p className="text-xs text-slate-gray dark:text-gray-500 mb-6">
                No lo ves? Revisá la carpeta de spam o verificá que el correo sea el correcto.
              </p>
              {devToken && (
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Modo desarrollo — token de reset:</p>
                  <Link
                    href={`/reset-password?token=${devToken}`}
                    className="text-xs text-electric-blue hover:underline break-all"
                  >
                    /reset-password?token={devToken.slice(0, 20)}...
                  </Link>
                </div>
              )}
              <button
                onClick={() => { setSubmitted(false); setEmail(""); setDevToken(null); }}
                className="text-sm text-electric-blue hover:underline"
              >
                Intentar con otro correo
              </button>
            </div>
          ) : (
            /* Form state */
            <>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-gray hover:text-carbon-gray dark:text-gray-400 dark:hover:text-gray-200 transition-colors mb-6">
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>

              <h1 className="text-2xl font-bold text-carbon-gray dark:text-gray-100 mb-2">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="text-sm text-slate-gray dark:text-gray-400 mb-7">
                Ingresá tu correo y te enviamos un enlace para restablecerla.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-carbon-gray dark:text-gray-200 mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="tu@correo.com"
                      autoFocus
                      className="w-full h-11 pl-10 pr-4 border border-fog-gray dark:border-white/10 rounded-xl text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-electric-blue dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                  {error && <p className="mt-1.5 text-xs text-soft-coral">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-electric-blue hover:bg-midnight-blue text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>
              </form>

              <p className="text-center text-sm text-slate-gray dark:text-gray-400 mt-6">
                ¿Recordaste tu contraseña?{" "}
                <Link href="/login" className="text-electric-blue hover:underline font-medium">
                  Iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

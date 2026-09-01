"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Check, Info } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/http";

/**
 * La recuperación de contraseña está apagada a propósito.
 *
 * `POST /auth/forgot-password` funciona: valida el email, genera el token y lo
 * guarda con una hora de vigencia. Lo que NO existe todavía es el envío del
 * mail. En auth-service el token solo vuelve en el body cuando está
 * explícitamente habilitado (`EXPOSE_RESET_TOKEN=true` o
 * `NODE_ENV=development`); en producción no vuelve y no se manda a ningún lado.
 *
 * O sea que con el flujo prendido la persona ve "revisá tu correo", espera,
 * mira la carpeta de spam y no le llega nada nunca. Un falso éxito es peor que
 * un error: el error se entiende y se puede actuar, la promesa incumplida deja
 * a alguien esperando indefinidamente. Mismo criterio que el botón de GitHub en
 * `components/auth/OAuthButtons.tsx`.
 *
 * Lo que sí queda arreglado y vivo debajo del flag: la llamada ahora va por
 * `apiFetch` (antes tenía `http://localhost:8080` hardcodeado, así que en
 * producción le pegaba a la máquina del propio visitante) y distingue un fallo
 * de red de una respuesta del backend.
 *
 * `/reset-password` NO está apagada: el token que genera el backend es real y
 * sirve si alguien lo entrega por fuera, y es la pantalla a la que va a apuntar
 * el mail cuando exista.
 *
 * Para reactivar: `NEXT_PUBLIC_PASSWORD_RESET_ENABLED=true` una vez que
 * auth-service mande el correo. En desarrollo, combinalo con
 * `EXPOSE_RESET_TOKEN=true` en el backend para ver el enlace en pantalla.
 */
const PASSWORD_RESET_ENABLED: boolean =
  process.env.NEXT_PUBLIC_PASSWORD_RESET_ENABLED === "true";

/** Casilla a la que se deriva mientras el flujo automático no exista. */
const SUPPORT_EMAIL = "soporte@vinciinventa.com";

interface ForgotPasswordResponse {
  message?: string;
  /** Solo llega con EXPOSE_RESET_TOKEN=true o NODE_ENV=development. */
  devToken?: string;
}

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
      const data = await apiFetch<ForgotPasswordResponse>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        auth: false,
      });
      if (data?.devToken) setDevToken(data.devToken);
      setSubmitted(true);
    } catch (err: unknown) {
      /**
       * El backend responde igual para un email registrado y uno que no existe
       * — es deliberado, para que nadie pueda averiguar quién tiene cuenta acá.
       * Por eso un 200 nunca se traduce a "ese email no existe".
       *
       * Pero eso no es lo mismo que tragarse todos los errores: antes cualquier
       * fallo (incluido no tener red) terminaba en la pantalla de éxito, y la
       * persona esperaba un mail por una request que nunca salió. Lo que se
       * distingue acá no dice nada sobre la cuenta:
       *   - 400: el email no tiene formato válido (`@IsEmail` del DTO).
       *   - 429: el rate limit del gateway.
       *   - resto / sin `ApiError`: el pedido no llegó a destino.
       */
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setError("Revisá el correo: no parece una dirección válida.");
        } else if (err.status === 429) {
          setError("Demasiados intentos. Esperá unos minutos y probá de nuevo.");
        } else {
          setError("No pudimos procesar la solicitud. Intentá de nuevo en un momento.");
        }
      } else {
        setError("No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.");
      }
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
          {!PASSWORD_RESET_ENABLED ? (
            /* Fuera de servicio: no arrancamos un flujo que no puede terminar. */
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <Info className="h-8 w-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-carbon-gray dark:text-gray-100 mb-3">
                Todavía no podemos enviarte el enlace
              </h1>
              <p className="text-slate-gray dark:text-gray-400 text-sm leading-relaxed mb-6">
                La recuperación automática por correo no está disponible por ahora.
                Preferimos decírtelo acá y no dejarte esperando un mail que no va a llegar.
              </p>

              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=No%20puedo%20acceder%20a%20mi%20cuenta`}
                className="w-full h-11 bg-electric-blue hover:bg-midnight-blue text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Escribirle a soporte
              </a>
              <p className="mt-3 text-xs text-slate-gray dark:text-gray-500">
                Si no podés entrar a tu cuenta, escribinos a{" "}
                <span className="text-carbon-gray dark:text-gray-300">{SUPPORT_EMAIL}</span> y te ayudamos a recuperarla.
              </p>

              <p className="text-center text-sm text-slate-gray dark:text-gray-400 mt-7">
                <Link href="/login" className="text-electric-blue hover:underline font-medium">
                  Volver al inicio de sesión
                </Link>
              </p>
            </div>
          ) : submitted ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Check className="h-8 w-8 text-deep-emerald" />
              </div>
              <h1 className="text-2xl font-bold text-carbon-gray dark:text-gray-100 mb-2">
                Revisá tu correo
              </h1>
              <p className="text-slate-gray dark:text-gray-400 text-sm leading-relaxed mb-6">
                Si <strong className="text-carbon-gray dark:text-gray-200">{email}</strong> está registrado, vas a recibir un enlace para restablecer tu contraseña.
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

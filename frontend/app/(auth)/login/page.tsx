"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/http";


function LoginForm() {
  const { login } = useAuth();
  const [returnTo, setReturnTo] = useState<string | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(params.get("returnTo") || undefined);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = "El email es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email inválido";
    if (!password) newErrors.password = "La contraseña es requerida";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await login(email, password, returnTo);
    } catch (err) {
      setErrors({ general: err instanceof ApiError ? err.message : "Error al iniciar sesión" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl p-8 shadow-medium border border-fog-gray">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/Logo DaVinci.png" alt="Da Vinci Inventa" width={72} height={72} className="rounded-xl mx-auto mb-4" priority />
          <h1 className="text-2xl font-bold text-carbon-gray">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-slate-gray">Ingresá a tu cuenta para continuar</p>
        </div>

        {/* OAuth buttons */}
        <div className="mb-6">
          <OAuthButtons returnTo={returnTo} mode="login" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-fog-gray" />
          <span className="text-xs text-slate-gray">o con email</span>
          <div className="flex-1 h-px bg-fog-gray" />
        </div>

        {/* Error general */}
        {errors.general && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-soft-coral">
            {errors.general}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            type="email"
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            required
            autoComplete="email"
          />

          <div>
            <Input
              type="password"
              label="Contraseña"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              required
              autoComplete="current-password"
            />
            <div className="mt-1.5 text-right">
              <Link href="/forgot-password" className="text-xs text-electric-blue hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-fog-gray text-electric-blue" />
            <span className="text-sm text-slate-gray">Recordarme</span>
          </label>

          <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
            Ingresar
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-sm text-center text-slate-gray">
          ¿No tenés cuenta?{" "}
          <Link
            href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"}
            className="text-electric-blue font-medium hover:underline"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}

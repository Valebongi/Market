"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, Search, CheckCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";


type Role = "asset_owner" | "entrepreneur";
type Step = 1 | 2;

function RegisterForm() {
  const { register } = useAuth();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || undefined;

  const [step, setStep] = useState<Step>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Partial<typeof form & { role: string; terms: string; general: string }>>({});

  const PASSWORD_REQS = [
    { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
    { label: "Al menos una mayúscula", test: (p: string) => /[A-Z]/.test(p) },
    { label: "Al menos un número", test: (p: string) => /[0-9]/.test(p) },
  ];

  const ROLE_OPTIONS = [
    {
      value: "asset_owner" as Role,
      icon: <Upload className="h-6 w-6" />,
      title: "Soy Titular de Activos",
      description: "Tengo activos intelectuales para licenciar (software, diseños, modelos de negocio, etc.)",
    },
    {
      value: "entrepreneur" as Role,
      icon: <Search className="h-6 w-6" />,
      title: "Soy Emprendedor",
      description: "Busco licenciar activos intelectuales para mi proyecto o negocio",
    },
  ];

  const passwordStrength = PASSWORD_REQS.filter((r) => r.test(form.password)).length;
  const strengthColors = ["bg-soft-coral", "bg-warm-amber", "bg-deep-emerald"];
  const strengthColor = form.password ? strengthColors[Math.min(passwordStrength - 1, 2)] : "bg-fog-gray";

  const validateStep1 = () => {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "El nombre es requerido";
    if (!form.email.trim()) errs.email = "El email es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email inválido";
    if (!form.password) errs.password = "La contraseña es requerida";
    else if (passwordStrength < 3) errs.password = "La contraseña no cumple los requisitos";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Las contraseñas no coinciden";
    return errs;
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!selectedRole) errs.role = "Seleccioná un rol para continuar";
    if (!acceptTerms) errs.terms = "Debés aceptar los términos para continuar";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: selectedRole!,
      }, returnTo);
    } catch (err) {
      setErrors({ general: err instanceof ApiError ? err.message : "Error al registrarse" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-2xl p-8 shadow-medium border border-fog-gray">
        {/* Logo */}
        <div className="text-center mb-6">
          <Image src="/Logo DaVinci.png" alt="Da Vinci Inventa" width={72} height={72} className="rounded-xl mx-auto mb-4" priority />
          <h1 className="text-2xl font-bold text-carbon-gray">Crear cuenta</h1>
          <p className="mt-1 text-sm text-slate-gray">Únete a Da Vinci Inventa</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  s < step
                    ? "bg-deep-emerald text-white"
                    : s === step
                    ? "bg-electric-blue text-white"
                    : "bg-fog-gray text-slate-gray"
                )}
              >
                {s < step ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 2 && <div className={cn("w-12 h-px", s < step ? "bg-deep-emerald" : "bg-fog-gray")} />}
            </div>
          ))}
        </div>

        {/* STEP 1: Información básica */}
        {step === 1 && (
          <>
            <div className="mb-6">
              <OAuthButtons returnTo={returnTo} mode="register" />
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-fog-gray" />
              <span className="text-xs text-slate-gray">o con email</span>
              <div className="flex-1 h-px bg-fog-gray" />
            </div>

            <form onSubmit={handleStep1} className="space-y-4" noValidate>
              <Input
                label="Nombre completo"
                placeholder="Tu nombre"
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((err) => ({ ...err, name: undefined })); }}
                error={errors.name}
                required
              />
              <Input
                type="email"
                label="Email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErrors((err) => ({ ...err, email: undefined })); }}
                error={errors.email}
                required
              />

              <div>
                <Input
                  type="password"
                  label="Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); setErrors((err) => ({ ...err, password: undefined })); }}
                  error={errors.password}
                  required
                />
                {form.password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={cn("h-1 flex-1 rounded-full transition-all", i < passwordStrength ? strengthColor : "bg-fog-gray")}
                        />
                      ))}
                    </div>
                    <div className="space-y-1">
                      {PASSWORD_REQS.map((req) => (
                        <p key={req.label} className={cn("text-xs flex items-center gap-1.5", req.test(form.password) ? "text-deep-emerald" : "text-slate-gray")}>
                          <CheckCircle className="h-3 w-3" />
                          {req.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Input
                type="password"
                label="Confirmar contraseña"
                placeholder="Repetí tu contraseña"
                value={form.confirmPassword}
                onChange={(e) => { setForm((f) => ({ ...f, confirmPassword: e.target.value })); setErrors((err) => ({ ...err, confirmPassword: undefined })); }}
                error={errors.confirmPassword}
                required
              />

              <Button type="submit" fullWidth size="lg" className="mt-2">
                Continuar
              </Button>
            </form>
          </>
        )}

        {/* STEP 2: Selección de rol */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {errors.general && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-soft-coral">
                {errors.general}
              </div>
            )}
            <div>
              <h2 className="text-base font-semibold text-carbon-gray mb-4">¿Cómo vas a usar Da Vinci Inventa?</h2>
              <div className="grid grid-cols-1 gap-3">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSelectedRole(opt.value); setErrors((err) => ({ ...err, role: undefined })); }}
                    className={cn(
                      "flex items-start gap-4 p-4 border-2 rounded-xl text-left transition-all",
                      selectedRole === opt.value
                        ? "border-electric-blue bg-blue-50"
                        : "border-fog-gray hover:border-blue-200 hover:bg-snow-gray"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        selectedRole === opt.value ? "bg-electric-blue text-white" : "bg-snow-gray text-slate-gray"
                      )}
                    >
                      {opt.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-carbon-gray">{opt.title}</p>
                      <p className="text-sm text-slate-gray mt-0.5">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.role && <p className="mt-2 text-xs text-soft-coral">{errors.role}</p>}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => { setAcceptTerms(e.target.checked); setErrors((err) => ({ ...err, terms: undefined })); }}
                  className="mt-0.5 w-4 h-4 rounded border-fog-gray text-electric-blue"
                />
                <span className="text-sm text-slate-gray">
                  Acepto los{" "}
                  <Link href="/terms" className="text-electric-blue hover:underline">Términos de servicio</Link>{" "}
                  y{" "}
                  <Link href="/privacy" className="text-electric-blue hover:underline">Política de privacidad</Link>
                </span>
              </label>
              {errors.terms && <p className="mt-1 text-xs text-soft-coral">{errors.terms}</p>}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" size="lg" onClick={() => setStep(1)} className="flex-1">
                Volver
              </Button>
              <Button type="submit" size="lg" loading={loading} className="flex-1">
                Crear cuenta
              </Button>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="mt-6 text-sm text-center text-slate-gray">
          ¿Ya tenés cuenta?{" "}
          <Link
            href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}
            className="text-electric-blue font-medium hover:underline"
          >
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

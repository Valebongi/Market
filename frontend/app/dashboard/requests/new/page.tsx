"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { MessageSquare, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { requestsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function NewRequestForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();

  const assetId = params.get("assetId") || "";
  const assetTitle = decodeURIComponent(params.get("title") || "Activo");
  const ownerId = params.get("ownerId") || "";

  const [initialMessage, setInitialMessage] = useState("");
  const [proposedTerms, setProposedTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const QUICK_MESSAGES = [
    "Solicito más información sobre este activo.",
    "Me gustaría conocer las condiciones de licencia en detalle.",
    "¿Podría indicarme el precio y las condiciones de exclusividad?",
    "Estoy interesado en utilizar este activo para un proyecto comercial.",
    "¿Está disponible para licencia temporal?",
  ];

  const handleSubmit = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (initialMessage.trim().length < 20) {
      setError("El mensaje debe tener al menos 20 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestsApi.create({
        assetId,
        assetTitle,
        ownerId,
        initialMessage: initialMessage.trim(),
        ...(proposedTerms.trim() ? { proposedTerms: proposedTerms.trim() } : {}),
      });
      router.push("/dashboard/requests");
    } catch (err: any) {
      setError(err.message || "Error al enviar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (!assetId || !ownerId) {
    return (
      <div className="p-8 max-w-narrow mx-auto text-center">
        <p className="text-slate-gray">Información del activo incompleta.</p>
        <Link href="/assets" className="text-electric-blue hover:underline text-sm mt-2 inline-block">
          Volver al marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-narrow mx-auto">
      <Link
        href={`/assets/${assetId}`}
        className="flex items-center gap-2 text-sm text-slate-gray hover:text-carbon-gray mb-8 w-fit"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al activo
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <MessageSquare className="h-8 w-8 text-electric-blue" />
        <h1 className="text-3xl font-bold text-carbon-gray">Solicitar Licencia</h1>
      </div>
      <p className="text-base text-slate-gray mb-8">
        Vas a enviar una solicitud para:{" "}
        <span className="font-medium text-carbon-gray">{assetTitle}</span>
      </p>

      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-carbon-gray dark:text-gray-200 mb-2">Mensajes rápidos</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_MESSAGES.map((msg) => (
              <button
                key={msg}
                type="button"
                onClick={() => setInitialMessage(msg)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  initialMessage === msg
                    ? "border-electric-blue bg-blue-50 dark:bg-blue-950/50 text-electric-blue dark:text-blue-400"
                    : "border-fog-gray dark:border-white/10 text-slate-gray dark:text-gray-400 hover:border-electric-blue hover:text-electric-blue dark:hover:border-blue-500 dark:hover:text-blue-400"
                }`}
              >
                {msg}
              </button>
            ))}
          </div>
          <Textarea
            label="Mensaje inicial"
            placeholder="Contá cómo planeás usar este activo, tu caso de uso, empresa, proyecto... (mínimo 20 caracteres)"
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            maxLength={2000}
            showCount
            required
            className="min-h-[160px]"
            helperText="Describí tu proyecto y cómo usarías este activo · mínimo 20 caracteres"
          />
        </div>

        <Textarea
          label="Términos propuestos (opcional)"
          placeholder="Ej: Presupuesto estimado: USD 1500. Duración: 12 meses. Uso exclusivo para Argentina."
          value={proposedTerms}
          onChange={(e) => setProposedTerms(e.target.value)}
          maxLength={1000}
          showCount
          className="min-h-[100px]"
          helperText="Podés proponer condiciones específicas para negociar"
        />

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-soft-coral">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href={`/assets/${assetId}`}>
            <Button variant="ghost">Cancelar</Button>
          </Link>
          <Button
            onClick={handleSubmit}
            loading={loading}
            icon={<MessageSquare className="h-4 w-4" />}
          >
            Enviar Solicitud
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense>
      <NewRequestForm />
    </Suspense>
  );
}

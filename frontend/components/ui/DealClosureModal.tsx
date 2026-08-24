"use client";

import { useState } from "react";
import { CheckCircle, XCircle, DollarSign, FileText, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface DealClosureData {
  agreed: boolean;
  licenseType?: string;
  estimatedValue?: number;
  currency?: string;
  notes?: string;
}

interface DealClosureModalProps {
  assetTitle: string;
  counterpartName: string;
  onConfirm: (data: DealClosureData) => void;
  onSkip: () => void;
}

const LICENSE_OPTIONS = [
  { value: "exclusive", label: "Exclusiva" },
  { value: "non_exclusive", label: "No Exclusiva" },
  { value: "temporary", label: "Temporal" },
];

const CURRENCY_OPTIONS = ["USD", "ARS", "EUR"];

export default function DealClosureModal({
  assetTitle,
  counterpartName,
  onConfirm,
  onSkip,
}: DealClosureModalProps) {
  const [agreed, setAgreed] = useState<boolean | null>(null);
  const [licenseType, setLicenseType] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm({
      agreed: agreed === true,
      licenseType: agreed ? licenseType || undefined : undefined,
      estimatedValue: agreed && estimatedValue ? Number(estimatedValue) : undefined,
      currency: agreed ? currency : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-2xl shadow-large w-full max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-fog-gray dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-carbon-gray dark:text-gray-100">
              Registrar resultado del acuerdo
            </h2>
            <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">
              Conversación con <span className="font-medium text-carbon-gray dark:text-gray-200">{counterpartName}</span> sobre{" "}
              <span className="font-medium text-electric-blue dark:text-blue-400">{assetTitle}</span>
            </p>
          </div>
          {/* Cerrar sin registrar resultado — equivale a "Omitir por ahora" */}
          <button
            type="button"
            onClick={onSkip}
            aria-label="Cerrar sin registrar"
            className="shrink-0 p-1.5 -mr-1.5 -mt-1.5 rounded-lg text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 hover:bg-snow-gray dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* ¿Se concretó? */}
          <div>
            <p className="text-sm font-medium text-carbon-gray dark:text-gray-200 mb-3">
              ¿Se concretó un acuerdo de licencia?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAgreed(true)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                  agreed === true
                    ? "border-deep-emerald bg-emerald-50 dark:bg-emerald-950/30 text-deep-emerald dark:text-emerald-400"
                    : "border-fog-gray dark:border-white/10 text-slate-gray dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700"
                )}
              >
                <CheckCircle className="h-4 w-4" />
                Sí, se cerró
              </button>
              <button
                onClick={() => setAgreed(false)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                  agreed === false
                    ? "border-soft-coral bg-red-50 dark:bg-red-950/30 text-soft-coral dark:text-red-400"
                    : "border-fog-gray dark:border-white/10 text-slate-gray dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700"
                )}
              >
                <XCircle className="h-4 w-4" />
                No llegamos a un acuerdo
              </button>
            </div>
          </div>

          {/* Campos adicionales solo si hubo acuerdo */}
          {agreed === true && (
            <div className="space-y-4 pt-1">
              {/* Tipo de licencia */}
              <div>
                <label className="block text-xs font-medium text-slate-gray dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Tipo de licencia acordada
                </label>
                <div className="flex gap-2">
                  {LICENSE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLicenseType(opt.value)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                        licenseType === opt.value
                          ? "border-electric-blue bg-blue-50 dark:bg-blue-950/30 text-electric-blue dark:text-blue-400"
                          : "border-fog-gray dark:border-white/10 text-slate-gray dark:text-gray-400 hover:border-blue-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor estimado */}
              <div>
                <label className="block text-xs font-medium text-slate-gray dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  <DollarSign className="inline h-3 w-3 mr-1" />
                  Valor estimado del acuerdo (opcional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="h-10 px-3 border border-fog-gray dark:border-white/10 rounded-lg text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-200 focus:outline-none focus:border-electric-blue"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Ej: 5000"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    min="0"
                    className="flex-1 h-10 px-3 border border-fog-gray dark:border-white/10 rounded-lg text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-200 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-electric-blue"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notas libres */}
          {agreed !== null && (
            <div>
              <label className="block text-xs font-medium text-slate-gray dark:text-gray-400 uppercase tracking-wide mb-1.5">
                <FileText className="inline h-3 w-3 mr-1" />
                Notas internas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contexto adicional, próximos pasos, etc."
                rows={2}
                maxLength={300}
                className="w-full px-3 py-2 border border-fog-gray dark:border-white/10 rounded-lg text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-200 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-electric-blue resize-none transition-colors"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-fog-gray dark:border-white/10">
          <button
            onClick={onSkip}
            className="text-sm text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 transition-colors"
          >
            Omitir por ahora
          </button>
          <Button
            onClick={handleConfirm}
            disabled={agreed === null}
            variant={agreed === true ? "success" : agreed === false ? "primary" : "primary"}
          >
            Confirmar y cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

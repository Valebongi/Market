"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Check, ChevronRight, Upload, AlertCircle, ImagePlus, X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/http";
import { assetsService as assetsApi } from "@/services/assets.service";
import type { RawAsset } from "@/types";
import Input, { Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ASSET_CATEGORIES, getAssetCategoryLabel } from "@/lib/asset-categories";

const STEPS = [
  { id: 1, label: "Información Básica" },
  { id: 2, label: "Detalles de Licencia" },
  { id: 3, label: "Recursos" },
  { id: 4, label: "Vista Previa" },
];

const LICENSE_TYPES = [
  {
    value: "exclusive",
    label: "Exclusiva",
    description: "Un solo licenciatario a la vez",
  },
  {
    value: "non_exclusive",
    label: "No Exclusiva",
    description: "Múltiples licenciatarios simultáneos",
  },
  {
    value: "temporary",
    label: "Temporal",
    description: "Licencia por período específico",
  },
];

const ALLOWED_USES = [
  { value: "commercial", label: "Uso comercial" },
  { value: "resale", label: "Reventa" },
  { value: "modification", label: "Modificación" },
  { value: "distribution", label: "Distribución" },
];

/**
 * Body de `POST /assets` — espejo exacto de `CreateAssetDto` de assets-service.
 *
 * OJO: NO es `Partial<RawAsset>`. En el **request** `tags` es `string[]`;
 * en la **respuesta** el mismo campo vuelve como `Array<{ tag: string }>`.
 * Por eso este POST va por `apiFetch` y no por `assetsService.create()`,
 * cuya firma (`Partial<RawAsset>`) describe el modelo de lectura.
 * Los enums (`category`/`licenseType`/`pricingType`) quedan como `string`
 * igual que en el DTO del backend: la validación real la hace class-validator.
 */
interface CreateAssetPayload {
  title: string;
  description: string;
  category: string;
  licenseType: string;
  pricingType: string;
  price?: number;
  currency?: string;
  territory?: string;
  duration?: string;
  allowedUses?: string[];
  restrictions?: string[];
  tags?: string[];
  links?: Array<{ label: string; url: string; isMain?: boolean }>;
  coverImageUrl?: string;
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                currentStep > step.id
                  ? "bg-deep-emerald text-white"
                  : currentStep === step.id
                  ? "bg-electric-blue text-white"
                  : "bg-fog-gray text-slate-gray"
              )}
            >
              {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
            </div>
            <span
              className={cn(
                "text-xs mt-1.5 font-medium whitespace-nowrap hidden sm:block",
                currentStep === step.id ? "text-electric-blue" : "text-slate-gray"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "w-16 sm:w-24 h-px mx-2 mb-4 transition-all",
                currentStep > step.id ? "bg-deep-emerald" : "bg-fog-gray"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewAssetPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedAssetId, setPublishedAssetId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");

  // Form state
  const [basicInfo, setBasicInfo] = useState({
    title: "",
    category: "",
    assetType: "",
    description: "",
    tags: [] as string[],
    tagInput: "",
  });

  const [licenseInfo, setLicenseInfo] = useState({
    licenseType: "",
    duration: "",
    durationUnit: "months",
    territory: "global",
    allowedUses: [] as string[],
    priceType: "negotiable" as "fixed" | "range" | "negotiable",
    priceFixed: "",
    priceFrom: "",
    priceTo: "",
    additionalConditions: "",
  });

  const [resources, setResources] = useState({
    coverImageUrl: "",
    files: [] as File[],
    links: [""],
    previewUrls: [""],
  });
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverMode, setCoverMode] = useState<"upload" | "url">("upload");
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [confirmation, setConfirmation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setCoverUploading(true);
    const local = URL.createObjectURL(file);
    setCoverPreview(local);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch<{ url: string }>("/assets/upload-image", {
        method: "POST",
        body: form,
      });
      setResources((p) => ({ ...p, coverImageUrl: res.url }));
    } catch {
      setCoverPreview(null);
      setResources((p) => ({ ...p, coverImageUrl: "" }));
    } finally {
      setCoverUploading(false);
    }
  }

  // Tag management
  const addTag = () => {
    const tag = basicInfo.tagInput.trim().toLowerCase();
    if (tag && !basicInfo.tags.includes(tag) && basicInfo.tags.length < 10) {
      setBasicInfo((p) => ({ ...p, tags: [...p.tags, tag], tagInput: "" }));
    }
  };

  const removeTag = (tag: string) => {
    setBasicInfo((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!basicInfo.title.trim()) errs.title = "El título es requerido";
    if (!basicInfo.category) errs.category = "Seleccioná una categoría";
    if (!basicInfo.description.trim()) errs.description = "La descripción es requerida";
    if (basicInfo.description.length < 50) errs.description = "La descripción debe tener al menos 50 caracteres";
    return errs;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!licenseInfo.licenseType) errs.licenseType = "Seleccioná el tipo de licencia";
    if (licenseInfo.allowedUses.length === 0) errs.allowedUses = "Seleccioná al menos un uso permitido";
    return errs;
  };

  const handleNext = () => {
    let errs = {};
    if (step === 1) errs = validateStep1();
    if (step === 2) errs = validateStep2();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePublish = async () => {
    if (!confirmation) { setErrors({ confirmation: "Debés confirmar la titularidad" }); return; }
    setLoading(true);
    setSubmitError("");
    try {
      // Map form state to backend DTO (category/pricingType/price)
      const dto: CreateAssetPayload = {
        title: basicInfo.title,
        description: basicInfo.description,
        category: basicInfo.category || "other",
        licenseType: licenseInfo.licenseType,
        pricingType: licenseInfo.priceType === "fixed" ? "fixed" : "negotiable",
        territory: licenseInfo.territory || "Global",
        allowedUses: licenseInfo.allowedUses,
        tags: basicInfo.tags,
      };
      if (licenseInfo.priceType === "fixed" && licenseInfo.priceFixed) {
        dto.price = parseFloat(licenseInfo.priceFixed);
      }
      if (licenseInfo.duration) {
        dto.duration = `${licenseInfo.duration} ${licenseInfo.durationUnit}`;
      }
      if (licenseInfo.additionalConditions) {
        dto.restrictions = [licenseInfo.additionalConditions];
      }
      if (resources.coverImageUrl.trim()) {
        dto.coverImageUrl = resources.coverImageUrl.trim();
      }
      const validLinks = resources.links.filter((l) => l.trim());
      const validPreviews = resources.previewUrls.filter((u) => u.trim());
      const allLinks = [
        ...validLinks.map((url) => ({ label: "Link", url, isMain: false })),
        ...validPreviews.map((url) => ({ label: "preview", url, isMain: false })),
      ];
      if (allLinks.length > 0) {
        dto.links = allLinks;
      }

      const created = await apiFetch<RawAsset>("/assets", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      await assetsApi.publish(created.id);
      setPublishedAssetId(created.id);
      setPublished(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al publicar el activo");
    } finally {
      setLoading(false);
    }
  };

  if (published) {
    return (
      <div className="p-8 max-w-narrow mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <Check className="h-10 w-10 text-deep-emerald" />
        </div>
        <h2 className="text-2xl font-bold text-carbon-gray">¡Activo Publicado!</h2>
        <p className="text-slate-gray mt-2">Tu activo ya es visible en el marketplace</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          {publishedAssetId && (
            <Link href={`/assets/${publishedAssetId}`}>
              <Button variant="secondary">Ver mi activo</Button>
            </Link>
          )}
          <Button onClick={() => { setPublished(false); setStep(1); setPublishedAssetId(null); }}>Publicar otro</Button>
          <Link href="/dashboard">
            <Button variant="ghost">Volver al dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-narrow mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-carbon-gray">Publicar Nuevo Activo</h1>
          <p className="text-slate-gray mt-1">Completá los pasos para publicar tu activo en el marketplace</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        {/* STEP 1: Información Básica */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-carbon-gray">Información Básica</h2>
              <p className="text-sm text-slate-gray mt-1">Describí tu activo de forma clara y atractiva</p>
            </div>

            <Input
              label="Título del Activo"
              placeholder="Ej: Sistema de diseño completo para SaaS"
              value={basicInfo.title}
              onChange={(e) => setBasicInfo((p) => ({ ...p, title: e.target.value }))}
              error={errors.title}
              required
              helperText={`${basicInfo.title.length}/80 caracteres`}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Categoría"
                value={basicInfo.category}
                onChange={(e) => setBasicInfo((p) => ({ ...p, category: e.target.value }))}
                error={errors.category}
                required
              >
                <option value="">Seleccioná una categoría</option>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>

              <Select
                label="Tipo de Activo"
                value={basicInfo.assetType}
                onChange={(e) => setBasicInfo((p) => ({ ...p, assetType: e.target.value }))}
              >
                <option value="">Seleccioná el tipo</option>
                <option value="app">App / Software</option>
                <option value="logo">Logo</option>
                <option value="brand_kit">Brand Kit</option>
                <option value="template">Template</option>
                <option value="framework">Framework</option>
              </Select>
            </div>

            <Textarea
              label="Descripción Completa"
              placeholder="Describí qué hace, qué problema resuelve y qué incluye tu activo..."
              value={basicInfo.description}
              onChange={(e) => setBasicInfo((p) => ({ ...p, description: e.target.value }))}
              error={errors.description}
              maxLength={2000}
              showCount
              required
              className="min-h-[180px]"
              helperText="Incluí qué hace, qué problema resuelve y qué viene incluido"
            />

            {/* Tags */}
            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-2">
                Tags / Palabras Clave{" "}
                <span className="text-slate-gray font-normal">(máx. 10)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="react, ui, b2b, saas..."
                  value={basicInfo.tagInput}
                  onChange={(e) => setBasicInfo((p) => ({ ...p, tagInput: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                  className="flex-1 h-10 px-4 border border-fog-gray rounded-lg text-sm focus:outline-none focus:border-electric-blue transition-colors"
                />
                <Button variant="secondary" size="sm" onClick={addTag}>Agregar</Button>
              </div>
              {basicInfo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {basicInfo.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-electric-blue text-sm rounded-full">
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-midnight-blue">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Detalles de Licencia */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-carbon-gray">Condiciones de Licencia</h2>
              <p className="text-sm text-slate-gray mt-1">Definí cómo se puede usar tu activo</p>
            </div>

            {/* License Type */}
            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-3">
                Tipo de Licencia <span className="text-soft-coral">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3">
                {LICENSE_TYPES.map((lt) => (
                  <button
                    key={lt.value}
                    type="button"
                    onClick={() => setLicenseInfo((p) => ({ ...p, licenseType: lt.value }))}
                    className={cn(
                      "flex items-start gap-4 p-4 border-2 rounded-xl text-left transition-all",
                      licenseInfo.licenseType === lt.value
                        ? "border-electric-blue bg-blue-50"
                        : "border-fog-gray hover:border-blue-200"
                    )}
                  >
                    <div className={cn("w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center", licenseInfo.licenseType === lt.value ? "border-electric-blue" : "border-fog-gray")}>
                      {licenseInfo.licenseType === lt.value && <div className="w-2.5 h-2.5 rounded-full bg-electric-blue" />}
                    </div>
                    <div>
                      <p className="font-semibold text-carbon-gray">{lt.label}</p>
                      <p className="text-sm text-slate-gray mt-0.5">{lt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.licenseType && <p className="mt-2 text-xs text-soft-coral">{errors.licenseType}</p>}
            </div>

            {/* Duration (if temporal) */}
            {licenseInfo.licenseType === "temporary" && (
              <div className="flex gap-3">
                <Input
                  label="Duración"
                  type="number"
                  placeholder="12"
                  value={licenseInfo.duration}
                  onChange={(e) => setLicenseInfo((p) => ({ ...p, duration: e.target.value }))}
                  className="flex-1"
                />
                <Select
                  label="Unidad"
                  value={licenseInfo.durationUnit}
                  onChange={(e) => setLicenseInfo((p) => ({ ...p, durationUnit: e.target.value }))}
                  className="w-32"
                >
                  <option value="months">Meses</option>
                  <option value="years">Años</option>
                </Select>
              </div>
            )}

            {/* Territory */}
            <Select
              label="Territorio"
              value={licenseInfo.territory}
              onChange={(e) => setLicenseInfo((p) => ({ ...p, territory: e.target.value }))}
            >
              <option value="global">Global</option>
              <option value="latam">Latinoamérica</option>
              <option value="usa">Estados Unidos</option>
              <option value="europe">Europa</option>
              <option value="argentina">Argentina</option>
            </Select>

            {/* Usos permitidos */}
            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-3">
                Usos Permitidos <span className="text-soft-coral">*</span>
              </label>
              <div className="space-y-2">
                {ALLOWED_USES.map((use) => (
                  <label key={use.value} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={licenseInfo.allowedUses.includes(use.value)}
                      onChange={(e) => {
                        setLicenseInfo((p) => ({
                          ...p,
                          allowedUses: e.target.checked
                            ? [...p.allowedUses, use.value]
                            : p.allowedUses.filter((u) => u !== use.value),
                        }));
                      }}
                      className="w-4 h-4 rounded border-fog-gray text-electric-blue"
                    />
                    <span className="text-sm text-slate-gray group-hover:text-carbon-gray transition-colors">
                      {use.label}
                    </span>
                  </label>
                ))}
              </div>
              {errors.allowedUses && <p className="mt-2 text-xs text-soft-coral">{errors.allowedUses}</p>}
            </div>

            {/* Precio */}
            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-3">Precio</label>
              <div className="space-y-2 mb-3">
                {[
                  { value: "fixed", label: "Precio fijo" },
                  { value: "range", label: "Rango de precio" },
                  { value: "negotiable", label: "A consultar" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="priceType"
                      value={opt.value}
                      checked={licenseInfo.priceType === opt.value}
                      onChange={() => setLicenseInfo((p) => ({ ...p, priceType: opt.value as typeof licenseInfo.priceType }))}
                      className="w-4 h-4 border-fog-gray text-electric-blue"
                    />
                    <span className="text-sm text-slate-gray">{opt.label}</span>
                  </label>
                ))}
              </div>
              {licenseInfo.priceType === "fixed" && (
                <Input
                  placeholder="USD 2000"
                  value={licenseInfo.priceFixed}
                  onChange={(e) => setLicenseInfo((p) => ({ ...p, priceFixed: e.target.value }))}
                  helperText="Podés negociar el precio después"
                />
              )}
              {licenseInfo.priceType === "range" && (
                <div className="flex gap-3 items-center">
                  <Input placeholder="Desde USD" value={licenseInfo.priceFrom} onChange={(e) => setLicenseInfo((p) => ({ ...p, priceFrom: e.target.value }))} />
                  <span className="text-slate-gray">–</span>
                  <Input placeholder="Hasta USD" value={licenseInfo.priceTo} onChange={(e) => setLicenseInfo((p) => ({ ...p, priceTo: e.target.value }))} />
                </div>
              )}
            </div>

            <Textarea
              label="Condiciones Adicionales (opcional)"
              placeholder="Ej: Se requiere crédito al autor en la documentación del producto."
              value={licenseInfo.additionalConditions}
              onChange={(e) => setLicenseInfo((p) => ({ ...p, additionalConditions: e.target.value }))}
              maxLength={500}
              showCount
            />
          </div>
        )}

        {/* STEP 3: Recursos */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-carbon-gray">Recursos y Archivos</h2>
              <p className="text-sm text-slate-gray mt-1">Adjuntá documentación o muestras (opcional)</p>
            </div>

            {/* Cover Image */}
            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-1">
                Imagen de Portada{" "}
                <span className="text-slate-gray font-normal">(opcional)</span>
              </label>
              <p className="text-xs text-slate-gray mb-3">
                Se muestra en la tarjeta del marketplace. Ideal 1200×675px.
              </p>

              {/* Mode toggle */}
              <div className="flex border border-fog-gray rounded-lg overflow-hidden mb-3 w-fit">
                <button type="button" onClick={() => setCoverMode("upload")} className={cn("px-4 py-1.5 text-sm font-medium transition-colors", coverMode === "upload" ? "bg-electric-blue text-white" : "text-slate-gray hover:bg-snow-gray")}>
                  Subir archivo
                </button>
                <button type="button" onClick={() => setCoverMode("url")} className={cn("px-4 py-1.5 text-sm font-medium border-l border-fog-gray transition-colors", coverMode === "url" ? "bg-electric-blue text-white" : "text-slate-gray hover:bg-snow-gray")}>
                  URL pública
                </button>
              </div>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverUpload(file);
                  e.target.value = "";
                }}
              />

              {coverMode === "url" ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={coverUrlInput}
                    onChange={(e) => {
                      setCoverUrlInput(e.target.value);
                      const url = e.target.value.trim();
                      if (url) {
                        setCoverPreview(url);
                        setResources((p) => ({ ...p, coverImageUrl: url }));
                      } else {
                        setCoverPreview(null);
                        setResources((p) => ({ ...p, coverImageUrl: "" }));
                      }
                    }}
                    className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm focus:outline-none focus:border-electric-blue transition-colors"
                  />
                  {coverPreview && (
                    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-fog-gray bg-snow-gray">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" onError={() => setCoverPreview(null)} />
                      <button type="button" onClick={() => { setCoverPreview(null); setCoverUrlInput(""); setResources((p) => ({ ...p, coverImageUrl: "" })); }} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 backdrop-blur-sm transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : coverPreview ? (
                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-fog-gray bg-snow-gray">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" />
                  {coverUploading && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                      <p className="text-white text-sm font-medium">Subiendo imagen...</p>
                    </div>
                  )}
                  {!coverUploading && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button type="button" onClick={() => coverInputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-black/50 text-white text-xs font-medium hover:bg-black/70 backdrop-blur-sm transition-colors">
                        Cambiar
                      </button>
                      <button type="button" onClick={() => { setCoverPreview(null); setResources((p) => ({ ...p, coverImageUrl: "" })); }} className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 backdrop-blur-sm transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {!coverUploading && resources.coverImageUrl && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-deep-emerald/90 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                      <Check className="h-3 w-3" /> Subida correctamente
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => coverInputRef.current?.click()} className="flex flex-col items-center justify-center w-full aspect-[16/9] border-2 border-dashed border-fog-gray rounded-xl bg-snow-gray hover:border-electric-blue hover:bg-blue-50/30 transition-all cursor-pointer">
                  <ImagePlus className="h-8 w-8 text-slate-gray mb-2" />
                  <p className="text-sm font-medium text-carbon-gray">Clic para subir imagen de portada</p>
                  <p className="text-xs text-slate-gray mt-0.5">JPG, PNG, WebP · Máx. 5MB</p>
                </button>
              )}
            </div>

            {/* Drag & Drop */}
            <div>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.zip,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  const combined = [...resources.files, ...selected].slice(0, 5);
                  setResources((p) => ({ ...p, files: combined }));
                  e.target.value = "";
                }}
              />
              <label
                htmlFor="file-upload"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files);
                  const combined = [...resources.files, ...dropped].slice(0, 5);
                  setResources((p) => ({ ...p, files: combined }));
                }}
                className="flex flex-col items-center justify-center border-2 border-dashed border-fog-gray rounded-xl p-8 text-center bg-snow-gray hover:border-electric-blue hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <Upload className="h-8 w-8 text-slate-gray mx-auto mb-3" />
                <p className="text-base font-medium text-carbon-gray">Arrastrá archivos o hacé clic para seleccionar</p>
                <p className="text-sm text-slate-gray mt-1">PDF, ZIP, PNG, JPG · Máx. 50MB por archivo · Máx. 5 archivos</p>
              </label>

              {/* Selected files list */}
              {resources.files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {resources.files.map((file, i) => (
                    <li key={i} className="flex items-center justify-between bg-white border border-fog-gray rounded-lg px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Upload className="h-4 w-4 text-slate-gray shrink-0" />
                        <span className="text-sm text-carbon-gray truncate">{file.name}</span>
                        <span className="text-xs text-slate-gray shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResources((p) => ({ ...p, files: p.files.filter((_, fi) => fi !== i) }))}
                        className="ml-2 text-slate-gray hover:text-soft-coral transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warm-amber shrink-0 mt-0.5" />
              <p className="text-sm text-carbon-gray">
                Los archivos estarán disponibles <strong>solo tras el acuerdo de licencia</strong>. Los interesados verán que hay recursos disponibles pero no tendrán acceso hasta cerrar el trato.
              </p>
            </div>

            {/* Links externos */}
            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-3">
                Links Externos (opcional)
              </label>
              {resources.links.map((link, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="https://demo.miactivo.com"
                    value={link}
                    onChange={(e) => {
                      const newLinks = [...resources.links];
                      newLinks[i] = e.target.value;
                      setResources((p) => ({ ...p, links: newLinks }));
                    }}
                    className="flex-1 h-10 px-4 border border-fog-gray rounded-lg text-sm focus:outline-none focus:border-electric-blue transition-colors"
                  />
                </div>
              ))}
              {resources.links.length < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResources((p) => ({ ...p, links: [...p.links, ""] }))}
                >
                  + Agregar otro link
                </Button>
              )}
            </div>

            {/* Preview / Demo URLs */}
            <div>
              <label className="text-sm font-medium text-carbon-gray block mb-1">
                URLs de Vista Previa{" "}
                <span className="text-slate-gray font-normal">(opcional)</span>
              </label>
              <p className="text-xs text-slate-gray mb-3">
                Agregá imágenes, videos de YouTube o Vimeo que los compradores verán <strong>públicamente</strong> antes de solicitar la licencia.
              </p>
              {resources.previewUrls.map((url, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=... o https://imagen.com/preview.png"
                    value={url}
                    onChange={(e) => {
                      const next = [...resources.previewUrls];
                      next[i] = e.target.value;
                      setResources((p) => ({ ...p, previewUrls: next }));
                    }}
                    className="flex-1 h-10 px-4 border border-fog-gray rounded-lg text-sm focus:outline-none focus:border-electric-blue transition-colors"
                  />
                  {resources.previewUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setResources((p) => ({ ...p, previewUrls: p.previewUrls.filter((_, fi) => fi !== i) }))}
                      className="text-slate-gray hover:text-soft-coral transition-colors text-lg px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {resources.previewUrls.length < 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResources((p) => ({ ...p, previewUrls: [...p.previewUrls, ""] }))}
                >
                  + Agregar otra URL de preview
                </Button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Vista Previa */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-carbon-gray">Vista Previa</h2>
              <p className="text-sm text-slate-gray mt-1">Así verán tu activo los emprendedores</p>
            </div>

            {/* Preview Card */}
            <div className="border-2 border-electric-blue rounded-xl p-6 relative">
              <span className="absolute top-3 right-3 bg-electric-blue text-white text-xs font-bold px-2 py-1 rounded-full">
                VISTA PREVIA
              </span>
              <span className="inline-block bg-blue-50 text-electric-blue text-xs font-medium px-3 py-1 rounded-full mb-3">
                {basicInfo.category ? getAssetCategoryLabel(basicInfo.category) : "Categoría"}
              </span>
              <h3 className="text-xl font-bold text-carbon-gray">{basicInfo.title || "Título del activo"}</h3>
              <p className="mt-2 text-sm text-slate-gray line-clamp-3">{basicInfo.description || "Descripción del activo..."}</p>
              <div className="mt-4 flex gap-2 flex-wrap">
                {basicInfo.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 bg-snow-gray border border-fog-gray rounded-full text-slate-gray">#{tag}</span>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              {[
                { label: "Información básica completa", done: !!basicInfo.title && !!basicInfo.category && !!basicInfo.description },
                { label: "Condiciones de licencia definidas", done: !!licenseInfo.licenseType && licenseInfo.allowedUses.length > 0 },
                { label: "Al menos 1 tag agregado", done: basicInfo.tags.length > 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", item.done ? "bg-deep-emerald" : "bg-fog-gray")}>
                    {item.done && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className={cn("text-sm", item.done ? "text-carbon-gray" : "text-slate-gray")}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Confirmation */}
            <div className="p-4 bg-snow-gray rounded-xl border border-fog-gray">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmation}
                  onChange={(e) => { setConfirmation(e.target.checked); setErrors((err) => ({ ...err, confirmation: "" })); }}
                  className="mt-1 w-4 h-4 rounded border-fog-gray text-electric-blue"
                />
                <span className="text-sm text-carbon-gray">
                  Confirmo que soy el titular legítimo de este activo y que tengo los derechos necesarios para otorgar licencias de uso.
                </span>
              </label>
              {errors.confirmation && <p className="mt-2 text-xs text-soft-coral">{errors.confirmation}</p>}
            </div>

            {submitError && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-soft-coral">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-fog-gray">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                ← Anterior
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Guardar borrador
            </Button>
            {step < 4 ? (
              <Button onClick={handleNext} icon={<ChevronRight className="h-4 w-4" />} iconPosition="right">
                Siguiente
              </Button>
            ) : (
              <Button variant="success" onClick={handlePublish} loading={loading} size="lg">
                Publicar Activo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Check, ImagePlus, X, Loader2, AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/http";
import { assetsService as assetsApi, mapAsset } from "@/services/assets.service";
import Input, { Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types";
import { ASSET_CATEGORIES } from "@/lib/asset-categories";

const LICENSE_TYPES = [
  { value: "exclusive", label: "Exclusiva", description: "Un solo licenciatario a la vez" },
  { value: "non_exclusive", label: "No Exclusiva", description: "Múltiples licenciatarios simultáneos" },
  { value: "temporary", label: "Temporal", description: "Licencia por período específico" },
];

const ALLOWED_USES = [
  { value: "commercial", label: "Uso comercial" },
  { value: "resale", label: "Reventa" },
  { value: "modification", label: "Modificación" },
  { value: "distribution", label: "Distribución" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6">
      <h2 className="text-base font-semibold text-carbon-gray dark:text-gray-100 mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function EditAssetPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [asset, setAsset] = useState<Asset | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [licenseType, setLicenseType] = useState("");
  const [territory, setTerritory] = useState("global");
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("months");
  const [allowedUses, setAllowedUses] = useState<string[]>([]);
  const [priceType, setPriceType] = useState<"fixed" | "negotiable">("negotiable");
  const [priceFixed, setPriceFixed] = useState("");
  const [additionalConditions, setAdditionalConditions] = useState("");

  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverMode, setCoverMode] = useState<"upload" | "url">("upload");
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [links, setLinks] = useState<string[]>([""]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([""]);

  // Load asset
  useEffect(() => {
    async function load() {
      try {
        const raw = await assetsApi.get(assetId);
        const a = mapAsset(raw);
        setAsset(a);

        setTitle(a.title);
        setCategory(a.assetType);
        setDescription(a.description);
        setTags(a.tags ?? []);
        setLicenseType(a.licenseType);
        setTerritory(a.territory ?? "global");
        setAllowedUses(a.allowedUses ?? []);
        setPriceType(a.priceType === "fixed" ? "fixed" : "negotiable");
        if (a.priceFixed) setPriceFixed(String(a.priceFixed));
        if (a.additionalConditions) setAdditionalConditions(a.additionalConditions);
        if (a.duration) {
          const parts = a.duration.split(" ");
          setDuration(parts[0] ?? "");
          setDurationUnit(parts[1] ?? "months");
        }
        if (a.coverImageUrl) {
          setCoverImageUrl(a.coverImageUrl);
          setCoverPreview(a.coverImageUrl);
          // If it's an external URL (not a local upload), default to URL mode
          if (!a.coverImageUrl.includes('localhost')) {
            setCoverMode("url");
            setCoverUrlInput(a.coverImageUrl);
          }
        }
        setLinks(a.externalLinks?.length ? a.externalLinks : [""]);
        setPreviewUrls(a.previewUrls?.length ? a.previewUrls : [""]);
      } catch {
        setError("No se pudo cargar el activo.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assetId]);

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setCoverUploading(true);
    setCoverPreview(URL.createObjectURL(file));
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch<{ url: string }>("/assets/upload-image", {
        method: "POST",
        body: form,
      });
      setCoverImageUrl(res.url);
    } catch {
      setCoverPreview(coverImageUrl || null);
    } finally {
      setCoverUploading(false);
    }
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags((p) => [...p, t]);
      setTagInput("");
    }
  };

  async function handleSave() {
    if (!title.trim()) { setError("El título es requerido."); return; }
    setSaving(true);
    setError("");
    try {
      const validLinks = links.filter((l) => l.trim());
      const validPreviews = previewUrls.filter((u) => u.trim());
      const allLinks = [
        ...validLinks.map((url) => ({ label: "Link", url, isMain: false })),
        ...validPreviews.map((url) => ({ label: "preview", url, isMain: false })),
      ];

      const dto: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        category: category || "other",
        licenseType,
        pricingType: priceType === "fixed" ? "fixed" : "negotiable",
        territory: territory || "Global",
        allowedUses,
        tags,
      };
      if (priceType === "fixed" && priceFixed) dto.price = parseFloat(priceFixed);
      if (duration) dto.duration = `${duration} ${durationUnit}`;
      if (additionalConditions) dto.restrictions = [additionalConditions];
      if (coverImageUrl) dto.coverImageUrl = coverImageUrl;
      if (allLinks.length > 0) dto.links = allLinks;

      await assetsApi.update(assetId, dto as never);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-narrow mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-fog-gray rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-8 max-w-narrow mx-auto text-center py-20">
        <p className="text-slate-gray">Activo no encontrado.</p>
        <Link href="/dashboard/assets" className="mt-4 inline-block">
          <Button variant="ghost">← Volver a Mis Activos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-narrow mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/assets">
          <button className="p-2 rounded-lg text-slate-gray hover:text-carbon-gray hover:bg-snow-gray transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-carbon-gray dark:text-gray-100 truncate">
            Editar: {asset.title}
          </h1>
          <p className="text-sm text-slate-gray mt-0.5">
            Estado:{" "}
            <span className={cn(
              "font-medium",
              asset.status === "published" ? "text-deep-emerald" :
              asset.status === "draft" ? "text-warm-amber" : "text-slate-gray"
            )}>
              {asset.status === "published" ? "Publicado" : asset.status === "draft" ? "Borrador" : "Archivado"}
            </span>
          </p>
        </div>
        <Button
          onClick={handleSave}
          loading={saving}
          icon={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          variant={saved ? "success" : "primary"}
        >
          {saved ? "Guardado" : "Guardar Cambios"}
        </Button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-soft-coral flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Información Básica */}
        <Section title="Información Básica">
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            helperText={`${title.length}/120 caracteres`}
          />

          <Select
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Seleccioná una categoría</option>
            {ASSET_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>

          <Textarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            showCount
            className="min-h-[180px]"
          />

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-carbon-gray dark:text-gray-200 block mb-2">
              Tags <span className="text-slate-gray font-normal">(máx. 10)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="react, ui, saas..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                className="flex-1 h-10 px-4 border border-fog-gray rounded-lg text-sm focus:outline-none focus:border-electric-blue transition-colors dark:bg-gray-800 dark:border-white/10 dark:text-gray-100"
              />
              <Button variant="secondary" size="sm" onClick={addTag}>Agregar</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-electric-blue text-sm rounded-full">
                    #{tag}
                    <button onClick={() => setTags((p) => p.filter((t) => t !== tag))} className="hover:text-midnight-blue">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Condiciones de Licencia */}
        <Section title="Condiciones de Licencia">
          <div>
            <label className="text-sm font-medium text-carbon-gray dark:text-gray-200 block mb-3">Tipo de Licencia</label>
            <div className="grid grid-cols-1 gap-2">
              {LICENSE_TYPES.map((lt) => (
                <button
                  key={lt.value}
                  type="button"
                  onClick={() => setLicenseType(lt.value)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 border-2 rounded-xl text-left transition-all",
                    licenseType === lt.value ? "border-electric-blue bg-blue-50" : "border-fog-gray hover:border-blue-200"
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center", licenseType === lt.value ? "border-electric-blue" : "border-fog-gray")}>
                    {licenseType === lt.value && <div className="w-2 h-2 rounded-full bg-electric-blue" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-carbon-gray">{lt.label}</p>
                    <p className="text-xs text-slate-gray mt-0.5">{lt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {licenseType === "temporary" && (
            <div className="flex gap-3">
              <Input label="Duración" type="number" placeholder="12" value={duration} onChange={(e) => setDuration(e.target.value)} className="flex-1" />
              <Select label="Unidad" value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="w-32">
                <option value="months">Meses</option>
                <option value="years">Años</option>
              </Select>
            </div>
          )}

          <Select label="Territorio" value={territory} onChange={(e) => setTerritory(e.target.value)}>
            <option value="global">Global</option>
            <option value="latam">Latinoamérica</option>
            <option value="usa">Estados Unidos</option>
            <option value="europe">Europa</option>
            <option value="argentina">Argentina</option>
          </Select>

          <div>
            <label className="text-sm font-medium text-carbon-gray dark:text-gray-200 block mb-3">Usos Permitidos</label>
            <div className="space-y-2">
              {ALLOWED_USES.map((use) => (
                <label key={use.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowedUses.includes(use.value)}
                    onChange={(e) => setAllowedUses((p) =>
                      e.target.checked ? [...p, use.value] : p.filter((u) => u !== use.value)
                    )}
                    className="w-4 h-4 rounded border-fog-gray text-electric-blue"
                  />
                  <span className="text-sm text-slate-gray">{use.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-carbon-gray dark:text-gray-200 block mb-2">Precio</label>
            <div className="flex gap-4 mb-3">
              {[{ value: "fixed", label: "Precio fijo" }, { value: "negotiable", label: "A consultar" }].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priceType"
                    value={opt.value}
                    checked={priceType === opt.value}
                    onChange={() => setPriceType(opt.value as "fixed" | "negotiable")}
                    className="w-4 h-4 text-electric-blue"
                  />
                  <span className="text-sm text-slate-gray">{opt.label}</span>
                </label>
              ))}
            </div>
            {priceType === "fixed" && (
              <Input placeholder="USD 2000" value={priceFixed} onChange={(e) => setPriceFixed(e.target.value)} />
            )}
          </div>

          <Textarea
            label="Condiciones Adicionales (opcional)"
            placeholder="Ej: Se requiere crédito al autor..."
            value={additionalConditions}
            onChange={(e) => setAdditionalConditions(e.target.value)}
            maxLength={500}
            showCount
          />
        </Section>

        {/* Imagen de Portada */}
        <Section title="Imagen de Portada">
          <p className="text-xs text-slate-gray -mt-2">
            Se muestra en la tarjeta del marketplace. Ideal 1200×675px.
          </p>

          {/* Mode toggle */}
          <div className="flex border border-fog-gray rounded-lg overflow-hidden w-fit">
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
                    setCoverImageUrl(url);
                  } else {
                    setCoverPreview(null);
                    setCoverImageUrl("");
                  }
                }}
                className="w-full h-10 px-4 border border-fog-gray rounded-lg text-sm focus:outline-none focus:border-electric-blue transition-colors dark:bg-gray-800 dark:border-white/10 dark:text-gray-100"
              />
              {coverPreview && (
                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-fog-gray bg-snow-gray">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" onError={() => setCoverPreview(null)} />
                  <button type="button" onClick={() => { setCoverPreview(null); setCoverUrlInput(""); setCoverImageUrl(""); }} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 backdrop-blur-sm transition-colors">
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
                  <p className="text-white text-sm">Subiendo imagen...</p>
                </div>
              )}
              {!coverUploading && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-black/50 text-white text-xs font-medium hover:bg-black/70 backdrop-blur-sm transition-colors">
                    Cambiar
                  </button>
                  <button type="button" onClick={() => { setCoverPreview(null); setCoverImageUrl(""); }} className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 backdrop-blur-sm transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {!coverUploading && coverImageUrl && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-deep-emerald/90 text-white text-xs font-medium px-2 py-1 rounded-full">
                  <Check className="h-3 w-3" /> Imagen guardada
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full aspect-[16/9] border-2 border-dashed border-fog-gray rounded-xl bg-snow-gray hover:border-electric-blue hover:bg-blue-50/30 transition-all cursor-pointer"
            >
              <ImagePlus className="h-8 w-8 text-slate-gray mb-2" />
              <p className="text-sm font-medium text-carbon-gray">Clic para subir imagen de portada</p>
              <p className="text-xs text-slate-gray mt-0.5">o arrastrá un archivo aquí</p>
            </button>
          )}
        </Section>

        {/* Links */}
        <Section title="Links y URLs de Vista Previa">
          <div>
            <label className="text-sm font-medium text-carbon-gray dark:text-gray-200 block mb-2">Links Externos</label>
            {links.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="url"
                  placeholder="https://demo.miactivo.com"
                  value={link}
                  onChange={(e) => { const n = [...links]; n[i] = e.target.value; setLinks(n); }}
                  className="flex-1 h-10 px-4 border border-fog-gray rounded-lg text-sm focus:outline-none focus:border-electric-blue transition-colors dark:bg-gray-800 dark:border-white/10 dark:text-gray-100"
                />
                {links.length > 1 && (
                  <button type="button" onClick={() => setLinks((p) => p.filter((_, fi) => fi !== i))} className="text-slate-gray hover:text-soft-coral text-lg px-2">×</button>
                )}
              </div>
            ))}
            {links.length < 3 && (
              <Button variant="ghost" size="sm" onClick={() => setLinks((p) => [...p, ""])}>+ Agregar link</Button>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-carbon-gray dark:text-gray-200 block mb-1">URLs de Vista Previa</label>
            <p className="text-xs text-slate-gray mb-2">Imágenes o videos que los compradores ven antes de solicitar.</p>
            {previewUrls.map((url, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => { const n = [...previewUrls]; n[i] = e.target.value; setPreviewUrls(n); }}
                  className="flex-1 h-10 px-4 border border-fog-gray rounded-lg text-sm focus:outline-none focus:border-electric-blue transition-colors dark:bg-gray-800 dark:border-white/10 dark:text-gray-100"
                />
                {previewUrls.length > 1 && (
                  <button type="button" onClick={() => setPreviewUrls((p) => p.filter((_, fi) => fi !== i))} className="text-slate-gray hover:text-soft-coral text-lg px-2">×</button>
                )}
              </div>
            ))}
            {previewUrls.length < 5 && (
              <Button variant="ghost" size="sm" onClick={() => setPreviewUrls((p) => [...p, ""])}>+ Agregar URL</Button>
            )}
          </div>
        </Section>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-fog-gray dark:border-white/10">
        <Link href="/dashboard/assets">
          <Button variant="ghost">← Volver a Mis Activos</Button>
        </Link>
        <div className="flex gap-3">
          {asset.status === "draft" && (
            <Button
              variant="success"
              onClick={async () => {
                await handleSave();
                await assetsApi.publish(assetId);
                router.push("/dashboard/assets");
              }}
            >
              Guardar y Publicar
            </Button>
          )}
          <Button onClick={handleSave} loading={saving} icon={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} variant={saved ? "success" : "primary"}>
            {saved ? "Guardado" : "Guardar Cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}

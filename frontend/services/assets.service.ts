import { apiFetch } from "@/lib/http";
import type {
  RawAsset,
  Asset,
  PaginatedResponse,
  CreateAssetPayload,
  UpdateAssetPayload,
  AssetImageUploadResponse,
  AssetLinkInput,
} from "@/types";

export const assetsService = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<PaginatedResponse<RawAsset>>(`/assets${qs}`, { auth: false });
  },

  get: (id: string) =>
    apiFetch<RawAsset>(`/assets/${id}`, { auth: false }),

  /**
   * `POST /assets`. El body es `CreateAssetPayload` (modelo de ESCRITURA),
   * no `Partial<RawAsset>`: en el request `tags` es `string[]`, en la respuesta
   * vuelve como `Array<{ tag: string }>`. La respuesta sí es `RawAsset`:
   * pasala por `mapAsset()` antes de renderizarla.
   */
  create: (body: CreateAssetPayload) =>
    apiFetch<RawAsset>("/assets", { method: "POST", body: JSON.stringify(body) }),

  /** `PUT /assets/:id`. Mismo modelo de escritura, todo opcional, más `status`. */
  update: (id: string, body: UpdateAssetPayload) =>
    apiFetch<RawAsset>(`/assets/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  /**
   * `POST /assets/upload-image` (multipart, campo `file`). Máx. 5 MB, sólo
   * `image/*` — lo valida el backend. Devuelve la URL absoluta ya servida por
   * assets-service; es la que va en `coverImageUrl`.
   *
   * No se setea `Content-Type`: el browser tiene que poner el boundary.
   */
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<AssetImageUploadResponse>("/assets/upload-image", {
      method: "POST",
      body: form,
    });
  },

  publish: (id: string) =>
    apiFetch<RawAsset>(`/assets/${id}/publish`, { method: "PATCH" }),

  archive: (id: string) =>
    apiFetch<RawAsset>(`/assets/${id}/archive`, { method: "PATCH" }),

  remove: (id: string) =>
    apiFetch<{ message: string }>(`/assets/${id}`, { method: "DELETE" }),
};

/**
 * Forma "de front" de un activo a escribir: los mismos nombres de campo que
 * usa `Asset` (el modelo de lectura), para que un formulario no tenga que
 * conocer los nombres del backend.
 *
 * Es la entrada de `toAssetPayload()`, el inverso de `mapAsset()`.
 */
export interface AssetInput {
  title: Asset["title"];
  description: Asset["description"];
  assetType: Asset["assetType"];
  licenseType: Asset["licenseType"];
  priceType: Asset["priceType"];
  priceFixed?: number | string | null;
  priceCurrency?: string | null;
  territory?: string | null;
  duration?: string | null;
  allowedUses?: string[];
  additionalConditions?: string | null;
  tags?: string[];
  externalLinks?: string[];
  previewUrls?: string[];
  coverImageUrl?: string | null;
}

/** `label` con el que se marcan los links que son preview. Ver `mapAsset`. */
const PREVIEW_LABEL = "preview";

function clean(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Traducción de IDA: `AssetInput` (nombres del front) → `CreateAssetPayload`
 * (nombres del backend). Es el espejo exacto de `mapAsset()`, y el ÚNICO lugar
 * donde debería vivir esta conversión.
 *
 *   assetType            → category
 *   priceType/priceFixed → pricingType/price   (`price` sólo si es "fixed")
 *   priceCurrency        → currency
 *   additionalConditions → restrictions: [texto]
 *   tags: string[]       → tags: string[]      (el backend los envuelve al leer)
 *   externalLinks        → links[{ label: "Link", url }]
 *   previewUrls          → links[{ label: "preview", url }]
 *
 * Los campos vacíos se OMITEN en vez de mandarse como `""`/`0`: el DTO los
 * declara `@IsOptional()`, pero un `""` sí pasa la validación y termina
 * pisando el valor guardado en un PUT.
 */
export function toAssetPayload(input: AssetInput): CreateAssetPayload {
  const links: AssetLinkInput[] = [
    ...(input.externalLinks ?? [])
      .map(clean)
      .filter((url): url is string => !!url)
      .map((url) => ({ label: "Link", url, isMain: false })),
    ...(input.previewUrls ?? [])
      .map(clean)
      .filter((url): url is string => !!url)
      .map((url) => ({ label: PREVIEW_LABEL, url, isMain: false })),
  ];

  const payload: CreateAssetPayload = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.assetType,
    licenseType: input.licenseType,
    pricingType: input.priceType,
  };

  // `price` sólo tiene sentido con pricingType "fixed". En "negotiable" y
  // "free" el backend lo ignora, pero mandarlo ensucia el registro.
  if (input.priceType === "fixed" && input.priceFixed != null && input.priceFixed !== "") {
    const price = Number(input.priceFixed);
    if (!Number.isNaN(price)) payload.price = price;
  }

  const currency = clean(input.priceCurrency);
  if (currency) payload.currency = currency;

  const territory = clean(input.territory);
  if (territory) payload.territory = territory;

  const duration = clean(input.duration);
  if (duration) payload.duration = duration;

  if (input.allowedUses?.length) payload.allowedUses = input.allowedUses;

  const conditions = clean(input.additionalConditions);
  if (conditions) payload.restrictions = [conditions];

  const tags = (input.tags ?? []).map(clean).filter((t): t is string => !!t);
  if (tags.length) payload.tags = tags;

  if (links.length) payload.links = links;

  const cover = clean(input.coverImageUrl);
  if (cover) payload.coverImageUrl = cover;

  return payload;
}

// Maps raw backend shape → frontend Asset type
export function mapAsset(a: RawAsset): Asset {
  // Los TRES pricingType se preservan. `free` NO se colapsa en `fixed`:
  // un activo gratuito se renderiza como "Gratis", no como "$0".
  const priceType =
    a.pricingType === "negotiable" || a.pricingType === "free" ? a.pricingType : "fixed";

  return {
    id: a.id,
    ownerId: a.ownerId,
    title: a.title,
    slug: a.slug,
    description: a.description,
    assetType: a.category,
    licenseType: a.licenseType,
    territory: a.territory,
    duration: a.duration,
    status: a.status,
    priceType,
    // "negotiable" no tiene precio; "free" es 0 por definicion, aunque quede un
    // `price` viejo en la fila (activo que paso de pago a gratuito).
    // Prisma serializa Decimal(10,2) como string: el Number() no es decorativo.
    priceFixed:
      priceType === "negotiable" ? undefined : priceType === "free" ? 0 : Number(a.price ?? 0),
    priceCurrency: a.currency || "USD",
    allowedUses: a.allowedUses ?? [],
    additionalConditions: a.restrictions?.join("; ") || undefined,
    tags: a.tags?.map((t) => t.tag) ?? [],
    externalLinks: a.links?.filter((l) => l.label !== PREVIEW_LABEL).map((l) => l.url) ?? [],
    previewUrls: a.links?.filter((l) => l.label === PREVIEW_LABEL).map((l) => l.url) ?? [],
    coverImageUrl: a.coverImageUrl,
    viewCount: a.viewCount ?? 0,
    requestCount: a.requestCount ?? 0,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

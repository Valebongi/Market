import { mapAsset } from '@/services/assets.service';
import type { RawAsset } from '@/types';

/**
 * mapAsset() es el UNICO punto donde se absorbe la divergencia de nombres entre
 * el backend y el frontend. Si se rompe, se rompe en silencio: no hay excepcion,
 * simplemente se renderiza el campo equivocado (o vacio).
 *
 * Traducciones que sostiene (ver MEMORY.md "Backend vs Frontend Field Mismatch"):
 *   category      -> assetType
 *   pricingType   -> priceType
 *   price         -> priceFixed
 *   currency      -> priceCurrency
 *   restrictions  -> additionalConditions (join con "; ")
 *   tags[{tag}]   -> tags: string[]
 *   links[{url}]  -> externalLinks / previewUrls (particionado por label)
 *
 * Se usa el shape RawAsset real, no un objeto inventado.
 */

function rawAsset(overrides: Partial<RawAsset> = {}): RawAsset {
  return {
    id: 'asset-1',
    ownerId: 'owner-1',
    title: 'Marca registrada Da Vinci',
    slug: 'marca-registrada-da-vinci',
    description: 'Marca con identidad visual completa y manual de uso.',
    category: 'brand',
    licenseType: 'exclusive',
    territory: 'Argentina',
    duration: '12 meses',
    status: 'published',
    pricingType: 'fixed',
    price: 15000.5,
    currency: 'ARS',
    allowedUses: ['commercial'],
    restrictions: ['No sublicenciar'],
    tags: [{ tag: 'marca' }, { tag: 'branding' }],
    links: [
      { label: 'Link', url: 'https://ejemplo.com/manual', isMain: false },
      { label: 'preview', url: 'https://ejemplo.com/preview.png', isMain: false },
    ],
    coverImageUrl: 'https://ejemplo.com/cover.png',
    viewCount: 42,
    requestCount: 7,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('mapAsset - renombres de campo backend -> frontend', () => {
  it('traduce category a assetType', () => {
    expect(mapAsset(rawAsset({ category: 'business_model' })).assetType).toBe('business_model');
  });

  it('traduce currency a priceCurrency', () => {
    expect(mapAsset(rawAsset({ currency: 'ARS' })).priceCurrency).toBe('ARS');
  });

  it('aplana tags de [{tag}] a string[]', () => {
    const asset = mapAsset(rawAsset());
    expect(asset.tags).toEqual(['marca', 'branding']);
  });

  it('une restrictions en additionalConditions separadas por "; "', () => {
    const asset = mapAsset(rawAsset({ restrictions: ['No sublicenciar', 'Solo Argentina'] }));
    expect(asset.additionalConditions).toBe('No sublicenciar; Solo Argentina');
  });

  it('preserva los campos que NO se renombran', () => {
    const raw = rawAsset();
    const asset = mapAsset(raw);
    expect(asset.id).toBe(raw.id);
    expect(asset.ownerId).toBe(raw.ownerId);
    expect(asset.title).toBe(raw.title);
    expect(asset.slug).toBe(raw.slug);
    expect(asset.description).toBe(raw.description);
    expect(asset.licenseType).toBe(raw.licenseType);
    expect(asset.territory).toBe(raw.territory);
    expect(asset.duration).toBe(raw.duration);
    expect(asset.status).toBe(raw.status);
    expect(asset.coverImageUrl).toBe(raw.coverImageUrl);
    expect(asset.createdAt).toBe(raw.createdAt);
    expect(asset.updatedAt).toBe(raw.updatedAt);
  });

  it('no deja ningun campo del tipo Asset sin definir con un RawAsset completo', () => {
    const asset = mapAsset(rawAsset());
    const obligatorios = [
      'id', 'ownerId', 'title', 'slug', 'description', 'assetType', 'licenseType',
      'status', 'priceType', 'priceCurrency', 'allowedUses', 'tags',
      'externalLinks', 'previewUrls', 'viewCount', 'requestCount',
      'createdAt', 'updatedAt',
    ] as const;
    for (const campo of obligatorios) {
      expect(asset[campo]).toBeDefined();
    }
  });
});

describe('mapAsset - particionado de links por label', () => {
  it('separa previews de links externos', () => {
    const asset = mapAsset(rawAsset());
    expect(asset.externalLinks).toEqual(['https://ejemplo.com/manual']);
    expect(asset.previewUrls).toEqual(['https://ejemplo.com/preview.png']);
  });

  it('cada link cae en exactamente una de las dos listas (particion, no solapamiento)', () => {
    const links = [
      { label: 'Link', url: 'https://a.com' },
      { label: 'preview', url: 'https://b.com' },
      { label: 'Demo', url: 'https://c.com' },
      { label: 'preview', url: 'https://d.com' },
    ];
    const asset = mapAsset(rawAsset({ links }));
    expect([...asset.externalLinks, ...asset.previewUrls].sort()).toEqual(
      links.map((l) => l.url).sort(),
    );
    expect(asset.previewUrls).toEqual(['https://b.com', 'https://d.com']);
  });

  it('el label "preview" es case-sensitive: "Preview" cae en externalLinks', () => {
    // Documenta el comportamiento real. Si el backend empezara a mandar
    // "Preview" con mayuscula, las previews aparecerian como links externos.
    const asset = mapAsset(rawAsset({ links: [{ label: 'Preview', url: 'https://x.com' }] }));
    expect(asset.externalLinks).toEqual(['https://x.com']);
    expect(asset.previewUrls).toEqual([]);
  });
});

describe('mapAsset - traduccion de pricing', () => {
  it('pricingType "negotiable" se mapea a priceType "negotiable" sin precio', () => {
    const asset = mapAsset(rawAsset({ pricingType: 'negotiable', price: 999 }));
    expect(asset.priceType).toBe('negotiable');
    expect(asset.priceFixed).toBeUndefined();
  });

  it('pricingType "fixed" conserva el precio como numero', () => {
    const asset = mapAsset(rawAsset({ pricingType: 'fixed', price: 15000.5 }));
    expect(asset.priceType).toBe('fixed');
    expect(asset.priceFixed).toBe(15000.5);
  });

  it('convierte el Decimal de Prisma (que llega como string) a number', () => {
    // Prisma serializa Decimal(10,2) como string en JSON. Sin el Number() de
    // mapAsset, el front hace comparaciones y formateo sobre un string.
    const asset = mapAsset(rawAsset({ pricingType: 'fixed', price: '15000.50' as any }));
    expect(typeof asset.priceFixed).toBe('number');
    expect(asset.priceFixed).toBe(15000.5);
  });

  it('usa "USD" cuando el backend no manda currency', () => {
    expect(mapAsset(rawAsset({ currency: undefined })).priceCurrency).toBe('USD');
  });

  /**
   * DIVERGENCIA DE CONTRATO — reportada al orquestador.
   *
   * El backend tiene TRES pricingType (`fixed` | `negotiable` | `free`:
   * schema.prisma:41 y CreateAssetDto:31) pero el tipo `Asset` del frontend
   * solo tiene DOS (`"fixed" | "negotiable"`: types/index.ts:72).
   * mapAsset colapsa `free` en `"fixed"` con priceFixed = 0, asi que un activo
   * gratuito se renderiza como "precio fijo 0" en vez de "Gratis".
   *
   * Este test fija el comportamiento ACTUAL (no el deseado) para que el fix sea
   * deliberado y visible. Cuando se agregue "free" al tipo Asset, ROMPE. Bien.
   */
  it('[COMPORTAMIENTO ACTUAL] pricingType "free" se colapsa en "fixed" con precio 0', () => {
    const asset = mapAsset(rawAsset({ pricingType: 'free', price: undefined }));
    expect(asset.priceType).toBe('fixed');
    expect(asset.priceFixed).toBe(0);
  });
});

describe('mapAsset - tolerancia a campos ausentes', () => {
  /**
   * GET /assets (listado) NO incluye lo mismo que GET /assets/:id.
   * El listado trae `links: { where: { isMain: true } }` y no trae attachments.
   * mapAsset tiene que sobrevivir a ambos shapes sin explotar.
   */
  it('sobrevive a un RawAsset minimo del listado (sin tags/links/contadores)', () => {
    const minimo = {
      id: 'a1',
      ownerId: 'o1',
      title: 'Titulo',
      slug: 'titulo',
      description: 'desc',
      category: 'software',
      licenseType: 'non_exclusive',
      status: 'published',
      pricingType: 'negotiable',
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    } as RawAsset;

    const asset = mapAsset(minimo);
    expect(asset.tags).toEqual([]);
    expect(asset.externalLinks).toEqual([]);
    expect(asset.previewUrls).toEqual([]);
    expect(asset.allowedUses).toEqual([]);
    expect(asset.viewCount).toBe(0);
    expect(asset.requestCount).toBe(0);
    expect(asset.additionalConditions).toBeUndefined();
  });

  it('restrictions vacio no produce un string vacio en additionalConditions', () => {
    // "" es falsy y renderizaria una seccion vacia; tiene que ser undefined.
    expect(mapAsset(rawAsset({ restrictions: [] })).additionalConditions).toBeUndefined();
  });

  it('nunca devuelve undefined en los arrays (el front hace .map sin guardas)', () => {
    const asset = mapAsset(rawAsset({ tags: undefined, links: undefined, allowedUses: undefined }));
    expect(Array.isArray(asset.tags)).toBe(true);
    expect(Array.isArray(asset.externalLinks)).toBe(true);
    expect(Array.isArray(asset.previewUrls)).toBe(true);
    expect(Array.isArray(asset.allowedUses)).toBe(true);
  });
});

describe('mapAsset - no filtra nombres de campo del backend', () => {
  /**
   * Si mapAsset dejara pasar `category` o `pricingType` al objeto Asset, un
   * componente podria leerlos por accidente y el renombre quedaria a medias.
   */
  it('el Asset resultante no expone category/pricingType/price/currency/restrictions', () => {
    const asset = mapAsset(rawAsset()) as Record<string, unknown>;
    for (const campoDeBackend of ['category', 'pricingType', 'price', 'currency', 'restrictions']) {
      expect(asset[campoDeBackend]).toBeUndefined();
    }
  });
});

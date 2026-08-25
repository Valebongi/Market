import 'reflect-metadata';
import { CreateAssetDto } from '../../../backend/assets-service/src/modules/assets/dto/create-asset.dto';
import { crearValidador, probarQueElHarnessDetectaReglas } from '../../support/validation';

const validateDto = crearValidador('assets-service');

/**
 * CONTRATO: frontend/app/dashboard/assets/new/page.tsx  ->  POST /assets
 *
 * El formulario arma el body en `handlePublish()` (page.tsx:234). Este archivo
 * replica ese payload EXACTO y lo pasa por el ValidationPipe real.
 *
 * Bug historico que cubre: el form ofrece 7 categorias (page.tsx:21-29) entre
 * ellas `brand` y `project`. El @IsEnum del DTO no las incluia y el backend
 * respondia 400 al publicar. Ver `CATEGORIES_OFRECIDAS_POR_EL_FORM`.
 */

/** Copiado literal de `CATEGORIES` en app/dashboard/assets/new/page.tsx:21-29. */
const CATEGORIES_OFRECIDAS_POR_EL_FORM = [
  'software',
  'brand',
  'design',
  'business_model',
  'content',
  'project',
  'other',
];

/** Copiado literal de `LICENSE_TYPES` en page.tsx:31-47. */
const LICENSE_TYPES_OFRECIDOS_POR_EL_FORM = ['exclusive', 'non_exclusive', 'temporary'];

/** Copiado literal de `ALLOWED_USES` en page.tsx:49-54. */
const ALLOWED_USES_OFRECIDOS_POR_EL_FORM = ['commercial', 'resale', 'modification', 'distribution'];

/** Payload minimo valido; `description` debe superar los 50 chars (DTO:22). */
function payloadBase(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Plataforma de gestion de inventario',
    description:
      'Sistema completo de gestion de inventario con control de stock, alertas ' +
      'de reposicion y reportes exportables. Incluye codigo fuente y documentacion.',
    category: 'software',
    licenseType: 'non_exclusive',
    pricingType: 'fixed',
    territory: 'Global',
    allowedUses: ['commercial'],
    tags: ['saas', 'inventario'],
    ...overrides,
  };
}

describe('CreateAssetDto <- payload del formulario de publicacion', () => {
  it('acepta el payload completo tal como lo arma handlePublish()', async () => {
    // Espejo de page.tsx:234-263 con todas las ramas opcionales activas.
    const dtoDelForm = {
      title: 'Marca registrada Da Vinci',
      description:
        'Marca con identidad visual completa, manual de uso, logotipo vectorial ' +
        'y paleta cromatica. Registrada en INPI con vigencia hasta 2035.',
      category: 'brand',
      licenseType: 'exclusive',
      pricingType: 'fixed',
      price: 15000.5,
      territory: 'Argentina',
      duration: '12 meses',
      allowedUses: ['commercial', 'distribution'],
      restrictions: ['No se permite sublicenciar a terceros'],
      tags: ['marca', 'branding'],
      links: [
        { label: 'Link', url: 'https://ejemplo.com/manual', isMain: false },
        { label: 'preview', url: 'https://ejemplo.com/preview.png', isMain: false },
      ],
      coverImageUrl: 'https://ejemplo.com/cover.png',
    };

    const res = await validateDto(CreateAssetDto, dtoDelForm);
    expect(res.errors).toEqual([]);
    expect(res.ok).toBe(true);
  });

  describe('cada categoria que el form ofrece debe ser aceptada por el DTO', () => {
    // REGRESION: `brand` y `project` fallaban con 400 antes del fix.
    it.each(CATEGORIES_OFRECIDAS_POR_EL_FORM)('acepta category="%s"', async (category) => {
      const res = await validateDto(CreateAssetDto, payloadBase({ category }));
      expect(res.errors).toEqual([]);
    });
  });

  it.each(LICENSE_TYPES_OFRECIDOS_POR_EL_FORM)(
    'acepta licenseType="%s" que ofrece el form',
    async (licenseType) => {
      const res = await validateDto(CreateAssetDto, payloadBase({ licenseType }));
      expect(res.errors).toEqual([]);
    },
  );

  it('acepta el set completo de allowedUses del form', async () => {
    const res = await validateDto(
      CreateAssetDto,
      payloadBase({ allowedUses: ALLOWED_USES_OFRECIDOS_POR_EL_FORM }),
    );
    expect(res.errors).toEqual([]);
  });

  it('rechaza una categoria que el form NO ofrece (el enum sigue siendo cerrado)', async () => {
    const res = await validateDto(CreateAssetDto, payloadBase({ category: 'patente' }));
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/category/);
  });
});

describe('CreateAssetDto - forbidNonWhitelisted es el mecanismo que rompio produccion', () => {
  /**
   * main.ts:25-30 usa `forbidNonWhitelisted: true`. Cualquier campo de mas que
   * mande el frontend NO se ignora: devuelve 400. Este test fija ese contrato
   * para que quede explicito por que un rename de campo es un breaking change.
   */
  it('rechaza un campo desconocido en vez de ignorarlo', async () => {
    const res = await validateDto(CreateAssetDto, payloadBase({ assetType: 'software' }));
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/assetType/);
  });

  it('rechaza los nombres de campo del FRONTEND (assetType/priceType/priceFixed)', async () => {
    // Si alguien manda el shape `Asset` en vez del shape `RawAsset`, esto explota.
    const { category, pricingType, ...resto } = payloadBase();
    const res = await validateDto(CreateAssetDto, {
      ...resto,
      assetType: 'software',
      priceType: 'fixed',
      priceFixed: 100,
    });
    expect(res.ok).toBe(false);
  });

  it('rechaza `status` en la creacion (no es parte de CreateAssetDto)', async () => {
    const res = await validateDto(CreateAssetDto, payloadBase({ status: 'published' }));
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/status/);
  });
});

describe('CreateAssetDto - reglas de pricing', () => {
  it.each(['fixed', 'negotiable', 'free'])('acepta pricingType="%s"', async (pricingType) => {
    const res = await validateDto(CreateAssetDto, payloadBase({ pricingType }));
    expect(res.errors).toEqual([]);
  });

  it('rechaza precio negativo', async () => {
    const res = await validateDto(CreateAssetDto, payloadBase({ price: -1 }));
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/price/);
  });

  it('rechaza mas de 2 decimales en price', async () => {
    const res = await validateDto(CreateAssetDto, payloadBase({ price: 10.999 }));
    expect(res.ok).toBe(false);
  });

  it('rechaza description de menos de 50 caracteres', async () => {
    const res = await validateDto(CreateAssetDto, payloadBase({ description: 'corto' }));
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/description/);
  });

  it('rechaza title de menos de 5 caracteres', async () => {
    const res = await validateDto(CreateAssetDto, payloadBase({ title: 'abc' }));
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/title/);
  });
});

describe('meta', () => {
  probarQueElHarnessDetectaReglas(validateDto, CreateAssetDto, { title: 'x' });
});

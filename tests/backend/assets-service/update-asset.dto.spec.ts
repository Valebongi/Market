import 'reflect-metadata';
import { UpdateAssetDto } from '../../../backend/assets-service/src/modules/assets/dto/update-asset.dto';
import { crearValidador, probarQueElHarnessDetectaReglas } from '../../support/validation';

const validateDto = crearValidador('assets-service');

/**
 * CONTRATO: frontend `assetsService.update()` -> PUT /assets/:id
 *
 * UpdateAssetDto extiende PartialType(CreateAssetDto) y agrega `status`.
 */
describe('UpdateAssetDto', () => {
  it('acepta un update parcial de un solo campo', async () => {
    const res = await validateDto(UpdateAssetDto, { title: 'Titulo nuevo y valido' });
    expect(res.errors).toEqual([]);
  });

  it('acepta el vaciado explicito de arrays (tags: [])', async () => {
    // assets.service.ts:185 distingue `tags !== undefined` para borrar y recrear.
    const res = await validateDto(UpdateAssetDto, { tags: [] });
    expect(res.errors).toEqual([]);
  });

  it.each(['draft', 'published', 'archived'])('acepta status="%s"', async (status) => {
    const res = await validateDto(UpdateAssetDto, { status });
    expect(res.errors).toEqual([]);
  });

  /**
   * DIVERGENCIA DE CONTRATO documentada (ver reporte al orquestador).
   * El enum Prisma `AssetStatus` (schema.prisma:10-15) y el tipo del frontend
   * `AssetStatus` (frontend/types/index.ts:49) incluyen `flagged`, pero el DTO
   * no lo acepta. Es deliberado: a `flagged` solo se llega por el contador de
   * denuncias (assets.service.ts:258-263), nunca por PUT del usuario.
   * Si esto se "arregla" permitiendo `flagged` en el DTO, cualquier titular
   * podria auto-marcarse o des-marcarse: el test tiene que romper y avisar.
   */
  it('NO permite setear status="flagged" por PUT (solo lo setea el sistema)', async () => {
    const res = await validateDto(UpdateAssetDto, { status: 'flagged' });
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/status/);
  });

  it('sigue rechazando campos desconocidos igual que en la creacion', async () => {
    const res = await validateDto(UpdateAssetDto, { assetType: 'software' });
    expect(res.ok).toBe(false);
  });

  it('sigue validando los limites heredados de CreateAssetDto', async () => {
    const res = await validateDto(UpdateAssetDto, { description: 'muy corto' });
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/description/);
  });

  it('rechaza ownerId: no se puede transferir titularidad por PUT', async () => {
    // Escalada de privilegio si esto pasara: reasignar un activo a otro usuario.
    const res = await validateDto(UpdateAssetDto, { ownerId: 'otro-usuario' });
    expect(res.ok).toBe(false);
  });

  it('rechaza viewCount/requestCount: son contadores del servidor', async () => {
    const res = await validateDto(UpdateAssetDto, { viewCount: 99999 });
    expect(res.ok).toBe(false);
  });
});

describe('meta', () => {
  probarQueElHarnessDetectaReglas(validateDto, UpdateAssetDto, { status: 'inventado' });
});

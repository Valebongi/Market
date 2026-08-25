import 'reflect-metadata';
import { AssetsService } from '../../../backend/assets-service/src/modules/assets/assets.service';
import { esperarStatus, esperarOk, FORBIDDEN, NOT_FOUND, CONFLICT } from '../../support/http-errors';

/**
 * AUTORIZACION: solo el titular (o un admin) modifica su activo.
 *
 * Se instancia el AssetsService REAL. Lo unico sustituido es Prisma, que es el
 * almacen de datos, NO la frontera que estamos verificando: la frontera es la
 * comparacion `asset.ownerId !== userId`, y esa corre de verdad.
 * El fake ademas registra las escrituras, asi podemos afirmar que ante un 403
 * NO hubo update (un throw despues de escribir seria igual de grave).
 */

const TITULAR = 'owner-111';
const INTRUSO = 'intruso-222';
const ADMIN = 'admin-333';

interface FakeAsset {
  id: string;
  ownerId: string;
  status: string;
  deletedAt: Date | null;
  allowedUses: string[];
  restrictions: string[];
}

function crearFakePrisma(asset: Partial<FakeAsset> = {}) {
  const registro: FakeAsset = {
    id: 'asset-1',
    ownerId: TITULAR,
    status: 'draft',
    deletedAt: null,
    allowedUses: [],
    restrictions: [],
    ...asset,
  };

  const escrituras: Array<{ op: string; data: any }> = [];

  const prisma: any = {
    asset: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.id && where.id !== registro.id) return null;
        if (where.deletedAt === null && registro.deletedAt !== null) return null;
        if (where.ownerId && where.ownerId !== registro.ownerId) return null;
        return { ...registro };
      }),
      update: jest.fn(async ({ data }: any) => {
        escrituras.push({ op: 'asset.update', data });
        Object.assign(registro, data);
        return { ...registro, tags: [], links: [], attachments: [] };
      }),
    },
    assetFlag: {
      create: jest.fn(async ({ data }: any) => {
        escrituras.push({ op: 'assetFlag.create', data });
        return data;
      }),
      count: jest.fn(async () => 0),
    },
  };

  return { prisma, registro, escrituras };
}

describe('AssetsService.update - solo el titular o un admin', () => {
  it('permite al TITULAR actualizar su activo', async () => {
    const { prisma } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarOk(() => service.update('asset-1', TITULAR, 'asset_owner', { title: 'Nuevo titulo' } as any));
  });

  it('RECHAZA a un tercero que no es el titular', async () => {
    const { prisma } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.update('asset-1', INTRUSO, 'asset_owner', { title: 'Secuestrado' } as any), FORBIDDEN);
  });

  it('no escribe NADA cuando rechaza al tercero', async () => {
    const { prisma, escrituras } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.update('asset-1', INTRUSO, 'asset_owner', { title: 'Secuestrado' } as any), FORBIDDEN);
    expect(escrituras).toEqual([]);
  });

  it('permite a un ADMIN actualizar un activo ajeno (moderacion)', async () => {
    const { prisma } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarOk(() => service.update('asset-1', ADMIN, 'admin', { status: 'archived' } as any));
  });

  it('404 si el activo no existe', async () => {
    const { prisma } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.update('inexistente', TITULAR, 'asset_owner', {} as any), NOT_FOUND);
  });

  it('404 si el activo esta borrado (soft delete)', async () => {
    const { prisma } = crearFakePrisma({ deletedAt: new Date() });
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.update('asset-1', TITULAR, 'asset_owner', {} as any), NOT_FOUND);
  });

  it('sobre un activo borrado el 404 gana sobre el 403 (no revela existencia)', async () => {
    const { prisma } = crearFakePrisma({ deletedAt: new Date() });
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.update('asset-1', INTRUSO, 'asset_owner', {} as any), NOT_FOUND);
  });
});

describe('AssetsService.archive - solo el titular o un admin', () => {
  it('permite al titular archivar', async () => {
    const { prisma } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarOk(() => service.archive('asset-1', TITULAR, 'asset_owner'));
  });

  it('RECHAZA a un tercero', async () => {
    const { prisma } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.archive('asset-1', INTRUSO, 'entrepreneur'), FORBIDDEN);
  });

  it('no escribe nada cuando rechaza', async () => {
    const { prisma, escrituras } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.archive('asset-1', INTRUSO, 'entrepreneur'), FORBIDDEN);
    expect(escrituras).toEqual([]);
  });

  it('permite a un admin archivar (moderacion)', async () => {
    const { prisma } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarOk(() => service.archive('asset-1', ADMIN, 'admin'));
  });
});

describe('AssetsService.remove - solo el titular o un admin', () => {
  it('permite al titular borrar, y es SOFT delete', async () => {
    const { prisma, escrituras } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await expect(service.remove('asset-1', TITULAR, 'asset_owner')).resolves.toEqual({
      message: 'Asset deleted successfully',
    });
    expect(escrituras[0].op).toBe('asset.update');
    expect(escrituras[0].data.deletedAt).toBeInstanceOf(Date);
  });

  it('RECHAZA a un tercero y no borra nada', async () => {
    const { prisma, escrituras } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.remove('asset-1', INTRUSO, 'entrepreneur'), FORBIDDEN);
    expect(escrituras).toEqual([]);
  });

  it('permite a un admin borrar', async () => {
    const { prisma } = crearFakePrisma();
    const service = new AssetsService(prisma);
    await esperarOk(() => service.remove('asset-1', ADMIN, 'admin'));
  });
});

describe('AssetsService.publish - reglas de negocio', () => {
  it('el titular publica un borrador y se sella publishedAt', async () => {
    const { prisma, escrituras } = crearFakePrisma({ status: 'draft' });
    const service = new AssetsService(prisma);
    await service.publish('asset-1', TITULAR);
    expect(escrituras[0].data.status).toBe('published');
    expect(escrituras[0].data.publishedAt).toBeInstanceOf(Date);
  });

  it('un tercero recibe 404: el filtro ownerId va en el WHERE y no revela existencia', async () => {
    const { prisma } = crearFakePrisma({ status: 'draft' });
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.publish('asset-1', INTRUSO), NOT_FOUND);
  });

  it('publish NO tiene bypass de admin, a diferencia de update/archive/remove', async () => {
    // Divergencia deliberada del codigo actual. Si alguien agrega el bypass,
    // este test avisa para que sea una decision consciente y no un descuido.
    const { prisma } = crearFakePrisma({ status: 'draft' });
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.publish('asset-1', ADMIN), NOT_FOUND);
  });

  it('rechaza republicar un activo ya publicado', async () => {
    const { prisma } = crearFakePrisma({ status: 'published' });
    const service = new AssetsService(prisma);
    await esperarStatus(() => service.publish('asset-1', TITULAR), CONFLICT);
  });
});

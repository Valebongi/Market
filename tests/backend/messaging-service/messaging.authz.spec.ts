import 'reflect-metadata';
import { MessagingService } from '../../../backend/messaging-service/src/modules/messaging/messaging.service';
import { esperarStatus, esperarOk, FORBIDDEN, NOT_FOUND, CONFLICT } from '../../support/http-errors';

/**
 * AUTORIZACION: solo las dos partes de una solicitud leen y escriben en su hilo.
 *
 * Se instancia el MessagingService REAL. Solo Prisma esta sustituido (es el
 * almacen, no la frontera). Las comparaciones `requesterId !== userId &&
 * ownerId !== userId` corren de verdad.
 */

const TITULAR = 'owner-111';
const SOLICITANTE = 'requester-222';
const TERCERO = 'curioso-333';
const ADMIN = 'admin-444';

interface FakeRequest {
  id: string;
  assetId: string;
  assetTitle: string;
  requesterId: string;
  ownerId: string;
  status: string;
  deletedAt: Date | null;
}

function crearFakePrisma(req: Partial<FakeRequest> = {}) {
  const registro: FakeRequest = {
    id: 'req-1',
    assetId: 'asset-1',
    assetTitle: 'Marca registrada Da Vinci',
    requesterId: SOLICITANTE,
    ownerId: TITULAR,
    status: 'pending',
    deletedAt: null,
    ...req,
  };

  const escrituras: Array<{ op: string; data: any }> = [];

  const prisma: any = {
    licenseRequest: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.id && where.id !== registro.id) return null;
        if (where.deletedAt === null && registro.deletedAt !== null) return null;
        if (where.requesterId && where.requesterId !== registro.requesterId) return null;
        if (where.status && where.status !== registro.status) return null;
        return { ...registro, messages: [] };
      }),
      update: jest.fn(async ({ data }: any) => {
        escrituras.push({ op: 'licenseRequest.update', data });
        Object.assign(registro, data);
        return { ...registro };
      }),
      create: jest.fn(async ({ data }: any) => {
        escrituras.push({ op: 'licenseRequest.create', data });
        return { ...registro, ...data, messages: [] };
      }),
    },
    message: {
      create: jest.fn(async ({ data }: any) => {
        escrituras.push({ op: 'message.create', data });
        return { id: 'msg-1', ...data };
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
      count: jest.fn(async () => 0),
    },
    notification: {
      create: jest.fn(async ({ data }: any) => {
        escrituras.push({ op: 'notification.create', data });
        return data;
      }),
    },
  };

  return { prisma, registro, escrituras };
}

describe('findRequestById - solo las partes leen la conversacion', () => {
  it('el SOLICITANTE puede leer su solicitud', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarOk(() => service.findRequestById('req-1', SOLICITANTE));
  });

  it('el TITULAR puede leer la solicitud sobre su activo', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarOk(() => service.findRequestById('req-1', TITULAR));
  });

  it('RECHAZA a un tercero ajeno a la negociacion', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarStatus(() => service.findRequestById('req-1', TERCERO), FORBIDDEN);
  });

  it('RECHAZA tambien a un admin: la mensajeria privada no tiene bypass de rol', async () => {
    // findRequestById ni siquiera recibe el rol. Es a proposito: el panel de
    // admin ve metadatos de solicitudes, no el contenido de los hilos.
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarStatus(() => service.findRequestById('req-1', ADMIN), FORBIDDEN);
  });

  it('no marca mensajes como leidos cuando rechaza al tercero', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarStatus(() => service.findRequestById('req-1', TERCERO), FORBIDDEN);
    expect(prisma.message.updateMany).not.toHaveBeenCalled();
  });

  it('404 si la solicitud no existe', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarStatus(() => service.findRequestById('inexistente', TITULAR), NOT_FOUND);
  });
});

describe('sendMessage - solo las partes escriben', () => {
  it('el solicitante puede escribir', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarOk(() => service.sendMessage('req-1', SOLICITANTE, { content: 'Hola' } as any));
  });

  it('el titular puede responder', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarOk(() => service.sendMessage('req-1', TITULAR, { content: 'Te respondo' } as any));
  });

  it('RECHAZA a un tercero y NO persiste el mensaje', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarStatus(() => service.sendMessage('req-1', TERCERO, { content: 'Me cuelo' } as any), FORBIDDEN);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it.each(['closed', 'rejected'])(
    'RECHAZA escribir en una conversacion en estado "%s"',
    async (status) => {
      const { prisma } = crearFakePrisma({ status });
      const service = new MessagingService(prisma);
      await esperarStatus(() => service.sendMessage('req-1', SOLICITANTE, { content: 'Reabro?' } as any), FORBIDDEN);
      expect(prisma.message.create).not.toHaveBeenCalled();
    },
  );

  it('permite escribir en una conversacion aceptada', async () => {
    const { prisma } = crearFakePrisma({ status: 'accepted' });
    const service = new MessagingService(prisma);
    await esperarOk(() => service.sendMessage('req-1', SOLICITANTE, { content: 'Coordinamos' } as any));
  });
});

describe('updateStatus - quien puede mover la negociacion', () => {
  it.each(['accepted', 'rejected'])(
    'solo el TITULAR puede pasar a "%s"',
    async (status) => {
      const { prisma } = crearFakePrisma();
      const service = new MessagingService(prisma);
      await esperarOk(() => service.updateStatus('req-1', TITULAR, { status } as any));
    },
  );

  it.each(['accepted', 'rejected'])(
    'el SOLICITANTE no puede pasar a "%s" (se auto-aceptaria la licencia)',
    async (status) => {
      const { prisma, escrituras } = crearFakePrisma();
      const service = new MessagingService(prisma);
      await esperarStatus(() => service.updateStatus('req-1', SOLICITANTE, { status } as any), FORBIDDEN);
      expect(escrituras).toEqual([]);
    },
  );

  it('ambas partes pueden cerrar', async () => {
    for (const parte of [TITULAR, SOLICITANTE]) {
      const { prisma } = crearFakePrisma();
      const service = new MessagingService(prisma);
      await esperarOk(() => service.updateStatus('req-1', parte, { status: 'closed' } as any));
    }
  });

  it('un tercero no puede cerrar una negociacion ajena', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarStatus(() => service.updateStatus('req-1', TERCERO, { status: 'closed' } as any), FORBIDDEN);
  });

  it.each(['closed', 'rejected'])(
    '"%s" es TERMINAL: no se puede reabrir a accepted',
    async (statusInicial) => {
      // Sin este chequeo el titular reabria una negociacion ya cerrada, lo que
      // reescribe el registro del cierre declarado (base de la comision).
      const { prisma, escrituras } = crearFakePrisma({ status: statusInicial });
      const service = new MessagingService(prisma);
      await esperarStatus(() => service.updateStatus('req-1', TITULAR, { status: 'accepted' } as any), CONFLICT);
      expect(escrituras).toEqual([]);
    },
  );

  it('rechaza una transicion al mismo estado en el que ya esta', async () => {
    const { prisma } = crearFakePrisma({ status: 'accepted' });
    const service = new MessagingService(prisma);
    await esperarStatus(() => service.updateStatus('req-1', TITULAR, { status: 'accepted' } as any), CONFLICT);
  });

  it('sella closedAt al cerrar y al rechazar', async () => {
    for (const status of ['closed', 'rejected']) {
      const { prisma, escrituras } = crearFakePrisma();
      const service = new MessagingService(prisma);
      await service.updateStatus('req-1', TITULAR, { status } as any);
      expect(escrituras[0].data.closedAt).toBeInstanceOf(Date);
    }
  });

  it('NO sella closedAt al aceptar (la negociacion sigue viva)', async () => {
    const { prisma, escrituras } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await service.updateStatus('req-1', TITULAR, { status: 'accepted' } as any);
    expect(escrituras[0].data.closedAt).toBeUndefined();
  });
});

describe('createRequest - reglas de negocio', () => {
  it('impide solicitar el propio activo', async () => {
    const { prisma } = crearFakePrisma();
    const service = new MessagingService(prisma);
    await esperarStatus(() => service.createRequest(TITULAR, { assetId: 'asset-1', assetTitle: 'Marca registrada Da Vinci', ownerId: TITULAR, initialMessage: 'Me interesa mi propio activo, que raro.', } as any), CONFLICT);
  });

  it('impide una segunda solicitud pendiente sobre el mismo activo', async () => {
    const { prisma } = crearFakePrisma({ status: 'pending' });
    const service = new MessagingService(prisma);
    await esperarStatus(() => service.createRequest(SOLICITANTE, { assetId: 'asset-1', assetTitle: 'Marca registrada Da Vinci', ownerId: TITULAR, initialMessage: 'Insisto con la misma solicitud de licencia.', } as any), CONFLICT);
  });

  it('el requesterId sale del header, nunca del body', async () => {
    // El controller pasa x-user-id como primer argumento. Aunque el body
    // trajera otro requesterId, se ignora.
    const { prisma, escrituras } = crearFakePrisma({ status: 'accepted' });
    const service = new MessagingService(prisma);
    await service.createRequest(SOLICITANTE, {
      assetId: 'asset-2',
      assetTitle: 'Otro activo',
      ownerId: TITULAR,
      initialMessage: 'Quiero licenciar este otro activo distinto.',
      requesterId: 'usuario-falseado',
    } as any);
    const creacion = escrituras.find((e) => e.op === 'licenseRequest.create');
    expect(creacion.data.requesterId).toBe(SOLICITANTE);
  });
});

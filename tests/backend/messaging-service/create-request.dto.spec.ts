import 'reflect-metadata';
import {
  CreateRequestDto,
  SendMessageDto,
  UpdateRequestStatusDto,
} from '../../../backend/messaging-service/src/modules/messaging/dto/create-request.dto';
import { crearValidador, probarQueElHarnessDetectaReglas } from '../../support/validation';

const validateDto = crearValidador('messaging-service');

/**
 * CONTRATO: frontend `requestsService.create()` (services/requests.service.ts:21)
 * y el tipo `CreateLicenseRequestPayload` (frontend/types/index.ts:145-154)
 * -> POST /requests
 *
 * Bug historico que cubre: el service del front estaba tipado con campos
 * distintos a los del CreateRequestDto real, y el tipo `LicenseRequest` decia
 * `message` donde el backend espera `initialMessage`.
 */

const UUID_ASSET = '3f8a1c2e-9b7d-4e5a-8c1f-2d6b4a9e7c30';
const UUID_OWNER = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** Espejo de `CreateLicenseRequestPayload`. */
function payloadDelFront(overrides: Record<string, unknown> = {}) {
  return {
    assetId: UUID_ASSET,
    assetTitle: 'Marca registrada Da Vinci',
    ownerId: UUID_OWNER,
    initialMessage:
      'Hola, me interesa licenciar esta marca para un emprendimiento gastronomico en Cordoba.',
    ...overrides,
  };
}

describe('CreateRequestDto <- CreateLicenseRequestPayload del frontend', () => {
  it('acepta el payload exacto que arma requestsService.create()', async () => {
    const res = await validateDto(CreateRequestDto, payloadDelFront());
    expect(res.errors).toEqual([]);
  });

  it('acepta proposedTerms opcional', async () => {
    const res = await validateDto(
      CreateRequestDto,
      payloadDelFront({ proposedTerms: 'Pago en 3 cuotas, regalia del 5%.' }),
    );
    expect(res.errors).toEqual([]);
  });

  /**
   * REGRESION: el tipo del front decia `message`. Con forbidNonWhitelisted el
   * backend devolvia 400 y ademas faltaba el campo obligatorio.
   */
  it('rechaza `message` en lugar de `initialMessage`', async () => {
    const { initialMessage, ...resto } = payloadDelFront();
    const res = await validateDto(CreateRequestDto, {
      ...resto,
      message: initialMessage,
    });
    expect(res.ok).toBe(false);
    const errores = res.errors.join(' ');
    expect(errores).toMatch(/message/);
  });

  it('exige assetTitle: la solicitud denormaliza el titulo del activo', async () => {
    const { assetTitle, ...sinTitulo } = payloadDelFront();
    const res = await validateDto(CreateRequestDto, sinTitulo);
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/assetTitle/);
  });

  it('exige ownerId: el front lo tiene que mandar (no hay llamada servicio-a-servicio)', async () => {
    const { ownerId, ...sinOwner } = payloadDelFront();
    const res = await validateDto(CreateRequestDto, sinOwner);
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/ownerId/);
  });

  it.each([
    ['assetId', 'no-es-uuid'],
    ['ownerId', '12345'],
  ])('rechaza %s que no sea UUID', async (campo, valor) => {
    const res = await validateDto(CreateRequestDto, payloadDelFront({ [campo]: valor }));
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(new RegExp(campo));
  });

  it('rechaza initialMessage de menos de 20 caracteres', async () => {
    const res = await validateDto(CreateRequestDto, payloadDelFront({ initialMessage: 'Hola' }));
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/initialMessage/);
  });

  it('rechaza initialMessage de mas de 2000 caracteres', async () => {
    const res = await validateDto(
      CreateRequestDto,
      payloadDelFront({ initialMessage: 'a'.repeat(2001) }),
    );
    expect(res.ok).toBe(false);
  });

  it('rechaza requesterId en el body: lo impone el header x-user-id del gateway', async () => {
    // messaging.controller.ts:27 toma el requester del header, nunca del body.
    const res = await validateDto(
      CreateRequestDto,
      payloadDelFront({ requesterId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }),
    );
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/requesterId/);
  });

  it('rechaza status en el body: una solicitud nace siempre en pending', async () => {
    const res = await validateDto(CreateRequestDto, payloadDelFront({ status: 'accepted' }));
    expect(res.ok).toBe(false);
  });
});

describe('SendMessageDto <- requestsService.sendMessage()', () => {
  it('acepta { content } que es exactamente lo que manda el front', async () => {
    // services/requests.service.ts:27 -> body: JSON.stringify({ content })
    const res = await validateDto(SendMessageDto, { content: 'Perfecto, avancemos.' });
    expect(res.errors).toEqual([]);
  });

  it('rechaza contenido vacio', async () => {
    const res = await validateDto(SendMessageDto, { content: '' });
    expect(res.ok).toBe(false);
  });

  it('rechaza mas de 5000 caracteres', async () => {
    const res = await validateDto(SendMessageDto, { content: 'a'.repeat(5001) });
    expect(res.ok).toBe(false);
  });

  it('rechaza `message` como nombre de campo', async () => {
    const res = await validateDto(SendMessageDto, { message: 'hola' });
    expect(res.ok).toBe(false);
  });
});

describe('UpdateRequestStatusDto <- requestsService.updateStatus()', () => {
  /** Espejo de `RequestStatusTransition` (frontend/types/index.ts:121). */
  it.each(['accepted', 'rejected', 'closed'])('acepta la transicion "%s"', async (status) => {
    const res = await validateDto(UpdateRequestStatusDto, { status });
    expect(res.errors).toEqual([]);
  });

  it('rechaza volver a "pending": no es una transicion valida', async () => {
    // El front lo documenta en requests.service.ts:30-34; aca se fija del lado backend.
    const res = await validateDto(UpdateRequestStatusDto, { status: 'pending' });
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/status/);
  });

  it('rechaza un estado inventado', async () => {
    const res = await validateDto(UpdateRequestStatusDto, { status: 'cancelled' });
    expect(res.ok).toBe(false);
  });
});

describe('meta', () => {
  probarQueElHarnessDetectaReglas(validateDto, CreateRequestDto, { assetId: 'no-uuid' });
});

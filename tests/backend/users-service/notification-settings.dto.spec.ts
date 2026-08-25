import 'reflect-metadata';
import {
  UpdateNotificationSettingsDto,
  UpdateProfileDto,
  UpdateStatusDto,
} from '../../../backend/users-service/src/modules/users/dto/update-profile.dto';
import { crearValidador, probarQueElHarnessDetectaReglas } from '../../support/validation';

const validateDto = crearValidador('users-service');

/**
 * CONTRATO: frontend/app/dashboard/settings/page.tsx -> PATCH /users/:id/notifications
 *
 * Bug historico que cubre (el mas silencioso de todos): la pantalla de ajustes
 * mandaba `newRequest` / `newMessage` / `assetUpdates` / `newsletter` /
 * `weeklyReport`. Ninguna de esas claves existe en el DTO ni en el modelo
 * Prisma, asi que las preferencias NUNCA se guardaban. El usuario movia el
 * switch, veia "guardado" y al recargar volvia todo atras.
 */

/** Claves que hoy tiene el estado `notifications` en settings/page.tsx:76-81. */
const CLAVES_QUE_MANDA_LA_UI = [
  'emailRequests',
  'emailMessages',
  'emailMarketing',
  'emailDigest',
];

/** Claves del bug: las que mandaba la UI vieja. */
const CLAVES_DEL_BUG = [
  'newRequest',
  'newMessage',
  'assetUpdates',
  'newsletter',
  'weeklyReport',
];

describe('UpdateNotificationSettingsDto <- pantalla de ajustes', () => {
  it('acepta el objeto completo que manda handleSaveNotifications()', async () => {
    const res = await validateDto(UpdateNotificationSettingsDto, {
      emailRequests: true,
      emailMessages: true,
      emailMarketing: false,
      emailDigest: true,
    });
    expect(res.errors).toEqual([]);
  });

  it.each(CLAVES_QUE_MANDA_LA_UI)('acepta la clave "%s" que expone la UI', async (clave) => {
    const res = await validateDto(UpdateNotificationSettingsDto, { [clave]: true });
    expect(res.errors).toEqual([]);
  });

  it('acepta emailSecurity aunque la UI hoy no lo exponga', async () => {
    const res = await validateDto(UpdateNotificationSettingsDto, { emailSecurity: true });
    expect(res.errors).toEqual([]);
  });

  /**
   * REGRESION. Lo importante no es solo que se rechacen: es que se rechacen
   * RUIDOSAMENTE (400) en vez de descartarse en silencio. Con
   * `forbidNonWhitelisted: true` el backend grita; sin el, volveria el bug.
   */
  it.each(CLAVES_DEL_BUG)(
    'rechaza con 400 la clave fantasma "%s" en vez de descartarla en silencio',
    async (clave) => {
      const res = await validateDto(UpdateNotificationSettingsDto, { [clave]: true });
      expect(res.ok).toBe(false);
      expect(res.errors.join(' ')).toMatch(new RegExp(clave));
    },
  );

  it('rechaza el payload viejo completo de la UI con bug', async () => {
    const payloadViejo = Object.fromEntries(CLAVES_DEL_BUG.map((k) => [k, true]));
    const res = await validateDto(UpdateNotificationSettingsDto, payloadViejo);
    expect(res.ok).toBe(false);
    // Las cinco claves tienen que aparecer reportadas, no solo la primera.
    for (const clave of CLAVES_DEL_BUG) {
      expect(res.errors.join(' ')).toMatch(new RegExp(clave));
    }
  });

  it('rechaza un valor no booleano', async () => {
    const res = await validateDto(UpdateNotificationSettingsDto, { emailRequests: 'true' });
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/emailRequests/);
  });

  it('acepta un update parcial de una sola clave', async () => {
    const res = await validateDto(UpdateNotificationSettingsDto, { emailMarketing: false });
    expect(res.errors).toEqual([]);
  });
});

describe('UpdateProfileDto <- UpdateUserProfilePayload del frontend', () => {
  /** Espejo de `UpdateUserProfilePayload` (frontend/types/index.ts:232-242). */
  it('acepta el payload que arma la pantalla de ajustes', async () => {
    const res = await validateDto(UpdateProfileDto, {
      displayName: 'Valentina Rossi',
      bio: 'Titular de marcas gastronomicas.',
      website: 'https://ejemplo.com',
      linkedin: 'https://linkedin.com/in/ejemplo',
      twitter: 'https://x.com/ejemplo',
      github: 'https://github.com/ejemplo',
      location: 'Cordoba, Argentina',
    });
    expect(res.errors).toEqual([]);
  });

  it('acepta contactEmail y avatarUrl', async () => {
    const res = await validateDto(UpdateProfileDto, {
      contactEmail: 'contacto@ejemplo.com',
      avatarUrl: 'https://ejemplo.com/avatar.png',
    });
    expect(res.errors).toEqual([]);
  });

  /**
   * DEUDA CONOCIDA: auth-service usa `linkedinUrl`/`twitterUrl`/`githubUrl`
   * (AuthProfile) y users-service usa `linkedin`/`twitter`/`github`
   * (UpdateProfileDto). Son dos fuentes de verdad distintas.
   * Este test fija cual acepta users-service para que el dia que se unifiquen
   * no se rompa en silencio.
   */
  it.each(['linkedinUrl', 'twitterUrl', 'githubUrl'])(
    'rechaza "%s" (nombre de auth-service, no de users-service)',
    async (clave) => {
      const res = await validateDto(UpdateProfileDto, { [clave]: 'https://ejemplo.com' });
      expect(res.ok).toBe(false);
    },
  );

  it('rechaza contactEmail invalido', async () => {
    const res = await validateDto(UpdateProfileDto, { contactEmail: 'no-es-un-email' });
    expect(res.ok).toBe(false);
  });

  it('rechaza role/status: un usuario no puede auto-promoverse por PUT de perfil', async () => {
    const conRole = await validateDto(UpdateProfileDto, { role: 'admin' });
    expect(conRole.ok).toBe(false);
    const conStatus = await validateDto(UpdateProfileDto, { status: 'active' });
    expect(conStatus.ok).toBe(false);
  });

  it('rechaza assetCount/licenseCount: son contadores del servidor', async () => {
    const res = await validateDto(UpdateProfileDto, { assetCount: 999 });
    expect(res.ok).toBe(false);
  });
});

describe('UpdateStatusDto (suspension de cuenta, admin)', () => {
  it.each(['active', 'suspended'])('acepta status="%s"', async (status) => {
    const res = await validateDto(UpdateStatusDto, { status });
    expect(res.errors).toEqual([]);
  });

  it('rechaza un status inventado', async () => {
    const res = await validateDto(UpdateStatusDto, { status: 'banned' });
    expect(res.ok).toBe(false);
  });
});

describe('meta', () => {
  probarQueElHarnessDetectaReglas(validateDto, UpdateNotificationSettingsDto, {
    emailRequests: 'no-es-booleano',
  });
});

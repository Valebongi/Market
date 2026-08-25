import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * BOOTSTRAP DEL PRIMER ADMIN
 * ════════════════════════════════════════════════════════════════════════════
 *
 * EL PROBLEMA
 * `RegisterDto` no acepta `role: 'admin'` (y no debe aceptarlo: sería
 * auto-promoción abierta a internet). `PATCH /users/:userId/role` exige rol
 * admin. Sin un admin previo, el sistema no puede fabricar el primero: no hay
 * camino desde "cero admins" hasta "un admin". Y sin proxy TCP a la base de
 * Railway tampoco hay salida por SQL.
 *
 * POR QUÉ UN HOOK DE ARRANQUE Y NO UN ENDPOINT
 * La alternativa obvia es `POST /auth/bootstrap-admin` protegido por un token.
 * Se descartó: un endpoint es superficie de red PERMANENTE — queda publicado,
 * se puede sondear, aparece en el routing del gateway, y su seguridad pasa a
 * depender de que el token no se filtre nunca. Este hook no escucha nada: solo
 * lo puede disparar quien ya controla las variables de entorno del servicio, y
 * ése ya tiene `JWT_SECRET`, o sea que ya podría firmarse un token de admin a
 * mano. El mecanismo no agrega un nivel de privilegio que no existiera.
 *
 * POR QUÉ ES DE UN SOLO USO Y NO "PROMOVER EN CADA ARRANQUE"
 * Un bootstrap que promueve en cada arranque no es un bootstrap: es una puerta
 * trasera cuya llave es una variable que nadie borra. Consecuencias concretas
 * de la versión "cada arranque": si mañana se le baja el rol a esa cuenta, el
 * siguiente redeploy se lo devuelve en silencio; y quien consiga escribir la
 * variable consigue admin de forma repetible. Acá la ejecución se registra en
 * `admin_bootstraps`, con un índice único sobre una columna constante: después
 * de la primera corrida la variable queda INERTE aunque siga seteada para
 * siempre. Dejarla puesta no es una vulnerabilidad, es solo ruido.
 *
 * IDEMPOTENCIA
 * Tres capas:
 *   1. Índice único `admin_bootstraps.lock` → como mucho una fila, garantizado
 *      por Postgres y no por un SELECT previo. Dos instancias arrancando a la
 *      vez (despliegue rolling) compiten por el INSERT; una gana, la otra ve
 *      P2002 y aborta sin efectos.
 *   2. Todo el bootstrap corre DENTRO de una transacción que empieza tomando
 *      esa marca. Si algo falla, la marca se revierte con el resto: no se
 *      "quema" el único disparo por un error de configuración corregible.
 *   3. Si ya existe cualquier admin activo, no se promueve a nadie y la marca
 *      se escribe igual con `skipped_existing_admin`. O sea: desplegar esto en
 *      una instalación que YA tiene admin desarma el mecanismo para siempre sin
 *      tocar un solo rol.
 *
 * QUÉ NO HACE
 *   - No cambia la contraseña de una cuenta existente. Si el email ya está
 *     registrado, `BOOTSTRAP_ADMIN_PASSWORD` se ignora por completo. Un
 *     bootstrap que pisa contraseñas es un mecanismo de toma de cuentas.
 *   - No revive cuentas con `deletedAt` ni promueve cuentas `suspended`.
 *   - No toca `role` de nadie más que del email objetivo.
 *
 * LA DEUDA DE DOBLE FUENTE DE VERDAD
 * `role` vive en `users.role` (acá) y en `user_profiles.role` (users-service).
 * El que MANDA es éste: el JWT lo firma auth-service y el gateway lee el rol
 * del JWT. El de users-service es el que muestra el listado del panel. Este
 * bootstrap escribe los dos para no dejar un admin a medias, pero NO resuelve
 * la deuda ni la empeora: la escritura cruzada viaja por la única llamada
 * servicio-a-servicio que ya existía (`POST /users/profiles`), con un flag
 * explícito y acotado a este caso. Si la sincronización falla, el admin YA
 * funciona (el gateway solo mira el JWT) y queda pendiente de reintento.
 */

/** Falla de configuración corregible: revierte la transacción y NO gasta el disparo. */
class BootstrapAbort extends Error {}

const LOG = '[bootstrap-admin]';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.run();
    } catch (err) {
      // Nunca tumbar el arranque del servicio por el bootstrap: el login de
      // todos los demás usuarios no depende de esto.
      console.error(`${LOG} error inesperado, el servicio arranca igual:`, (err as Error)?.message);
    }
  }

  private async run(): Promise<void> {
    const rawEmail = this.config.get<string>('BOOTSTRAP_ADMIN_EMAIL')?.trim();
    if (!rawEmail) return; // desarmado: ni un log, es el estado normal.

    // Normalizado solo para comparar y para el registro de auditoría. Al CREAR
    // se usa el email tal cual lo escribió el operador, para no divergir de
    // cómo lo guarda el registro normal.
    const email = rawEmail.toLowerCase();

    const marca = await this.prisma.adminBootstrap.findFirst();
    if (marca) {
      console.log(
        `${LOG} ya se ejecutó el ${marca.executedAt.toISOString()} ` +
          `(resultado=${marca.outcome}, email=${marca.email}). La variable está inerte.`,
      );
      // Único trabajo pendiente posible: el rol quedó escrito en auth pero no
      // se pudo replicar al perfil de users-service. Se reintenta solo eso.
      if (!marca.profileSyncedAt && marca.userId && marca.outcome !== 'skipped_existing_admin') {
        console.warn(`${LOG} el perfil de users-service quedó sin sincronizar; reintentando.`);
        await this.sincronizarPerfil(marca.userId, marca.email);
      }
      return;
    }

    const password = this.config.get<string>('BOOTSTRAP_ADMIN_PASSWORD') ?? '';
    const nombre =
      this.config.get<string>('BOOTSTRAP_ADMIN_NAME')?.trim() || rawEmail.split('@')[0];

    // El hash se calcula FUERA de la transacción: bcrypt con coste 12 tarda
    // cientos de milisegundos y no tiene por qué consumir el timeout de la tx.
    let passwordHash: string | null = null;
    if (password) {
      if (password.length < 12) {
        console.error(
          `${LOG} abortado: BOOTSTRAP_ADMIN_PASSWORD tiene menos de 12 caracteres. ` +
            `Corregila y reiniciá; el bootstrap sigue disponible.`,
        );
        return;
      }
      passwordHash = await bcrypt.hash(password, 12);
    }

    let resultado: { outcome: string; userId: string | null; displayName: string };

    try {
      resultado = await this.prisma.$transaction(async (tx) => {
        // Tomar la marca es lo PRIMERO: si otra instancia ya la tiene, esto
        // explota con P2002 acá y no se ejecuta nada más.
        await tx.adminBootstrap.create({
          data: { lock: 1, email, outcome: 'running' },
        });

        const adminsActivos = await tx.user.count({
          where: { role: 'admin', deletedAt: null },
        });
        if (adminsActivos > 0) {
          await tx.adminBootstrap.update({
            where: { lock: 1 },
            data: { outcome: 'skipped_existing_admin' },
          });
          return { outcome: 'skipped_existing_admin', userId: null, displayName: nombre };
        }

        // Búsqueda case-insensitive a propósito: el registro guarda el email
        // tal cual lo tipeó el usuario, así que un `findUnique` exacto contra
        // la variable podría no encontrar la cuenta y terminar creando un
        // DUPLICADO con el mismo email en otra capitalización.
        const objetivo = await tx.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          orderBy: { createdAt: 'asc' },
          include: { profile: true },
        });

        if (objetivo) {
          if (objetivo.deletedAt) {
            throw new BootstrapAbort(
              'la cuenta con ese email está dada de baja; el bootstrap no revive cuentas',
            );
          }
          if (objetivo.status !== 'active') {
            throw new BootstrapAbort(
              `la cuenta con ese email está en estado "${objetivo.status}"; solo se promueven cuentas activas`,
            );
          }
          if (objetivo.role === 'admin') {
            // No debería pasar (el count de arriba lo habría atajado), pero si
            // pasa se registra como ejecutado y se sigue a la sincronización.
            await tx.adminBootstrap.update({
              where: { lock: 1 },
              data: { outcome: 'already_admin', userId: objetivo.id },
            });
            return {
              outcome: 'already_admin',
              userId: objetivo.id,
              displayName: objetivo.profile?.displayName ?? nombre,
            };
          }

          // OJO: no se toca `passwordHash`. Promover no es resetear.
          await tx.user.update({
            where: { id: objetivo.id },
            data: { role: 'admin' },
          });
          await tx.adminBootstrap.update({
            where: { lock: 1 },
            data: { outcome: 'promoted', userId: objetivo.id },
          });
          return {
            outcome: 'promoted',
            userId: objetivo.id,
            displayName: objetivo.profile?.displayName ?? nombre,
          };
        }

        if (!passwordHash) {
          throw new BootstrapAbort(
            'no hay ninguna cuenta con ese email y BOOTSTRAP_ADMIN_PASSWORD no está seteada. ' +
              'Registrá la cuenta por la app (recomendado) o seteá la contraseña y reiniciá',
          );
        }

        const creado = await tx.user.create({
          data: {
            email: rawEmail,
            passwordHash,
            role: 'admin',
            status: 'active',
            profile: { create: { displayName: nombre, contactEmail: rawEmail } },
          },
        });
        await tx.adminBootstrap.update({
          where: { lock: 1 },
          data: { outcome: 'created', userId: creado.id, userCreated: true },
        });
        return { outcome: 'created', userId: creado.id, displayName: nombre };
      });
    } catch (err) {
      if (err instanceof BootstrapAbort) {
        console.error(
          `${LOG} abortado: ${err.message}. No se registró la marca: el bootstrap sigue disponible.`,
        );
        return;
      }
      if ((err as { code?: string })?.code === 'P2002') {
        console.log(`${LOG} otra instancia lo ejecutó en paralelo; esta no hace nada.`);
        return;
      }
      throw err;
    }

    if (resultado.outcome === 'skipped_existing_admin') {
      console.warn(
        `${LOG} NO se promovió a nadie: ya existe al menos un admin activo. ` +
          `Usá el panel para cambiar roles. El mecanismo queda desarmado de forma permanente.`,
      );
      return;
    }

    // Auditoría. Se registran email y userId (identidad, necesaria para saber
    // QUIÉN quedó como admin) y NUNCA la contraseña ni el token interno.
    console.warn(
      `${LOG} EJECUTADO (${resultado.outcome}): ${email} → role=admin en auth-service ` +
        `(userId=${resultado.userId}). ` +
        `Borrá BOOTSTRAP_ADMIN_PASSWORD de las variables del servicio.`,
    );

    await this.sincronizarPerfil(resultado.userId!, email, resultado.displayName);
  }

  /**
   * Replica el rol al perfil de users-service.
   *
   * Viaja por `POST /users/profiles`, la ÚNICA llamada servicio-a-servicio del
   * sistema, con el flag `bootstrapAdmin`. No se abre un endpoint nuevo ni un
   * segundo punto de acoplamiento.
   *
   * Falla en modo NO fatal y a propósito: el admin ya es funcional sin esto
   * (el gateway autoriza por el rol del JWT, que sale de auth-service). Lo que
   * queda desalineado es el `role` que muestra el listado del panel. Si falla,
   * `profileSyncedAt` queda en null y el próximo arranque lo reintenta.
   */
  private async sincronizarPerfil(
    userId: string,
    email: string,
    displayName?: string,
  ): Promise<void> {
    const usersServiceUrl = this.config.get('USERS_SERVICE_URL', 'http://localhost:3003');
    const internalToken = this.config.get<string>('INTERNAL_SERVICE_TOKEN');

    if (!internalToken) {
      console.warn(
        `${LOG} rol NO replicado a users-service: falta INTERNAL_SERVICE_TOKEN. ` +
          `El admin YA funciona (el gateway lee el rol del JWT), pero el panel lo va a ` +
          `listar con su rol viejo. Seteá el secreto en los dos servicios y reiniciá auth-service.`,
      );
      return;
    }

    const nombre =
      displayName ??
      (await this.prisma.userProfile.findUnique({ where: { userId } }))?.displayName ??
      email.split('@')[0];

    try {
      const res = await fetch(`${usersServiceUrl}/api/v1/users/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': internalToken,
        },
        body: JSON.stringify({
          userId,
          displayName: nombre,
          role: 'admin',
          contactEmail: email,
          bootstrapAdmin: true,
        }),
      });

      if (!res.ok) {
        // Se loguea el status, nunca el token ni el body.
        console.warn(
          `${LOG} users-service rechazó la replicación del rol: HTTP ${res.status} ` +
            `(userId=${userId}). Se reintenta en el próximo arranque.`,
        );
        return;
      }

      await this.prisma.adminBootstrap.updateMany({
        where: { userId },
        data: { profileSyncedAt: new Date() },
      });
      console.warn(`${LOG} rol replicado al perfil de users-service (userId=${userId}).`);
    } catch {
      console.warn(
        `${LOG} no se pudo contactar a users-service para replicar el rol (userId=${userId}). ` +
          `Se reintenta en el próximo arranque.`,
      );
    }
  }
}

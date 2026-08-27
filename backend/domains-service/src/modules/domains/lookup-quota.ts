import { Injectable, Logger } from '@nestjs/common';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Cuota de consultas RDAP salientes POR USUARIO
 * ═══════════════════════════════════════════════════════════════════════════
 * El rate limit del gateway es de 100 requests/minuto POR IP, y es lo único
 * que había. El problema es el factor de amplificación: una sola búsqueda
 * dispara hasta `RDAP_MAX_LOOKUPS` (18) consultas salientes a rdap.org.
 *
 *   100 req/min permitidas  x  18 consultas cada una  =  1.800 req/min a rdap.org
 *
 * desde UNA sola IP, sin pasarse de ningún límite nuestro. Y el caché no
 * ayuda: un atacante que tipea nombres al azar tiene 0% de hit rate por
 * construcción.
 *
 * rdap.org es un servicio público gratuito sin contrato. Si nos banean, la
 * feature entera se apaga: todo cae en `unknown` -> `available: false` y no se
 * muestra ni un link de afiliación. O sea que esto no es higiene, es la
 * disponibilidad del único canal de monetización del servicio.
 *
 * ── Por qué se cuentan consultas y no búsquedas ────────────────────────────
 * Lo que le llega a rdap.org son consultas, no búsquedas. Contar búsquedas
 * castiga igual al que repite un nombre (todo caché, cero tráfico saliente)
 * que al que barre nombres nuevos (18 consultas cada vez). Se debita lo que
 * realmente salió a la red: `meta.rdapLookups`, sin los cache hits.
 *
 * ── Limitación conocida ────────────────────────────────────────────────────
 * El contador vive EN MEMORIA, así que es por instancia. Con N réplicas la
 * cuota efectiva es N veces la configurada. Para el MVP (una instancia en
 * Railway) es exacto; moverlo a Redis o a un conteo sobre `DomainSearch` es la
 * versión que escala, y es decisión de infra. Aun por instancia, acota el
 * ataque de tres órdenes de magnitud.
 */

/** Ventana deslizante. */
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Consultas salientes por usuario por hora. Un usuario real explorando nombres
 * hace 5-10 búsquedas seguidas (~60-180 consultas con las sugerencias) y
 * después para. 300 le da margen de sobra a esa sesión y corta el loop
 * automatizado, que a este ritmo necesitaría 6 cuentas para igualar lo que
 * antes hacía una sola en un minuto.
 */
const DEFAULT_QUOTA = 300;

/** Tope de usuarios distintos en memoria, para que el Map no sea un leak. */
const MAX_TRACKED_USERS = 10000;

type Bucket = { spent: number; resetAt: number };

@Injectable()
export class LookupQuotaService {
  private readonly logger = new Logger(LookupQuotaService.name);
  private readonly buckets = new Map<string, Bucket>();

  private get quota(): number {
    const raw = Number(process.env.DOMAINS_USER_LOOKUP_QUOTA);
    return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_QUOTA;
  }

  private bucketFor(userId: string): Bucket {
    const now = Date.now();
    const existing = this.buckets.get(userId);

    if (existing && existing.resetAt > now) return existing;

    if (this.buckets.size >= MAX_TRACKED_USERS) this.evictExpired(now);

    const fresh: Bucket = { spent: 0, resetAt: now + WINDOW_MS };
    this.buckets.set(userId, fresh);
    return fresh;
  }

  private evictExpired(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    // Si tras limpiar los vencidos sigue lleno, se tira el más viejo insertado
    // (Map itera en orden de inserción). Preferimos perder precisión de la
    // cuota antes que crecer sin techo.
    while (this.buckets.size >= MAX_TRACKED_USERS) {
      const oldest = this.buckets.keys().next();
      if (oldest.done) break;
      this.buckets.delete(oldest.value);
    }
  }

  /** ¿Le queda presupuesto a este usuario? */
  hasBudget(userId: string): boolean {
    return this.bucketFor(userId).spent < this.quota;
  }

  /** Cuándo se le renueva, en segundos. Para el header `Retry-After`. */
  retryAfterSeconds(userId: string): number {
    const bucket = this.bucketFor(userId);
    return Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
  }

  /** Debita las consultas que realmente salieron a la red. */
  spend(userId: string, lookups: number): void {
    if (lookups <= 0) return;
    const bucket = this.bucketFor(userId);
    bucket.spent += lookups;

    if (bucket.spent >= this.quota) {
      this.logger.warn(
        `Usuario ${userId} agotó su cuota de ${this.quota} consultas RDAP por hora`,
      );
    }
  }

  /** Sólo para tests. */
  reset(): void {
    this.buckets.clear();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchDomainDto } from './dto/search-domain.dto';

const DEFAULT_EXTENSIONS = ['.com', '.io', '.app', '.tech', '.co', '.dev'];

/**
 * 5s, no 3s. Medido contra rdap.org desde una conexión doméstica:
 *
 *   google.com  -> 2.54s  (302 a rdap.verisign.com + consulta)
 *   web.dev     -> ~1.0s
 *
 * O sea que el peor caso observado ya consumía el 84% de un presupuesto de 3s,
 * y son DOS saltos de red (bootstrap + servidor autoritativo). Un timeout que
 * se dispara no rompe nada —cae en `available: false`— pero le esconde al
 * usuario un dominio que SÍ podía comprar, y ese click es la vía de
 * monetización. Se prefiere esperar 2s más antes que perder el link.
 */
const RDAP_TIMEOUT_MS = 5000;

type AvailabilityResult = 'available' | 'registered' | 'unknown';

/**
 * Chequeo de disponibilidad vía RDAP público (sin auth). Placeholder: migrar a
 * una API paga (GoDaddy / Namecheap / Dynadot) es decisión de negocio.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Por qué NO alcanza con `status === 404`
 * ─────────────────────────────────────────────────────────────────────────────
 * rdap.org es un REDIRECTOR: resuelve el TLD contra el bootstrap de IANA y
 * manda un 302 al servidor RDAP autoritativo. Cuando el TLD no está en ese
 * bootstrap, rdap.org contesta 404 él mismo, sin redirigir. Los dos casos
 * llegaban como "404" y el código los trataba igual → falso positivo.
 *
 * Verificado contra el bootstrap oficial (https://data.iana.org/rdap/dns.json):
 *
 *   .com  -> https://rdap.verisign.com/com/v1/
 *   .app  -> https://pubapi.registry.google/rdap/
 *   .tech -> https://rdap.radix.host/rdap/
 *   .dev  -> https://pubapi.registry.google/rdap/
 *   .io   -> SIN SERVICIO RDAP EN EL BOOTSTRAP
 *   .co   -> SIN SERVICIO RDAP EN EL BOOTSTRAP
 *
 * Y contra rdap.org, con dominios registradísimos:
 *
 *   google.io  -> HTTP 404, 0 redirects   (¡registrado!)
 *   github.io  -> HTTP 404, 0 redirects   (¡registrado!)
 *   google.co  -> HTTP 404, 0 redirects   (¡registrado!)
 *   amazon.co  -> HTTP 404, 0 redirects   (¡registrado!)
 *   google.com -> HTTP 200, 1 redirect    (registrado, bien detectado)
 *   radix.tech -> HTTP 404, 1 redirect    (disponible de verdad)
 *
 * Es decir: `.io` y `.co` —2 de las 6 extensiones por defecto, y las dos más
 * deseables para un marketplace tech— se reportaban SIEMPRE como disponibles,
 * con link de afiliación de Namecheap incluido. Cada click en uno de esos links
 * llevaba al usuario a comprar un dominio que ya tenía dueño.
 *
 * El discriminante es el redirect, no el status:
 *
 *   404 CON redirect  -> el registro autoritativo dijo "no existe" -> disponible
 *   404 SIN redirect  -> rdap.org no conoce el TLD                 -> unknown
 *
 * Se usa `response.redirected` en vez de una lista fija de TLDs a propósito: si
 * mañana `.io` entra al bootstrap de IANA, rdap.org va a empezar a redirigir y
 * esto se arregla solo, sin tocar código.
 */
async function checkDomainAvailability(domain: string): Promise<AvailabilityResult> {
  try {
    const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(RDAP_TIMEOUT_MS),
    });

    if (response.status === 404) {
      return response.redirected ? 'available' : 'unknown';
    }

    if (response.status === 200) {
      return 'registered';
    }

    // 429 (rate limit), 5xx del registro, cualquier otra cosa: no sabemos.
    return 'unknown';
  } catch {
    // Error de red o timeout.
    return 'unknown';
  }
}

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, dto: SearchDomainDto) {
    const extensions = dto.extensions?.length ? dto.extensions : DEFAULT_EXTENSIONS;
    const baseName = dto.query
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '');

    // Una query como "!!!" se sanitizaba a "-" y salíamos a consultar "-.com".
    // Sin nombre no hay nada que buscar: se corta acá.
    if (!baseName) {
      return { query: dto.query, baseName: '', results: [] };
    }

    const domains = extensions.map((ext) => ({
      domain: `${baseName}${ext}`,
      extension: ext,
    }));

    const results = await Promise.all(
      domains.map(async ({ domain, extension }) => {
        const status = await checkDomainAvailability(domain);

        // Solo un "available" comprobado genera link de afiliación. `unknown`
        // (TLD fuera del bootstrap, timeout, rate limit) se reporta como NO
        // disponible: preferimos perder un click antes que mandar a alguien a
        // comprar un dominio que ya tiene dueño.
        const available = status === 'available';

        if (status === 'unknown') {
          this.logger.warn(
            `RDAP no concluyente para ${domain}; se reporta como no disponible`,
          );
        }

        return {
          domain,
          extension,
          available,
          registrarUrl: available
            ? `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`
            : null,
        };
      }),
    );

    await this.prisma.domainSearch.create({
      data: {
        userId,
        query: dto.query,
        results: results as any,
      },
    });

    return {
      query: dto.query,
      baseName,
      results,
    };
  }

  async getHistory(userId: string, limit = 10) {
    return this.prisma.domainSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

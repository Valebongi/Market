import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetsDto } from './dto/filter-assets.dto';
import { slugify, nextSlugCandidate, isSlugUniqueViolation } from './slug.util';

/**
 * Intentos con sufijo secuencial (`mi-marca-2`, `mi-marca-3`) antes de rendirse
 * y usar un sufijo aleatorio. Cada reintento es una carrera perdida contra otra
 * request que creo el mismo slug entre nuestro SELECT y nuestro INSERT; tres
 * carreras perdidas seguidas sobre el mismo titulo es contencion real, no una
 * coincidencia, y ahi conviene cortar en vez de seguir reintentando.
 */
const SLUG_SEQUENTIAL_ATTEMPTS = 3;

/** Total de intentos de INSERT. El ultimo va con sufijo aleatorio y no puede fallar por slug. */
const SLUG_TOTAL_ATTEMPTS = SLUG_SEQUENTIAL_ATTEMPTS + 1;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea el activo resolviendo la colision de slug con reintento.
   *
   * El codigo anterior era `findFirst` + `create` sin manejo de error: entre el
   * SELECT y el INSERT hay una ventana en la que otra request puede insertar el
   * mismo slug, y entonces el UNIQUE de `assets.slug` tiraba P2002 y el endpoint
   * respondia 500. Dos titulares publicando el mismo titulo a la vez alcanzaba
   * para reproducirlo.
   *
   * Ahora el SELECT es solo una optimizacion para elegir un candidato bonito; la
   * autoridad es el UNIQUE de la base. Si el INSERT choca, se recalcula el
   * candidato y se reintenta. El ultimo intento usa un sufijo aleatorio, que no
   * depende de leer el estado y por lo tanto no puede volver a perder la carrera.
   */
  async create(ownerId: string, dto: CreateAssetDto) {
    const base = slugify(dto.title);
    const { tags, links, allowedUses, restrictions, ...assetData } = dto;

    for (let attempt = 0; attempt < SLUG_TOTAL_ATTEMPTS; attempt++) {
      const slug = await this.buildSlug(base, attempt);

      try {
        return await this.prisma.asset.create({
          data: {
            ...(assetData as any),
            ownerId,
            slug,
            allowedUses: allowedUses ?? [],
            restrictions: restrictions ?? [],
            tags: tags?.length
              ? { create: tags.map((tag) => ({ tag })) }
              : undefined,
            links: links?.length
              ? { create: links.map((l) => ({ label: l.label, url: l.url, isMain: l.isMain ?? false })) }
              : undefined,
          },
          include: {
            tags: true,
            links: true,
            attachments: true,
          },
        });
      } catch (error) {
        const puedeReintentar = attempt < SLUG_TOTAL_ATTEMPTS - 1;
        if (puedeReintentar && isSlugUniqueViolation(error)) continue;
        throw error;
      }
    }

    // Inalcanzable: el ultimo intento o devuelve o relanza.
    throw new ConflictException('Could not generate a unique slug for this asset');
  }

  /**
   * Candidato de slug para un intento dado. Los primeros son secuenciales y
   * legibles; el ultimo cae a un sufijo aleatorio para garantizar la escritura.
   */
  private async buildSlug(base: string, attempt: number): Promise<string> {
    if (attempt >= SLUG_SEQUENTIAL_ATTEMPTS) {
      return `${base}-${randomUUID().slice(0, 8)}`;
    }

    // Sin filtrar por `deletedAt`: un activo borrado con soft delete sigue
    // ocupando su fila y, por lo tanto, su slug en el indice UNIQUE.
    const taken = await this.prisma.asset.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });

    return nextSlugCandidate(base, taken.map((a: { slug: string }) => a.slug));
  }

  /**
   * Listado PUBLICO. Fuerza `status: 'published'` sin excepcion.
   *
   * Antes el default vivia en el controller como
   * `if (!filters.ownerId && !filters.status) filters.status = 'published'`, y
   * esa condicion era la fuga: bastaba `GET /assets?status=draft` o
   * `GET /assets?ownerId=<uuid>` —ambas rutas anonimas, excluidas del middleware
   * del gateway— para listar los borradores de cualquier titular.
   *
   * `ownerId` SIGUE siendo un filtro publico legitimo (el catalogo publico de un
   * titular), pero ahora solo alcanza sus activos publicados.
   */
  async findAllPublic(filters: FilterAssetsDto) {
    return this.queryAssets({ ...filters, status: 'published' });
  }

  /**
   * Listado AUTENTICADO para el dashboard del titular y el panel de admin.
   *
   * Un titular solo ve lo suyo: el `ownerId` se pisa con el del token, no se
   * toma del query string. Un admin puede consultar cualquier `ownerId`, o
   * ninguno, porque modera el catalogo entero.
   */
  async findAllManaged(filters: FilterAssetsDto, userId: string, userRole: string) {
    if (!userId) throw new UnauthorizedException('Authentication required');

    const esAdmin = userRole === 'admin';
    return this.queryAssets({
      ...filters,
      ownerId: esAdmin ? filters.ownerId : userId,
    });
  }

  private async queryAssets(filters: FilterAssetsDto) {
    const {
      search,
      category,
      licenseType,
      pricingType,
      status,
      ownerId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12,
    } = filters;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (licenseType) where.licenseType = licenseType;
    if (pricingType) where.pricingType = pricingType;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          tags: true,
          links: { where: { isMain: true } },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Detalle PUBLICO por id. Solo activos publicados.
   *
   * El `where` no llevaba `status`, a diferencia de `findBySlug`. Como
   * `GET /assets/:id` esta excluida del middleware de auth del gateway, con el
   * UUID a mano cualquiera leia el borrador de cualquier titular, y la pagina
   * publica lo renderizaba con `index, follow`. Fuga de contenido no publicado
   * antes que problema de SEO.
   *
   * El dashboard del titular ya no usa esta ruta: lee por `findOneManaged`.
   */
  async findOne(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null, status: 'published' },
      include: {
        tags: true,
        links: true,
        attachments: true,
      },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    // Increment view count
    await this.prisma.asset.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return asset;
  }

  /**
   * Detalle AUTENTICADO: el titular lee su propio activo en cualquier estado
   * (borrador, archivado, flagueado) para editarlo; un admin lee cualquiera para
   * moderarlo. Cualquier otro recibe 404, no 403: sobre un borrador ajeno, un
   * 403 confirmaria que el activo existe.
   *
   * NO incrementa `viewCount`: el titular mirando su propio borrador no es una
   * visita, y contarla ensucia la metrica que el detalle publica como prueba
   * social ("N vistas").
   */
  async findOneManaged(id: string, userId: string, userRole: string) {
    if (!userId) throw new UnauthorizedException('Authentication required');

    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: {
        tags: true,
        links: true,
        attachments: true,
      },
    });

    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.ownerId !== userId && userRole !== 'admin') {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  async findBySlug(slug: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { slug, deletedAt: null, status: 'published' },
      include: {
        tags: true,
        links: true,
        attachments: true,
      },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    await this.prisma.asset.update({
      where: { id: asset.id },
      data: { viewCount: { increment: 1 } },
    });

    return asset;
  }

  async update(id: string, userId: string, userRole: string, dto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.ownerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to update this asset');
    }

    // `slug` se descarta a proposito: es INMUTABLE despues de crear el activo.
    //
    // Que `update()` no lo regenerara al cambiar el titulo ya era el
    // comportamiento correcto, pero era accidental: nadie lo habia escrito, y el
    // proximo que leyera "el titulo cambio y el slug quedo viejo" lo iba a
    // "arreglar". El slug es la URL publica del activo: regenerarlo rompe los
    // enlaces compartidos y las URLs indexadas. Ver `slug.util.ts`.
    //
    // El descarte tambien es defensa en profundidad ante mass assignment: hoy el
    // ValidationPipe corre con `forbidNonWhitelisted`, asi que un `slug` en el
    // body ya da 400, pero esto sobrevive a que alguien agregue el campo al DTO.
    const dtoAny = dto as any;
    const { tags, links, allowedUses, restrictions, slug: _slugIgnorado, ...updateData } = dtoAny;

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        ...(updateData as any),
        allowedUses: allowedUses ?? asset.allowedUses,
        restrictions: restrictions ?? asset.restrictions,
        publishedAt:
          updateData.status === 'published' && asset.status !== 'published'
            ? new Date()
            : undefined,
        tags: tags !== undefined
          ? {
              deleteMany: {},
              create: tags.map((tag: string) => ({ tag })),
            }
          : undefined,
        links: links !== undefined
          ? {
              deleteMany: {},
              create: links.map((l: any) => ({ label: l.label, url: l.url, isMain: l.isMain ?? false })),
            }
          : undefined,
      } as any,
      include: {
        tags: true,
        links: true,
        attachments: true,
      },
    });

    return updated;
  }

  async publish(id: string, userId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.status === 'published') {
      throw new ConflictException('Asset is already published');
    }

    return this.prisma.asset.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  async archive(id: string, userId: string, userRole: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.ownerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to archive this asset');
    }

    return this.prisma.asset.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  /**
   * Reporte de un activo por parte de un tercero.
   *
   * El umbral de auto-moderacion cuenta DENUNCIANTES DISTINTOS, no filas de
   * asset_flags. Contando filas, un unico usuario podia llamar tres veces a este
   * endpoint y bajar del marketplace el activo de cualquier competidor: el estado
   * `flagged` lo saca del listado publico, que fuerza `status = 'published'`.
   * Un reporte por usuario y por activo, y el titular no puede reportarse a si
   * mismo para inflar el contador.
   */
  async flag(id: string, reportedBy: string, reason: string) {
    if (!reportedBy) {
      throw new ForbiddenException('Authentication required to flag an asset');
    }

    const trimmedReason = (reason ?? '').trim();
    if (trimmedReason.length < 10 || trimmedReason.length > 1000) {
      throw new BadRequestException('Reason must be between 10 and 1000 characters');
    }

    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.ownerId === reportedBy) {
      throw new ForbiddenException('You cannot flag your own asset');
    }

    const alreadyReported = await this.prisma.assetFlag.findFirst({
      where: { assetId: id, reportedBy },
    });

    if (alreadyReported) {
      throw new ConflictException('You have already flagged this asset');
    }

    await this.prisma.assetFlag.create({
      data: { assetId: id, reportedBy, reason: trimmedReason },
    });

    // Auto-flag el activo al llegar a 3 denunciantes distintos sin resolver.
    const distinctReporters = await this.prisma.assetFlag.findMany({
      where: { assetId: id, resolved: false },
      distinct: ['reportedBy'],
      select: { reportedBy: true },
    });

    if (distinctReporters.length >= 3 && asset.status !== 'flagged') {
      await this.prisma.asset.update({
        where: { id },
        data: { status: 'flagged' },
      });
    }

    return { message: 'Asset flagged successfully' };
  }

  async remove(id: string, userId: string, userRole: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.ownerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this asset');
    }

    await this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Asset deleted successfully' };
  }

  async incrementRequestCount(id: string) {
    await this.prisma.asset.update({
      where: { id },
      data: { requestCount: { increment: 1 } },
    });
  }
}

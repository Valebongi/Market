import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetsDto } from './dto/filter-assets.dto';

// Headers injected by the API Gateway after JWT validation
interface AuthHeaders {
  'x-user-id': string;
  'x-user-role': string;
}

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ── Image upload ────────────────────────────────────────────────────
  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'public', 'uploads'),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Headers() headers: AuthHeaders,
  ) {
    if (!headers['x-user-id']) throw new UnauthorizedException();
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const base = process.env.SERVICE_URL || 'http://localhost:3002';
    return { url: `${base}/uploads/${file.filename}` };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Headers() headers: AuthHeaders,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create(headers['x-user-id'], dto);
  }

  // ── Lectura publica (anonima) ───────────────────────────────────────
  // Estas tres rutas estan excluidas del middleware de auth del gateway
  // (`gateway/src/app.module.ts`), asi que NO hay `x-user-id` confiable en
  // ellas: solo pueden devolver activos publicados.

  /**
   * Listado publico. El filtro de estado NO se toma del query string: lo fuerza
   * el servicio a `published`. `?status=draft` ya no devuelve borradores.
   */
  @Get()
  findAll(@Query() filters: FilterAssetsDto) {
    return this.assetsService.findAllPublic(filters);
  }

  // ── Lectura autenticada (dashboard del titular y panel de admin) ─────
  //
  // Van bajo `manage/` con DOS segmentos a proposito. El gateway excluye del
  // middleware de auth los patrones `assets` y `assets/:id` (GET), que matchean
  // un solo segmento; `assets/manage/...` no matchea ninguno de los dos, asi que
  // el middleware SI corre, valida el JWT y pisa `x-user-id` con el `sub` del
  // token.
  //
  // Ese "pisa" es la parte que importa: el proxy del gateway reenvia
  // `x-user-id` tal como venga en la request, y en una ruta excluida nadie lo
  // sobreescribe. Un endpoint publico que decidiera visibilidad mirando ese
  // header seria trivial de falsificar mandandolo a mano. Por eso la separacion
  // es por ruta y no por header.

  /**
   * `GET /assets/manage/list` — listado del titular con filtro de estado real.
   * Un titular solo ve lo suyo (el `ownerId` se pisa con el del token); un admin
   * ve todo.
   */
  @Get('manage/list')
  findAllManaged(
    @Headers() headers: AuthHeaders,
    @Query() filters: FilterAssetsDto,
  ) {
    return this.assetsService.findAllManaged(
      filters,
      headers['x-user-id'],
      headers['x-user-role'],
    );
  }

  /**
   * `GET /assets/manage/:id` — detalle en cualquier estado para el titular
   * (edicion) o para un admin (moderacion). No incrementa `viewCount`.
   */
  @Get('manage/:id')
  findOneManaged(
    @Param('id') id: string,
    @Headers() headers: AuthHeaders,
  ) {
    return this.assetsService.findOneManaged(
      id,
      headers['x-user-id'],
      headers['x-user-role'],
    );
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.assetsService.findBySlug(slug);
  }

  /** Detalle publico por id. Solo activos publicados. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Headers() headers: AuthHeaders,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, headers['x-user-id'], headers['x-user-role'], dto);
  }

  @Patch(':id/publish')
  publish(
    @Param('id') id: string,
    @Headers() headers: AuthHeaders,
  ) {
    return this.assetsService.publish(id, headers['x-user-id']);
  }

  @Patch(':id/archive')
  archive(
    @Param('id') id: string,
    @Headers() headers: AuthHeaders,
  ) {
    return this.assetsService.archive(id, headers['x-user-id'], headers['x-user-role']);
  }

  @Post(':id/flag')
  flag(
    @Param('id') id: string,
    @Headers() headers: AuthHeaders,
    @Body() body: { reason: string },
  ) {
    return this.assetsService.flag(id, headers['x-user-id'], body.reason);
  }

  @Patch(':id/request-count')
  incrementRequestCount(@Param('id') id: string) {
    return this.assetsService.incrementRequestCount(id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers() headers: AuthHeaders,
  ) {
    return this.assetsService.remove(id, headers['x-user-id'], headers['x-user-role']);
  }
}

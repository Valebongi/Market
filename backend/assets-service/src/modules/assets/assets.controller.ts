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

  @Get()
  findAll(@Query() filters: FilterAssetsDto) {
    // Public: only return published unless ownerId or admin filter is specified
    if (!filters.ownerId && !filters.status) {
      filters.status = 'published';
    }
    return this.assetsService.findAll(filters);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.assetsService.findBySlug(slug);
  }

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

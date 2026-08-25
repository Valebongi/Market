import {
  All,
  Controller,
  Req,
  Res,
  Param,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

/**
 * Catch-all proxy controller.
 * Routes: /api/v1/<service>/* → downstream microservice
 *
 * Service routing map:
 *   /auth/*      → auth-service     (port 3001)
 *   /assets/*    → assets-service   (port 3002)
 *   /users/*     → users-service    (port 3003)
 *   /requests/*  → messaging-service (port 3004)
 *   /domains/*   → domains-service  (port 3005)
 *   /admin/*     → admin-service    (port 3006)
 *
 * OJO: en Express 4 el patrón `<servicio>/*` NO matchea el path desnudo
 * `/api/v1/<servicio>`, así que cada servicio necesita además su ruta raíz
 * explícita. Faltaba la de `users` y el listado del panel de admin daba 404.
 * Se declaran todas aunque algunos downstream todavía no expongan `@Get()`
 * (devolverán su propio 404 en vez de un 404 fantasma del gateway).
 */
@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('auth/*')
  async proxyAuth(@Req() req: Request, @Res() res: Response) {
    return this.forward('auth', req, res);
  }

  @All('assets/*')
  async proxyAssets(@Req() req: Request, @Res() res: Response) {
    return this.forward('assets', req, res);
  }

  @All('assets')
  async proxyAssetsRoot(@Req() req: Request, @Res() res: Response) {
    return this.forward('assets', req, res);
  }

  @All('users/*')
  async proxyUsers(@Req() req: Request, @Res() res: Response) {
    return this.forward('users', req, res);
  }

  @All('users')
  async proxyUsersRoot(@Req() req: Request, @Res() res: Response) {
    return this.forward('users', req, res);
  }

  @All('requests/*')
  async proxyRequests(@Req() req: Request, @Res() res: Response) {
    return this.forward('requests', req, res);
  }

  @All('requests')
  async proxyRequestsRoot(@Req() req: Request, @Res() res: Response) {
    return this.forward('requests', req, res);
  }

  @All('domains/*')
  async proxyDomains(@Req() req: Request, @Res() res: Response) {
    return this.forward('domains', req, res);
  }

  @All('domains')
  async proxyDomainsRoot(@Req() req: Request, @Res() res: Response) {
    return this.forward('domains', req, res);
  }

  @All('admin/*')
  async proxyAdmin(@Req() req: Request, @Res() res: Response) {
    return this.forward('admin', req, res);
  }

  @All('admin')
  async proxyAdminRoot(@Req() req: Request, @Res() res: Response) {
    return this.forward('admin', req, res);
  }

  private async forward(serviceName: string, req: Request, res: Response) {
    const contentType = req.headers['content-type'] || '';
    if (contentType.startsWith('multipart/form-data')) {
      return this.proxyService.forwardMultipart(serviceName, req, res);
    }
    const { status, data } = await this.proxyService.forwardRequest(serviceName, req);
    res.status(status).json(data);
  }
}

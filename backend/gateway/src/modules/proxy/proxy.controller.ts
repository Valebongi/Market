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

  @All('admin/*')
  async proxyAdmin(@Req() req: Request, @Res() res: Response) {
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

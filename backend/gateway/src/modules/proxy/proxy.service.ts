import { Injectable, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as http from 'http';
import * as https from 'https';

interface ServiceConfig {
  baseUrl: string;
  stripPrefix?: string;
}

@Injectable()
export class ProxyService {
  private readonly services: Record<string, ServiceConfig>;

  constructor(private readonly config: ConfigService) {
    this.services = {
      auth: {
        baseUrl: config.get('AUTH_SERVICE_URL', 'http://localhost:3001'),
      },
      users: {
        baseUrl: config.get('USERS_SERVICE_URL', 'http://localhost:3003'),
      },
      assets: {
        baseUrl: config.get('ASSETS_SERVICE_URL', 'http://localhost:3002'),
      },
      requests: {
        baseUrl: config.get('MESSAGING_SERVICE_URL', 'http://localhost:3004'),
      },
      domains: {
        baseUrl: config.get('DOMAINS_SERVICE_URL', 'http://localhost:3005'),
      },
      admin: {
        baseUrl: config.get('ADMIN_SERVICE_URL', 'http://localhost:3006'),
      },
    };
  }

  getTargetUrl(serviceName: string, path: string): string {
    const service = this.services[serviceName];
    if (!service) throw new BadGatewayException(`Unknown service: ${serviceName}`);
    return `${service.baseUrl}${path}`;
  }

  async forwardRequest(
    serviceName: string,
    req: Request,
    overridePath?: string,
  ): Promise<{ status: number; data: any }> {
    const path = overridePath ?? req.url;
    const url = this.getTargetUrl(serviceName, path);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward injected auth headers from middleware
    ['x-user-id', 'x-user-email', 'x-user-role'].forEach((h) => {
      if (req.headers[h]) headers[h] = req.headers[h] as string;
    });

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    if (!['GET', 'HEAD', 'DELETE'].includes(req.method)) {
      init.body = JSON.stringify(req.body);
    }

    try {
      const response = await fetch(url, init);
      const data = await response.json().catch(() => ({}));
      return { status: response.status, data };
    } catch (err) {
      throw new BadGatewayException(`Service ${serviceName} is unavailable`);
    }
  }

  /**
   * Forward multipart/form-data requests by piping the raw stream directly.
   * This avoids JSON serialization which would strip the file data.
   */
  forwardMultipart(
    serviceName: string,
    req: Request,
    res: Response,
  ): void {
    const url = this.getTargetUrl(serviceName, req.url);
    const targetUrl = new URL(url);
    const protocol = targetUrl.protocol === 'https:' ? https : http;

    const forwardHeaders: Record<string, string | string[]> = {};

    // Forward content-type (with multipart boundary) and content-length
    if (req.headers['content-type']) forwardHeaders['content-type'] = req.headers['content-type'];
    if (req.headers['content-length']) forwardHeaders['content-length'] = req.headers['content-length'];

    // Inject auth headers from gateway middleware
    ['x-user-id', 'x-user-email', 'x-user-role'].forEach((h) => {
      if (req.headers[h]) forwardHeaders[h] = req.headers[h] as string;
    });

    const proxyReq = protocol.request(
      {
        hostname: targetUrl.hostname,
        port: parseInt(targetUrl.port) || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + (targetUrl.search || ''),
        method: req.method,
        headers: forwardHeaders,
      },
      (proxyRes) => {
        res.status(proxyRes.statusCode || 500);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', () => {
      res.status(502).json({ message: `Service ${serviceName} is unavailable` });
    });

    req.pipe(proxyReq);
  }
}

import { Injectable, BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as http from 'http';
import * as https from 'https';

interface ServiceConfig {
  baseUrl: string;
  stripPrefix?: string;
}

/** Timeout por defecto (ms) para las requests JSON hacia los microservicios. */
const DEFAULT_PROXY_TIMEOUT_MS = 30000;

@Injectable()
export class ProxyService {
  private readonly services: Record<string, ServiceConfig>;

  /**
   * Sin timeout, un downstream que acepta la conexión y nunca responde deja la
   * request colgada para siempre: el gateway se queda sin capacidad mientras
   * `GET /health` sigue contestando "ok". Configurable con PROXY_TIMEOUT_MS.
   */
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    const parsed = Number(config.get('PROXY_TIMEOUT_MS', DEFAULT_PROXY_TIMEOUT_MS));
    this.timeoutMs =
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PROXY_TIMEOUT_MS;

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

    // Se guarda la referencia al signal para distinguir, en el catch, un timeout
    // (504) de una caída real del downstream (502). Distintas versiones de Node
    // envuelven el error del abort de formas distintas, así que se consulta
    // `signal.aborted` en vez de olfatear el nombre del error.
    const signal = AbortSignal.timeout(this.timeoutMs);

    const init: RequestInit = {
      method: req.method,
      headers,
      signal,
    };

    if (!['GET', 'HEAD', 'DELETE'].includes(req.method)) {
      init.body = JSON.stringify(req.body);
    }

    try {
      const response = await fetch(url, init);
      const data = await response.json().catch(() => ({}));
      // El abort también corta la lectura del body: sin este check devolveríamos
      // el status del downstream con un body vacío como si hubiera respondido.
      if (signal.aborted) throw this.timeoutError(serviceName);
      return { status: response.status, data };
    } catch (err) {
      if (err instanceof GatewayTimeoutException) throw err;
      if (signal.aborted) throw this.timeoutError(serviceName);
      throw new BadGatewayException(`Service ${serviceName} is unavailable`);
    }
  }

  private timeoutError(serviceName: string): GatewayTimeoutException {
    return new GatewayTimeoutException(
      `Service ${serviceName} did not respond within ${this.timeoutMs}ms`,
    );
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

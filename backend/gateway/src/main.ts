import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { parseAllowedOrigins } from './common/cors-origins';
import { identityHeaderScrubber } from './common/identity-headers';

/**
 * `trust proxy` de Express. Sin esto, detrás de nginx/Caddy todas las requests
 * llegan con la IP del reverse proxy y el rate limiting agrupa a todo el mundo
 * en un mismo cupo (o, peor, un solo atacante consume el cupo de todos).
 *
 * Se deja DESACTIVADO por defecto a propósito: activarlo sin un proxy real
 * delante permite falsear `X-Forwarded-For` y esquivar el límite.
 *
 * Valores: "false"/"0"/ausente → off · "1"/"2"/... → cantidad de saltos de proxy
 *          "loopback" | "10.0.0.0/8,192.168.0.0/16" → lo interpreta Express.
 */
function parseTrustProxy(raw?: string): boolean | number | string {
  const v = (raw ?? '').trim();
  if (v === '' || v === 'false' || v === '0') return false;
  if (v === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== false) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
  }

  // PRIMERO DE TODO: borra los x-user-* que mande el cliente. Los microservicios
  // confian en esos headers sin revalidar el token, asi que su unica fuente
  // legitima es AuthMiddleware. Va aca y no como middleware de Nest para que
  // alcance tambien a las rutas del .exclude() (ver common/identity-headers.ts).
  app.use(identityHeaderScrubber);

  // Security headers
  app.use(helmet());

  // Health check — outside global prefix so load balancers can reach it.
  // Se registra directo en el adaptador Express, así que no pasa por el router de
  // Nest y ningún guard global (incluido el throttler) lo toca. GatewayThrottlerGuard
  // igual lo listea en NEVER_THROTTLED por si alguna vez se convierte en ruta Nest.
  app.getHttpAdapter().get('/health', (_req: unknown, res: any) => {
    res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() });
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Lista explícita de orígenes (FRONTEND_URL admite varios separados por coma).
  // Con un array, `cors` devuelve el header solo si el Origin de la request está
  // en la lista, y agrega `Vary: Origin` para que ningún cache mezcle respuestas.
  const allowedOrigins = parseAllowedOrigins(process.env.FRONTEND_URL);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`API Gateway running on port ${port}`);
  console.log(`Frontend allowed: ${allowedOrigins.join(', ')}`);
  console.log(
    `Rate limit: ${process.env.RATE_LIMIT_MAX || 100} req / ${process.env.RATE_LIMIT_TTL || 60000}ms ` +
      `(auth: ${process.env.RATE_LIMIT_AUTH_MAX || 5} req / ${process.env.RATE_LIMIT_AUTH_TTL || 60000}ms) ` +
      `· trust proxy: ${trustProxy === false ? 'off' : trustProxy}`,
  );
}

bootstrap();

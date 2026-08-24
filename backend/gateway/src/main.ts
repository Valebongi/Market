import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Health check — outside global prefix so load balancers can reach it
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

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`API Gateway running on port ${port}`);
  console.log(`Frontend allowed: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
}

bootstrap();

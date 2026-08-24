import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());

  // Serve uploaded images as static files at /uploads/*
  app.useStaticAssets(join(process.cwd(), 'public', 'uploads'), {
    prefix: '/uploads',
  });

  app.getHttpAdapter().get('/health', (_req: unknown, res: any) => {
    res.json({ status: 'ok', service: 'assets-service', timestamp: new Date().toISOString() });
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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-email', 'x-user-role'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Assets Service running on port ${port}`);
}

bootstrap();

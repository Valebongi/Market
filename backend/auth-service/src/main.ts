import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.getHttpAdapter().get('/health', (_req: unknown, res: any) => {
    res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Auth Service running on port ${port}`);
}

bootstrap();

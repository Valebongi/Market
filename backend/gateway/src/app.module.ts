import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProxyModule } from './modules/proxy/proxy.module';
import { AuthMiddleware } from './common/auth.middleware';
import { GatewayThrottlerGuard } from './common/gateway-throttler.guard';
import { buildThrottlerOptions } from './common/throttler.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildThrottlerOptions,
    }),
    ProxyModule,
  ],
  providers: [
    // Sin este APP_GUARD el ThrottlerModule queda decorativo: se configura pero nunca corre.
    { provide: APP_GUARD, useClass: GatewayThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      // Apply auth middleware to all routes except public ones
      .exclude(
        // Public asset browsing (paths without global prefix in exclude)
        { path: 'assets', method: RequestMethod.GET },
        { path: 'assets/slug/:slug', method: RequestMethod.GET },
        { path: 'assets/:id', method: RequestMethod.GET },
        // Auth routes (handled by auth-service)
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/login', method: RequestMethod.POST },
        // NO agregar 'auth/oauth/callback' acá: no es un olvido, es intencional.
        // El endpoint recibe `email` y `providerId` como datos crudos del cliente y
        // auth-service confía en ellos para emitir un accessToken, así que exponerlo
        // sin JWT permite tomar cualquier cuenta conociendo solo el email.
        // Se reabre recién cuando el intercambio del `code` de OAuth se haga
        // server-side dentro de auth-service.
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        // Public user profiles (any visitor can view a user's public profile)
        { path: 'users/:userId', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}

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
        // Pública porque auth-service ya NO confía en los datos que manda el cliente:
        // recibe el ID token entero del proveedor y verifica firma contra las claves
        // públicas de Google, emisor, audiencia y expiración antes de emitir nada.
        // La identidad sale del token verificado, no del body, así que no hace falta
        // un JWT nuestro para entrar (sería imposible: es el endpoint que lo emite).
        // SI ESA VERIFICACIÓN SE REMUEVE O SE DEBILITA, esta línea vuelve a salir:
        // sin ella el body es dato crudo del cliente y basta el email para tomar
        // cualquier cuenta. El rate limit estricto lo da AUTH_SENSITIVE_PATHS en
        // common/throttler.config.ts, donde esta ruta ya está listada.
        { path: 'auth/oauth/callback', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        // Public user profiles (any visitor can view a user's public profile)
        { path: 'users/:userId', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}

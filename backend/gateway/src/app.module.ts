import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProxyModule } from './modules/proxy/proxy.module';
import { AuthMiddleware } from './common/auth.middleware';

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
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100,  // 100 requests per minute
      },
    ]),
    ProxyModule,
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
        { path: 'auth/oauth/callback', method: RequestMethod.POST },
        // Public user profiles (any visitor can view a user's public profile)
        { path: 'users/:userId', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}

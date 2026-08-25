import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        status: 'active',
        profile: {
          create: {
            displayName: dto.name,
            contactEmail: dto.email,
          },
        },
      },
      include: { profile: true },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    // Sync to users-service (fire-and-forget)
    this.syncProfileToUsersService(user.id, dto.name, dto.role, dto.email);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException('Cuenta suspendida. Contacta al soporte.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    // Sync to users-service on login in case profile was never synced (legacy accounts)
    if (user.profile) {
      this.syncProfileToUsersService(user.id, user.profile.displayName, user.role, user.email);
    }

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { profile: true },
      });

      if (!user || user.status === 'suspended') {
        throw new UnauthorizedException('Token inválido');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  async oauthLogin(provider: string, providerId: string, email: string, name: string) {
    // Find or create user via OAuth
    let user = await this.prisma.user.findFirst({
      where: { oauthProvider: provider, oauthProviderId: providerId },
      include: { profile: true },
    });

    if (!user) {
      // Check if email already exists
      const emailUser = await this.prisma.user.findUnique({ where: { email } });
      if (emailUser) {
        // Link OAuth to existing account
        user = await this.prisma.user.update({
          where: { id: emailUser.id },
          data: { oauthProvider: provider, oauthProviderId: providerId },
          include: { profile: true },
        });
      } else {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email,
            oauthProvider: provider,
            oauthProviderId: providerId,
            role: 'entrepreneur', // default role, can be changed
            status: 'active',
            profile: {
              create: {
                displayName: name,
                contactEmail: email,
              },
            },
          },
          include: { profile: true },
        });
      }
    }

    const token = this.generateToken(user.id, user.email, user.role);

    // Sync to users-service (fire-and-forget)
    if (user.profile) {
      this.syncProfileToUsersService(user.id, user.profile.displayName, user.role, user.email);
    }

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash) {
      return { message: 'Si el email está registrado, recibirás las instrucciones.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    // TODO: enviar el email de recuperación. Hasta entonces el token solo se
    // devuelve en el body cuando está EXPLÍCITAMENTE habilitado.
    //
    // Antes la condición era `NODE_ENV !== 'production'`, o sea fail-OPEN: en
    // cualquier entorno donde NODE_ENV no estuviera seteado (Railway incluido si
    // nadie la define) el endpoint entregaba un token de reseteo válido a
    // cualquiera que conociera un email registrado = toma de cuenta directa.
    // Ahora hay que optar por exponerlo, y por defecto no se expone.
    const exposeResetToken =
      this.config.get('EXPOSE_RESET_TOKEN') === 'true' ||
      this.config.get('NODE_ENV') === 'development';

    return {
      message: 'Si el email está registrado, recibirás las instrucciones.',
      ...(exposeResetToken && { devToken: token }),
    } as { message: string };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '7d',
    });
  }

  // Sync user profile to users-service so profile lookups work across services
  private async syncProfileToUsersService(
    userId: string,
    displayName: string,
    role: string,
    contactEmail: string,
  ): Promise<void> {
    const usersServiceUrl = this.config.get('USERS_SERVICE_URL', 'http://localhost:3003');
    try {
      // `contactEmail` se recibía y no se enviaba: users-service guardaba el
      // perfil sin email y la búsqueda del panel de admin (findAll filtra por
      // displayName OR contactEmail) nunca podía matchear por email.
      await fetch(`${usersServiceUrl}/api/v1/users/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, displayName, role, contactEmail }),
      });
    } catch {
      // Non-fatal: profile sync failure should not block auth
    }
  }
}

import {
  Controller,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { AdminUpdateRoleDto } from './dto/update-role.dto';
import { GoogleIdTokenService } from './oauth/google-id-token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleIdToken: GoogleIdTokenService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return {
      statusCode: 201,
      message: 'Usuario registrado correctamente',
      data: result,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return {
      statusCode: 200,
      message: 'Login exitoso',
      data: result,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email);
    return { statusCode: 200, ...result };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto.token, dto.newPassword);
    return { statusCode: 200, ...result };
  }

  /**
   * Baja administrativa. `:identifier` acepta el userId (uuid) o el email.
   *
   * El rol sale del header `x-user-role` que inyecta el gateway tras validar el
   * JWT; sin ese header la operación falla cerrada (403). Igual que en
   * users-service, esto es defensa en profundidad y no reemplaza que el
   * servicio no sea alcanzable desde internet.
   *
   * Solo da de baja el lado auth. El perfil se borra aparte con
   * `DELETE /api/v1/users/:userId`.
   */
  @Delete('users/:identifier')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('identifier') identifier: string,
    @Headers('x-user-id') requesterId: string,
    @Headers('x-user-role') requesterRole: string,
  ) {
    const result = await this.authService.adminSoftDelete(identifier, requesterRole, requesterId);
    return {
      statusCode: 200,
      message: result.alreadyDeleted
        ? 'La cuenta ya estaba dada de baja'
        : 'Cuenta dada de baja',
      data: result,
    };
  }

  /**
   * Cambio de rol administrativo sobre la FUENTE DE VERDAD del rol.
   *
   * `:identifier` acepta el userId (uuid) o el email, igual que la baja.
   *
   * Contra `PATCH /api/v1/users/:userId/role` (users-service), que escribe la
   * copia que muestra el panel: este escribe el rol con el que auth-service
   * firma el JWT y con el que el gateway autoriza. Este endpoint replica al
   * otro; el otro no replica a este.
   *
   * Autorizacion: el rol sale del header `x-user-role` que inyecta el gateway
   * tras validar el JWT. Sin ese header la operacion falla cerrada (403). El
   * gateway NO tiene esta ruta en su lista de admin-only, asi que el control
   * real esta aca.
   *
   * El JWT que el usuario afectado ya tiene en la mano NO cambia: sigue
   * llevando el rol viejo hasta que caduque o hasta que vuelva a loguearse. Por
   * eso la respuesta trae `tokenRefreshRequired`.
   */
  @Patch('users/:identifier/role')
  @HttpCode(HttpStatus.OK)
  async updateUserRole(
    @Param('identifier') identifier: string,
    @Body() dto: AdminUpdateRoleDto,
    @Headers('x-user-id') requesterId: string,
    @Headers('x-user-role') requesterRole: string,
    @Headers('x-user-email') requesterEmail: string,
  ) {
    const result = await this.authService.adminUpdateRole(
      identifier,
      dto.role,
      requesterRole,
      requesterId,
      requesterEmail,
    );
    return {
      statusCode: 200,
      message: result.changed
        ? `Rol actualizado a ${result.role}. El usuario debe volver a iniciar sesion para que surta efecto.`
        : `El usuario ya tenia el rol ${result.role}`,
      data: result,
    };
  }

  /**
   * Login/alta con Google.
   *
   * Recibe el ID token entero (`credential`) y lo verifica acá: firma contra el
   * JWKS de Google, `iss`, `aud` contra nuestro GOOGLE_CLIENT_ID, `exp` y
   * `email_verified`. La identidad (`sub`, `email`, `name`) sale de esa
   * verificación, nunca del body. Ver `oauth/google-id-token.service.ts`.
   *
   * Es una ruta pública por definición (nadie tiene sesión todavía), así que la
   * verificación del token ES el control de acceso; no hay una segunda barrera
   * más atrás.
   *
   * Códigos: 200 sesión emitida · 400 body malformado o provider no soportado ·
   * 401 token no verificable, vencido, de otra audiencia o email sin verificar ·
   * 503 GOOGLE_CLIENT_ID sin configurar o claves de Google inalcanzables.
   */
  @Post('oauth/callback')
  @HttpCode(HttpStatus.OK)
  async oauthCallback(@Body() body: OAuthCallbackDto) {
    const identity = await this.googleIdToken.verify(body.credential);

    const result = await this.authService.oauthLogin(
      'google',
      identity.providerId,
      identity.email,
      identity.name,
    );

    return {
      statusCode: 200,
      message: 'OAuth login exitoso',
      data: result,
    };
  }
}

import {
  Controller,
  Post,
  Body,
  Get,
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Get('validate')
  async validate(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return { statusCode: 401, message: 'Token no provisto' };
    }
    const user = await this.authService.validateToken(token);
    return { statusCode: 200, data: user };
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

  @Post('oauth/callback')
  @HttpCode(HttpStatus.OK)
  async oauthCallback(@Body() body: OAuthCallbackDto) {
    const result = await this.authService.oauthLogin(
      body.provider,
      body.providerId,
      body.email,
      body.name,
    );
    return {
      statusCode: 200,
      message: 'OAuth login exitoso',
      data: result,
    };
  }
}

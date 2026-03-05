import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';

export enum UserRole {
  ASSET_OWNER = 'asset_owner',
  ENTREPRENEUR = 'entrepreneur',
}

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}

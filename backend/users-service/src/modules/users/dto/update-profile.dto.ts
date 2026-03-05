import { IsString, IsOptional, IsUrl, MaxLength, IsEnum, IsEmail } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  github?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateNotificationSettingsDto {
  emailRequests?: boolean;
  emailMessages?: boolean;
  emailMarketing?: boolean;
  emailDigest?: boolean;
  emailSecurity?: boolean;
}

export class UpdateStatusDto {
  @IsEnum(['active', 'suspended'])
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

import { IsString, IsUUID, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export class CreateRequestDto {
  @IsUUID()
  assetId: string;

  // Copia desnormalizada del título del activo. assets-service lo topea en 120
  // (CreateAssetDto). Acá iba sin tope: una cadena arbitrariamente larga se
  // guardaba en la fila y se interpolaba en el body de cada notificación.
  // 200 deja headroom sobre el límite real en vez de espejarlo justo, para no
  // rechazar un título legacy y romper el alta de solicitudes.
  @IsString()
  @MaxLength(200)
  assetTitle: string;

  @IsUUID()
  ownerId: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  initialMessage: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  proposedTerms?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class UpdateRequestStatusDto {
  @IsIn(['accepted', 'rejected', 'closed'])
  status: 'accepted' | 'rejected' | 'closed';
}

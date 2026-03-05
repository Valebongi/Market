import { IsString, IsUUID, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export class CreateRequestDto {
  @IsUUID()
  assetId: string;

  @IsString()
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

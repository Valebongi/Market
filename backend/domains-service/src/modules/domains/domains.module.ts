import { Module } from '@nestjs/common';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { PricingService } from './pricing.service';

@Module({
  controllers: [DomainsController],
  providers: [DomainsService, PricingService],
})
export class DomainsModule {}

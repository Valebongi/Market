import { Module } from '@nestjs/common';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { PricingService } from './pricing.service';
import { LookupQuotaService } from './lookup-quota';

@Module({
  controllers: [DomainsController],
  providers: [DomainsService, PricingService, LookupQuotaService],
})
export class DomainsModule {}

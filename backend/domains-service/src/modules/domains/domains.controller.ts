import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DomainsService } from './domains.service';
import { SearchDomainDto } from './dto/search-domain.dto';

@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(
    @Headers('x-user-id') userId: string,
    @Body() dto: SearchDomainDto,
  ) {
    return this.domainsService.search(userId, dto);
  }

  @Get('history')
  getHistory(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.domainsService.getHistory(userId, limit);
  }
}

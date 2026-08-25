import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { DomainsService } from './domains.service';
import { UserContextGuard } from '../../common/user-context.guard';
import { SearchDomainDto } from './dto/search-domain.dto';
import { QueryHistoryDto } from './dto/query-history.dto';

@Controller('domains')
@UseGuards(UserContextGuard)
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
    @Query() query: QueryHistoryDto,
  ) {
    return this.domainsService.getHistory(userId, query.limit ?? 10);
  }
}

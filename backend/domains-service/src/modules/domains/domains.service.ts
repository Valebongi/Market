import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchDomainDto } from './dto/search-domain.dto';

const DEFAULT_EXTENSIONS = ['.com', '.io', '.app', '.tech', '.co', '.dev'];

// Whois-based domain availability check via RDAP (public API, no auth required)
// In production, replace with a paid DNS API (e.g., GoDaddy, Namecheap, Dynadot)
async function checkDomainAvailability(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`https://rdap.org/domain/${domain}`, {
      signal: AbortSignal.timeout(3000),
    });
    // If RDAP returns 200, the domain exists (registered)
    // If 404, it's available
    return response.status === 404;
  } catch {
    // Network error or timeout — assume unavailable to be safe
    return false;
  }
}

@Injectable()
export class DomainsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, dto: SearchDomainDto) {
    const extensions = dto.extensions?.length ? dto.extensions : DEFAULT_EXTENSIONS;
    const baseName = dto.query
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-|-$/g, '');

    const domains = extensions.map((ext) => ({
      domain: `${baseName}${ext}`,
      extension: ext,
    }));

    // Check availability in parallel (with timeout per domain)
    const results = await Promise.all(
      domains.map(async ({ domain, extension }) => {
        const available = await checkDomainAvailability(domain);
        return {
          domain,
          extension,
          available,
          registrarUrl: available
            ? `https://www.namecheap.com/domains/registration/results/?domain=${domain}`
            : null,
        };
      }),
    );

    // Persist search history
    await this.prisma.domainSearch.create({
      data: {
        userId,
        query: dto.query,
        results: results as any,
      },
    });

    return {
      query: dto.query,
      baseName,
      results,
    };
  }

  async getHistory(userId: string, limit = 10) {
    return this.prisma.domainSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

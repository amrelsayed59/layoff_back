import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      // Fail fast with a clear message instead of a Prisma init error later.
      throw new Error(
        'Missing DATABASE_URL (required to initialize PrismaClient).',
      );
    }

    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    // Adapter typing is narrower than runtime support.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super({ adapter } as any);
  }

  async onModuleInit() {
    const dbUrl = process.env.DATABASE_URL;
    try {
      await this.$connect();
      console.log('✅ Connected to DB:', maskDbUrl(dbUrl));
    } catch (err) {
      console.error('❌ Failed to connect to DB:', maskDbUrl(dbUrl));
      console.error(err);
      throw err;
    }
  }
}

/**
 * Masks password in a DB URL for safe logging.
 */
function maskDbUrl(url: string | undefined): string {
  if (!url) return '(missing DATABASE_URL)';
  try {
    const u = new URL(url);
    if (u.password) u.password = '*****';
    return u.toString();
  } catch {
    return url.replace(/:(?:[^:@/]+)@/, ':*****@');
  }
}

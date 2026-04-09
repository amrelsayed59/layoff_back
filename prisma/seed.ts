import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error(
    'Missing DATABASE_URL. Set DATABASE_URL in your environment before running `prisma db seed`.',
  );
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
// Adapter typing is narrower than runtime support.
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const prisma = new PrismaClient({ adapter } as any);

/**
 * Removes password from a PostgreSQL connection string for safe logging.
 */
function sanitizeDbUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '*****';
    return u.toString();
  } catch {
    // Fallback for non-standard URLs.
    return url.replace(/:(?:[^:@/]+)@/, ':*****@');
  }
}

async function main() {
  const dbUrl = connectionString as string;
  console.log('🌱 Seeding database:', sanitizeDbUrl(dbUrl));
  await ensureUserFromEnv({
    emailEnv: 'SEED_ADMIN_EMAIL',
    passwordEnv: 'SEED_ADMIN_PASSWORD',
    role: 'admin',
  });

  await ensureUserFromEnv({
    emailEnv: 'SEED_USER_EMAIL',
    passwordEnv: 'SEED_USER_PASSWORD',
    role: 'admin',
  });
}

/**
 * Ensures a user exists using credentials provided via environment variables.
 * Skips creation when vars are missing to avoid hardcoding secrets in source.
 */
async function ensureUserFromEnv(input: {
  emailEnv: string;
  passwordEnv: string;
  role: string;
}): Promise<void> {
  const emailRaw = process.env[input.emailEnv]?.trim();
  const passwordRaw = process.env[input.passwordEnv];

  if (!emailRaw || !passwordRaw) {
    console.log(
      `ℹ️ Skipping user seed: missing ${input.emailEnv} / ${input.passwordEnv}`,
    );
    return;
  }

  await ensureUser({
    email: emailRaw,
    password: passwordRaw,
    role: input.role,
  });
}

/**
 * Ensures a user exists (idempotent): creates it if missing, otherwise leaves it unchanged.
 */
async function ensureUser(input: {
  email: string;
  password: string;
  role: string;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log('✅ User already exists:', existing.email);
    return;
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const created = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: input.role,
    },
  });

  console.log('✅ User created successfully:', created.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

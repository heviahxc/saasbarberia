import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { defineConfig } from 'prisma/config';

const variables = parse(
  readFileSync(resolve(process.cwd(), '.env.test')),
);

const databaseUrl = variables.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Falta DATABASE_URL en .env.test');
}

const destino = new URL(databaseUrl);

if (
  !['postgresql:', 'postgres:'].includes(destino.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname) ||
  destino.pathname !== '/barber_saas_test' ||
  destino.searchParams.get('schema') !== 'public'
) {
  throw new Error(
    'Las pruebas requieren PostgreSQL local, base barber_saas_test y esquema public',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
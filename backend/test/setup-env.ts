import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

const variables = parse(
  readFileSync(resolve(process.cwd(), '.env.test')),
);

const databaseUrl = variables.DATABASE_URL;
const jwtSecret = variables.JWT_SECRET;

if (!databaseUrl || !jwtSecret) {
  throw new Error(
    '.env.test debe definir DATABASE_URL y JWT_SECRET',
  );
}

const destino = new URL(databaseUrl);

if (
  !['postgresql:', 'postgres:'].includes(destino.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname) ||
  destino.pathname !== '/barber_saas_test'
) {
  throw new Error(
    'Las pruebas solo pueden usar la base local barber_saas_test',
  );
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = jwtSecret;
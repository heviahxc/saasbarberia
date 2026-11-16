import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const raiz = fileURLToPath(new URL('../', import.meta.url));
const variables = parse(readFileSync(new URL('../.env.test', import.meta.url)));
if (!variables.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env.test');
const destino = new URL(variables.DATABASE_URL);
if (!['postgres:', 'postgresql:'].includes(destino.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname) || destino.pathname !== '/barber_saas_test') {
  throw new Error('Solo se permite migrar la base local barber_saas_test');
}
const resultado = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'prisma7.config.ts'], {
  cwd: raiz, stdio: 'inherit', env: { ...process.env, DATABASE_URL: variables.DATABASE_URL },
});
if (resultado.error) throw resultado.error;
process.exit(resultado.status ?? 1);

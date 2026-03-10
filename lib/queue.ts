import { PgBoss } from 'pg-boss';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://alerthive:alerthive@localhost:5433/alerthive';

const globalForPgBoss = globalThis as unknown as {
  pgBoss: PgBoss | undefined;
};

function createBoss(): PgBoss {
  return new PgBoss(connectionString);
}

export const boss = globalForPgBoss.pgBoss ?? createBoss();

if (process.env.NODE_ENV !== 'production') {
  globalForPgBoss.pgBoss = boss;
}

let started = false;

export async function ensureBossStarted(): Promise<PgBoss> {
  if (!started) {
    await boss.start();
    started = true;
  }
  return boss;
}

export const ESCALATION_QUEUE = 'escalation-timeout';

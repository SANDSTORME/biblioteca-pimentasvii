import { closeDatabase, initDatabase } from './db';
import { logError, logInfo } from './logger';

const run = async () => {
  await initDatabase();
  logInfo('Migrações aplicadas com sucesso.');
  await closeDatabase();
};

void run().catch((error) => {
  logError('Falha ao aplicar as migrações.', error);
  process.exit(1);
});

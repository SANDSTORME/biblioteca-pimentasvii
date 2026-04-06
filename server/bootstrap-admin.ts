import { closeDatabase, initDatabase, readActiveUsers } from './db';
import { serverConfig } from './config';
import { logError, logInfo } from './logger';

const run = async () => {
  await initDatabase();

  const activeUsers = await readActiveUsers();
  const activeAdmins = activeUsers.filter((user) => user.role === 'admin');
  const bootstrapEmail = serverConfig.bootstrapAdminEmail;

  if (bootstrapEmail) {
    const bootstrapAdmin = activeAdmins.find((user) => user.email === bootstrapEmail);
    if (bootstrapAdmin) {
      logInfo('Administrador bootstrap pronto para o primeiro acesso.', {
        email: bootstrapAdmin.email,
        userId: bootstrapAdmin.id,
      });
      await closeDatabase();
      return;
    }
  }

  if (activeAdmins.length > 0) {
    logInfo('O banco ja possui administrador ativo. Nenhum bootstrap adicional foi criado.', {
      totalAdmins: activeAdmins.length,
    });
    await closeDatabase();
    return;
  }

  throw new Error(
    'Nenhum administrador ativo foi encontrado. Configure BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD e execute novamente.',
  );
};

void run().catch(async (error) => {
  logError('Falha ao preparar o administrador bootstrap.', error);

  try {
    await closeDatabase();
  } catch {
    // Ignora erro secundario de fechamento.
  }

  process.exit(1);
});

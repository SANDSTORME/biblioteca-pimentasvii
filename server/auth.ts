import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { User, UserRole } from '../src/types';
import { coerceSchoolClass } from '../src/lib/schoolClasses';
import { registerAuditLog } from './audit';
import {
  createId,
  execute,
  hashToken,
  isValidStudentInstitutionalEmail,
  normalizeEmail,
  nowIso,
  queryOne,
  readTeacherTokenByToken,
  readUserByEmail,
  readUserById,
  serializeUser,
  today,
  withTransaction,
} from './db';
import { serverConfig } from './config';
import { buildPublicAppUrl, sendPasswordResetEmail } from './mailer';
import { validatePasswordStrength } from './passwords';

interface RegisterUserInput {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  turma?: string;
  token?: string;
}

type AuthPayload = {
  sub: string;
  role: UserRole;
  email: string;
};

const PASSWORD_RESET_TOKEN_TYPE = 'password_reset';

const createSessionToken = (user: User) =>
  jwt.sign({ sub: user.id, role: user.role, email: user.email } satisfies AuthPayload, serverConfig.jwtSecret, {
    expiresIn: '12h',
  });

const readActivePasswordResetToken = async (rawToken: string) =>
  queryOne<{
    id: string;
    usuario_id: string;
    email: string;
    expira_em: string;
    usado_em: string | null;
  }>(
    `SELECT id, usuario_id, email, expira_em, usado_em
       FROM account_tokens
      WHERE tipo = $1
        AND token_hash = $2
        AND usado_em IS NULL
        AND expira_em >= $3
      ORDER BY criado_em DESC
      LIMIT 1`,
    [PASSWORD_RESET_TOKEN_TYPE, hashToken(rawToken), nowIso()],
  );

export const resolveUserFromToken = async (token: string) => {
  const payload = jwt.verify(token, serverConfig.jwtSecret) as AuthPayload;
  const row = await readUserById(payload.sub);
  if (!row || !row.ativo) {
    throw new Error('Sessão inválida.');
  }

  return serializeUser(row);
};

export const loginUser = async (email: string, senha: string) => {
  const row = await readUserByEmail(email);
  if (!row || !row.ativo || !(await bcrypt.compare(senha, row.senha_hash))) {
    return { success: false, message: 'E-mail ou senha inválidos.' as const };
  }

  await execute('UPDATE users SET ultimo_acesso = $1 WHERE id = $2', [today(), row.id]);
  const user = serializeUser({ ...row, ultimo_acesso: today() });

  return {
    success: true,
    message: 'Sessão iniciada com sucesso.',
    token: createSessionToken(user),
    user,
  };
};

export const registerUser = async (input: RegisterUserInput) => {
  const email = normalizeEmail(input.email);
  const turma = input.role === 'aluno' ? coerceSchoolClass(input.turma) : null;
  if (await readUserByEmail(email)) {
    return { success: false, message: 'Já existe um usuário com este e-mail.' as const };
  }

  if (input.role === 'aluno' && !turma) {
    return { success: false, message: 'Selecione uma turma válida para o aluno.' as const };
  }

  if (input.role === 'aluno' && !isValidStudentInstitutionalEmail(email)) {
    return {
      success: false,
      message: 'O aluno deve usar um Gmail institucional terminado em @aluno.educacao.sp.gov.br.' as const,
    };
  }

  const passwordCheck = validatePasswordStrength(input.senha);
  if (!passwordCheck.valid) {
    return { success: false, message: passwordCheck.message };
  }

  let selectedToken = undefined;
  if (input.role === 'professor') {
    selectedToken = await readTeacherTokenByToken(input.token || '');
    if (!selectedToken) {
      return { success: false, message: 'Token de professor inválido.' as const };
    }
    if (selectedToken.usado) {
      return { success: false, message: 'Este token já foi utilizado.' as const };
    }
  }

  const userId = createId('user');
  const createdAt = today();
  const passwordHash = await bcrypt.hash(input.senha, 10);

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO users (id, nome, email, role, ativo, senha_hash, turma, token_professor_id, ultimo_acesso, criado_em, email_confirmado, email_confirmado_em)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, $8, $9, TRUE, $10)`,
      [
        userId,
        input.nome.trim(),
        email,
        input.role,
        passwordHash,
        turma,
        selectedToken?.id ?? null,
        createdAt,
        createdAt,
        createdAt,
      ],
    );

    await registerAuditLog(
      {
        acao: 'usuario_criado',
        categoria: 'usuarios',
        descricao: `Conta criada para ${input.nome.trim()} (${input.role}).`,
        ator: null,
        alvoTipo: 'usuario',
        alvoId: userId,
        detalhes: {
          email,
          role: input.role,
          turma: turma ?? null,
        },
      },
      client,
    );

    if (selectedToken) {
      await client.query('UPDATE teacher_tokens SET usado = TRUE, usado_por_id = $1 WHERE id = $2', [userId, selectedToken.id]);
      await registerAuditLog(
        {
          acao: 'token_professor_utilizado',
          categoria: 'tokens',
          descricao: `Token de professor utilizado por ${input.nome.trim()}.`,
          ator: null,
          alvoTipo: 'token_professor',
          alvoId: selectedToken.id,
          detalhes: {
            token: selectedToken.token,
            usuarioId: userId,
            email,
          },
        },
        client,
      );
    }
  });

  const createdUser = await readUserById(userId);
  const user = serializeUser(createdUser!);

  return {
    success: true,
    message: 'Cadastro realizado com sucesso.',
    token: createSessionToken(user),
    user,
  };
};

export const requestPasswordReset = async (email: string, requesterIp?: string) => {
  const normalizedEmail = normalizeEmail(email);
  const userRow = await readUserByEmail(normalizedEmail);
  const defaultResponse = {
    success: true as const,
    message: 'Se o e-mail estiver cadastrado, enviaremos as orientações para redefinir a senha.',
    expiresInMinutes: serverConfig.passwordResetExpiryMinutes,
  };

  if (!userRow || !userRow.ativo) {
    return defaultResponse;
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const tokenId = createId('account-token');
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + serverConfig.passwordResetExpiryMinutes * 60_000).toISOString();
  let previousTokenIds: string[] = [];

  await withTransaction(async (client) => {
    const previousTokens = await client.query<{ id: string }>(
      `SELECT id
         FROM account_tokens
        WHERE usuario_id = $1
          AND tipo = $2
          AND usado_em IS NULL`,
      [userRow.id, PASSWORD_RESET_TOKEN_TYPE],
    );

    previousTokenIds = previousTokens.rows.map((row) => row.id);

    await client.query(
      `UPDATE account_tokens
          SET usado_em = $1
        WHERE usuario_id = $2
          AND tipo = $3
          AND usado_em IS NULL`,
      [createdAt, userRow.id, PASSWORD_RESET_TOKEN_TYPE],
    );

    await client.query(
      `INSERT INTO account_tokens (id, usuario_id, email, tipo, token_hash, expira_em, usado_em, criado_em, solicitado_ip)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8)`,
      [tokenId, userRow.id, normalizedEmail, PASSWORD_RESET_TOKEN_TYPE, tokenHash, expiresAt, createdAt, requesterIp ?? null],
    );
  });

  const resetUrl = buildPublicAppUrl(`/redefinir-senha?token=${rawToken}`);
  const mailResult = await sendPasswordResetEmail({
    to: normalizedEmail,
    nome: userRow.nome,
    resetUrl,
    expiresInMinutes: serverConfig.passwordResetExpiryMinutes,
  });

  if (!mailResult.accepted) {
    await withTransaction(async (client) => {
      await client.query('UPDATE account_tokens SET usado_em = $1 WHERE id = $2', [createdAt, tokenId]);

      for (const previousTokenId of previousTokenIds) {
        await client.query('UPDATE account_tokens SET usado_em = NULL WHERE id = $1', [previousTokenId]);
      }
    });

    return defaultResponse;
  }

  return {
    ...defaultResponse,
    previewUrl: mailResult.previewUrl,
  };
};

export const validatePasswordResetToken = async (token: string) => {
  if (!token.trim()) {
    return { success: false, message: 'Token de redefinição inválido.' as const };
  }

  const row = await readActivePasswordResetToken(token.trim());
  if (!row) {
    return { success: false, message: 'Este link expirou ou já foi utilizado.' as const };
  }

  return {
    success: true,
    message: 'Token válido.',
    email: row.email,
  };
};

export const resetPassword = async (token: string, senha: string) => {
  const passwordCheck = validatePasswordStrength(senha);
  if (!passwordCheck.valid) {
    return { success: false, message: passwordCheck.message };
  }

  const tokenRow = await readActivePasswordResetToken(token.trim());
  if (!tokenRow) {
    return { success: false, message: 'Este link expirou ou já foi utilizado.' as const };
  }

  const userRow = await readUserById(tokenRow.usuario_id);
  if (!userRow || !userRow.ativo) {
    return { success: false, message: 'Usuário não encontrado para redefinição.' as const };
  }

  const passwordHash = await bcrypt.hash(senha, 10);
  const usedAt = nowIso();

  await withTransaction(async (client) => {
    await client.query('UPDATE users SET senha_hash = $1, email_confirmado = TRUE WHERE id = $2', [passwordHash, userRow.id]);
    await client.query('UPDATE account_tokens SET usado_em = $1 WHERE id = $2', [usedAt, tokenRow.id]);
    await registerAuditLog(
      {
        acao: 'senha_redefinida',
        categoria: 'seguranca',
        descricao: `Senha redefinida para ${userRow.nome}.`,
        ator: serializeUser(userRow),
        alvoTipo: 'seguranca',
        alvoId: userRow.id,
        detalhes: {
          email: userRow.email,
        },
      },
      client,
    );
  });

  return {
    success: true,
    message: 'Senha redefinida com sucesso. Faça login com a nova senha.',
  };
};

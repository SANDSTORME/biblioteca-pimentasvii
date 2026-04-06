import { AuditAction, AuditLog, User } from '../src/types';
import { createId, execute, nowIso, QueryExecutor, readAuditLogRows, serializeAuditLog } from './db';

export interface AuditInput {
  acao: AuditAction;
  categoria: AuditLog['categoria'];
  descricao: string;
  ator?: User | null;
  alvoTipo: AuditLog['alvoTipo'];
  alvoId?: string;
  detalhes?: Record<string, unknown>;
}

export interface AuditFilters {
  acao?: AuditAction;
  atorId?: string;
  dataInicial?: string;
  dataFinal?: string;
}

export const registerAuditLog = async (input: AuditInput, executor?: QueryExecutor) => {
  await execute(
    `INSERT INTO audit_logs (id, acao, categoria, descricao, ator_id, ator_nome, ator_role, alvo_tipo, alvo_id, detalhes, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      createId('audit'),
      input.acao,
      input.categoria,
      input.descricao,
      input.ator?.id ?? null,
      input.ator?.nome ?? null,
      input.ator?.role ?? null,
      input.alvoTipo,
      input.alvoId ?? null,
      input.detalhes ? JSON.stringify(input.detalhes) : null,
      nowIso(),
    ],
    executor,
  );
};

export const getAuditTrail = async (filters: AuditFilters = {}) => {
  const rows = await readAuditLogRows();

  return rows
    .map(serializeAuditLog)
    .filter((entry) => {
      if (filters.acao && entry.acao !== filters.acao) {
        return false;
      }

      if (filters.atorId && entry.atorId !== filters.atorId) {
        return false;
      }

      if (filters.dataInicial && entry.criadoEm.slice(0, 10) < filters.dataInicial) {
        return false;
      }

      if (filters.dataFinal && entry.criadoEm.slice(0, 10) > filters.dataFinal) {
        return false;
      }

      return true;
    });
};

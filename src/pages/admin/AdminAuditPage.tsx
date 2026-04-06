import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Filter, RefreshCcw } from 'lucide-react';
import { AuditAction, AuditLog } from '@/types';
import { useLibrary } from '@/contexts/LibraryContext';
import { getAuditLogsRequest } from '@/services/api';

const actionLabel: Record<AuditAction, string> = {
  livro_criado: 'Livro criado',
  livro_editado: 'Livro editado',
  livro_excluido: 'Livro excluído',
  usuario_criado: 'Usuário criado',
  usuario_alterado: 'Usuário alterado',
  emprestimo_aprovado: 'Empréstimo aprovado',
  emprestimo_recusado: 'Empréstimo recusado',
  emprestimo_devolvido: 'Empréstimo devolvido',
  aviso_criado: 'Aviso criado',
  permissao_alterada: 'Permissão alterada',
  token_professor_gerado: 'Token gerado',
  token_professor_utilizado: 'Token utilizado',
  documento_criado: 'Documento criado',
  documento_editado: 'Documento editado',
  documento_excluido: 'Documento excluído',
  senha_redefinida: 'Senha redefinida',
};

const AdminAuditPage: React.FC = () => {
  const { users } = useLibrary();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acao, setAcao] = useState<AuditAction | 'todos'>('todos');
  const [atorId, setAtorId] = useState('todos');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAuditLogsRequest({
        acao: acao === 'todos' ? undefined : acao,
        atorId: atorId === 'todos' ? undefined : atorId,
        dataInicial: dataInicial || undefined,
        dataFinal: dataFinal || undefined,
      });
      setLogs(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a auditoria.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    void getAuditLogsRequest()
      .then((response) => {
        if (!active) {
          return;
        }

        setLogs(response);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a auditoria.');
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const activeAdmins = useMemo(() => users.filter((user) => user.role === 'admin'), [users]);

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
        <p className="section-kicker">Rastreabilidade</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Auditoria administrativa</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Acompanhe decisões importantes da operação da biblioteca com filtros por ação, usuário e período.
        </p>
      </div>

      <div className="glass-panel rounded-[1.55rem] p-4 shadow-card sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Ação</label>
            <select
              value={acao}
              onChange={(event) => setAcao(event.target.value as AuditAction | 'todos')}
              className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
            >
              <option value="todos">Todas</option>
              {Object.entries(actionLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Usuário</label>
            <select
              value={atorId}
              onChange={(event) => setAtorId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
            >
              <option value="todos">Todos</option>
              {activeAdmins.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Data inicial</label>
            <input
              type="date"
              value={dataInicial}
              onChange={(event) => setDataInicial(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Data final</label>
            <input
              type="date"
              value={dataFinal}
              onChange={(event) => setDataFinal(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => void fetchLogs()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card"
            >
              <Filter className="h-4 w-4" />
              Filtrar
            </button>
            <button
              type="button"
              onClick={() => void fetchLogs()}
              className="inline-flex items-center justify-center rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm font-medium text-foreground"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-[1.35rem] border border-destructive/20 bg-destructive/10 p-4 text-sm text-foreground">{error}</div>}

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="glass-panel h-28 animate-pulse rounded-[1.35rem]" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-panel rounded-[1.55rem] p-10 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-gold text-primary-foreground shadow-card">
            <Activity className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-3xl text-foreground">Nenhum registro encontrado</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Ajuste os filtros para visualizar ações da administração, movimentações do acervo e eventos de segurança.
          </p>
        </div>
      ) : (
        <div className="stagger-list space-y-3">
          {logs.map((entry) => (
            <article key={entry.id} className="glass-panel rounded-[1.45rem] p-5 shadow-card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {actionLabel[entry.acao]}
                    </span>
                    <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {entry.categoria}
                    </span>
                  </div>
                  <p className="mt-4 text-base font-semibold text-foreground">{entry.descricao}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {entry.atorNome ? `${entry.atorNome} • ${entry.atorRole}` : 'Sistema'} • alvo {entry.alvoTipo}
                    {entry.alvoId ? ` • ${entry.alvoId}` : ''}
                  </p>
                  {entry.detalhes && (
                    <pre className="mt-4 overflow-x-auto rounded-[1.2rem] border border-border/70 bg-background/70 p-4 text-xs text-muted-foreground">
                      {JSON.stringify(entry.detalhes, null, 2)}
                    </pre>
                  )}
                </div>
                <div className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                  {entry.criadoEm}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAuditPage;

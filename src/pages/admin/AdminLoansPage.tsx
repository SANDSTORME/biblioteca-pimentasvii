import React, { useMemo, useState } from 'react';
import { Check, RotateCcw, Search, TimerReset, X } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { useLibrary } from '@/contexts/LibraryContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const defaultRejectReason = 'Solicitação recusada pela administração.';

const AdminLoansPage: React.FC = () => {
  const { approveLoan, books, loans, rejectLoan, returnLoan, users } = useLibrary();
  const [filter, setFilter] = useState<string>('todos');
  const [tokenSearch, setTokenSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rejectingLoanId, setRejectingLoanId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(defaultRejectReason);

  const orderedLoans = useMemo(
    () => [...loans].sort((left, right) => right.dataPedido.localeCompare(left.dataPedido)),
    [loans],
  );

  const filtered = orderedLoans.filter((loan) => {
    const matchFilter = filter === 'todos' || loan.status === filter;
    const matchToken = tokenSearch === '' || loan.token.toLowerCase().includes(tokenSearch.toLowerCase());
    return matchFilter && matchToken;
  });

  const handleOpenRejectDialog = (loanId: string) => {
    setRejectingLoanId(loanId);
    setRejectReason(defaultRejectReason);
  };

  const handleReject = async () => {
    if (!rejectingLoanId) {
      return;
    }

    const result = await rejectLoan(rejectingLoanId, rejectReason);
    setFeedback(result.message);
    if (result.success) {
      setRejectingLoanId(null);
      setRejectReason(defaultRejectReason);
    }
  };

  return (
    <>
      <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
        <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
          <p className="section-kicker">Fluxo operacional</p>
          <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Empréstimos com status claro</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Aprove, recuse, devolva e acompanhe atrasos sem ambiguidade entre pendente, aprovado, devolvido e
            empréstimo vencido.
          </p>
        </div>

        {feedback && <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 p-4 text-sm text-foreground">{feedback}</div>}

        <div className="glass-panel rounded-[1.55rem] p-4 shadow-card sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={tokenSearch}
                onChange={(event) => setTokenSearch(event.target.value)}
                placeholder="Buscar por token do empréstimo"
                className="w-full rounded-2xl border border-border/70 bg-card/80 py-3 pl-10 pr-4 text-sm text-foreground"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {['todos', 'pendente', 'aprovado', 'atrasado', 'recusado', 'devolvido'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`rounded-full px-3 py-2 text-xs font-medium ${
                    filter === status ? 'bg-gradient-gold text-primary-foreground' : 'border border-border/70 bg-card/70 text-foreground'
                  }`}
                >
                  {status === 'todos' ? 'Todos' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="stagger-list space-y-3">
          {filtered.map((loan) => {
            const book = books.find((entry) => entry.id === loan.livroId);
            const student = users.find((entry) => entry.id === loan.alunoId);

            return (
              <article
                key={loan.id}
                className={`glass-panel rounded-[1.55rem] p-5 shadow-card ${
                  loan.status === 'atrasado' ? 'border-destructive/25 bg-destructive/5' : ''
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={loan.status} />
                      {loan.status === 'atrasado' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive">
                          <TimerReset className="h-3.5 w-3.5" />
                          {loan.diasAtraso ?? 0} dia(s) de atraso
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 font-display text-3xl text-foreground">{book?.titulo}</h2>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {student?.nome} • {student?.turma || 'Sem turma'} • token <span className="font-mono text-foreground">{loan.token}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                        Pedido em {loan.dataPedido}
                      </span>
                      {loan.dataDevolucaoPrevista && (
                        <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                          Previsão {loan.dataDevolucaoPrevista}
                        </span>
                      )}
                      {loan.dataDevolucao && (
                        <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                          Devolvido em {loan.dataDevolucao}
                        </span>
                      )}
                    </div>
                    {loan.observacao && <p className="mt-3 text-sm text-destructive">{loan.observacao}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {loan.status === 'pendente' && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await approveLoan(loan.id);
                            setFeedback(result.message);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
                        >
                          <Check className="h-4 w-4" />
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRejectDialog(loan.id)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                        >
                          <X className="h-4 w-4" />
                          Recusar
                        </button>
                      </>
                    )}

                    {(loan.status === 'aprovado' || loan.status === 'atrasado') && (
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await returnLoan(loan.id);
                          setFeedback(result.message);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm font-medium text-foreground"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Registrar devolução
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <Dialog open={!!rejectingLoanId} onOpenChange={(open) => !open && setRejectingLoanId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar empréstimo</DialogTitle>
            <DialogDescription>
              Registre um motivo claro para manter o histórico administrativo organizado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="reject-reason">
              Motivo da recusa
            </label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setRejectingLoanId(null)}
              className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleReject()}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
            >
              Confirmar recusa
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminLoansPage;

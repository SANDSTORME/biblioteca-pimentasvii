import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Clock3 } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';

const StudentLoansPage: React.FC = () => {
  const { user } = useAuth();
  const { books, loans } = useLibrary();
  const navigate = useNavigate();

  const myLoans = loans
    .filter((loan) => loan.alunoId === user?.id)
    .sort((left, right) => right.dataPedido.localeCompare(left.dataPedido));

  const overdueCount = myLoans.filter((loan) => loan.status === 'atrasado').length;

  return (
    <div className="max-w-5xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
        <p className="section-kicker">Minha circulação</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Empréstimos do aluno</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Acompanhe cada pedido com status claro, previsão de devolução e destaque imediato para atrasos.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            {myLoans.length} registro(s)
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              overdueCount > 0 ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border/70 bg-card/70 text-muted-foreground'
            }`}
          >
            {overdueCount} atraso(s)
          </span>
        </div>
      </div>

      {myLoans.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Nenhum empréstimo registrado"
          description="Você ainda não solicitou livros. Explore o catálogo para começar sua próxima leitura."
          action={{ label: 'Ir para o catálogo', onClick: () => navigate('/aluno/catalogo') }}
        />
      ) : (
        <div className="stagger-list space-y-3">
          {myLoans.map((loan) => {
            const book = books.find((entry) => entry.id === loan.livroId);
            return (
              <article
                key={loan.id}
                className={`glass-panel rounded-[1.45rem] p-5 shadow-card ${
                  loan.status === 'atrasado' ? 'border-destructive/25 bg-destructive/5' : ''
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={loan.status} />
                      {loan.status === 'atrasado' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive">
                          <Clock3 className="h-3.5 w-3.5" />
                          {loan.diasAtraso ?? 0} dia(s) de atraso
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 font-display text-3xl text-foreground">{book?.titulo}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{book?.autor}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                        Token {loan.token}
                      </span>
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

                  <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4 text-right text-sm">
                    <p className="text-muted-foreground">Faixa escolar</p>
                    <p className="mt-1 font-medium text-foreground">{book?.faixaEscolar}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentLoansPage;

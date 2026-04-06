import React from 'react';
import { BadgePlus, BookMarked, CheckCircle2, Clock3, Heart, MessageSquareQuote, XCircle } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';

type ActivityItem = {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  status?: string;
};

// Linha do tempo pessoal do aluno com empréstimos, favoritos e resenhas publicadas.
const StudentHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { books, favorites, loans, reviews } = useLibrary();

  const myLoans = loans.filter((loan) => loan.alunoId === user?.id);
  const myFavorites = favorites.filter((favorite) => favorite.usuarioId === user?.id);
  const myReviews = reviews.filter((review) => review.usuarioId === user?.id);

  const activityItems: ActivityItem[] = [
    ...myLoans.map((loan) => {
      const book = books.find((entry) => entry.id === loan.livroId);
      const date = loan.status === 'devolvido' ? loan.dataDevolucao || loan.dataPedido : loan.dataPedido;

      const tone =
        loan.status === 'devolvido'
          ? 'text-primary'
          : loan.status === 'recusado'
            ? 'text-destructive'
            : 'text-warm-gold';

      const icon =
        loan.status === 'devolvido'
          ? CheckCircle2
          : loan.status === 'recusado'
            ? XCircle
            : Clock3;

      return {
        id: `loan-${loan.id}`,
        date,
        title: book?.titulo || 'Livro não encontrado',
        description:
          loan.status === 'devolvido'
            ? 'Leitura concluída e devolução registrada.'
            : loan.status === 'aprovado'
              ? 'Empréstimo aprovado pela biblioteca.'
              : loan.status === 'recusado'
                ? loan.observacao || 'Solicitação recusada.'
                : 'Solicitação enviada e aguardando aprovação.',
        icon,
        accent: tone,
        status: loan.status,
      };
    }),
    ...myFavorites.map((favorite) => {
      const book = books.find((entry) => entry.id === favorite.livroId);
      return {
        id: `favorite-${favorite.id}`,
        date: favorite.criadoEm,
        title: book?.titulo || 'Livro não encontrado',
        description: 'Livro salvo na sua estante de favoritos.',
        icon: Heart,
        accent: 'text-rose-400',
      };
    }),
    ...myReviews.map((review) => {
      const book = books.find((entry) => entry.id === review.livroId);
      return {
        id: `review-${review.id}`,
        date: review.atualizadoEm || review.criadoEm,
        title: book?.titulo || 'Livro não encontrado',
        description: `Resenha publicada com nota ${review.nota}/5.`,
        icon: MessageSquareQuote,
        accent: 'text-sky-400',
      };
    }),
    ...(user?.criadoEm
      ? [
          {
            id: `user-created-${user.id}`,
            date: user.criadoEm,
            title: 'Conta criada na biblioteca',
            description: 'Seu acesso foi registrado e o histórico passa a acompanhar sua jornada de leitura a partir daqui.',
            icon: BadgePlus,
            accent: 'text-primary',
          },
        ]
      : []),
  ].sort((left, right) => right.date.localeCompare(left.date));

  const completedLoans = myLoans.filter((loan) => loan.status === 'devolvido').length;

  return (
    <div className="max-w-5xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
        <p className="section-kicker">Memória de leitura</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Histórico do aluno</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          Acompanhe tudo o que você já solicitou, concluiu, favoritou e avaliou dentro da biblioteca.
        </p>
      </div>

      <div className="stagger-grid grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={BookMarked} label="Solicitações registradas" value={myLoans.length} />
        <StatCard icon={CheckCircle2} label="Leituras concluídas" value={completedLoans} />
        <StatCard icon={Heart} label="Favoritos salvos" value={myFavorites.length} />
        <StatCard icon={MessageSquareQuote} label="Resenhas publicadas" value={myReviews.length} />
      </div>

      {activityItems.length === 0 ? (
        <EmptyState
          icon={Clock3}
          title="Seu histórico ainda vai começar"
          description="Quando você solicitar livros, salvar favoritos ou publicar resenhas, tudo aparecerá aqui."
        />
      ) : (
        <div className="glass-panel rounded-[1.55rem] p-4 shadow-card sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
            <h2 className="font-display text-2xl text-foreground">Linha do tempo</h2>
            <span className="w-fit rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              {activityItems.length} evento(s)
            </span>
          </div>

          <div className="stagger-list space-y-3">
            {activityItems.map((item) => (
              <div key={item.id} className="interactive-panel rounded-[1.35rem] border border-border/70 bg-card/70 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background/70 ${item.accent}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm leading-7 text-muted-foreground">{item.description}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.date}</p>
                    </div>
                  </div>

                  {item.status && <StatusBadge status={item.status} className="w-fit" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHistoryPage;

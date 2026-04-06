import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, BookOpen, Clock, Heart, History, Megaphone, MessageSquareQuote, Star } from 'lucide-react';
import BookCard from '@/components/shared/BookCard';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { noticeCategoryLabel } from '@/lib/community';
import { Book } from '@/types';

// Painel inicial do aluno com resumo de empréstimos, avisos, favoritos e histórico.
const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { books, favorites, loans, notices, reviews } = useLibrary();
  const navigate = useNavigate();

  const myLoans = loans
    .filter((loan) => loan.alunoId === user?.id)
    .sort((left, right) => right.dataPedido.localeCompare(left.dataPedido));
  const myFavorites = favorites
    .filter((favorite) => favorite.usuarioId === user?.id)
    .sort((left, right) => right.criadoEm.localeCompare(left.criadoEm));
  const myReviews = reviews
    .filter((review) => review.usuarioId === user?.id)
    .sort((left, right) => (right.atualizadoEm || right.criadoEm).localeCompare(left.atualizadoEm || left.criadoEm));

  const pendingLoans = myLoans.filter((loan) => loan.status === 'pendente');
  const activeLoans = myLoans.filter((loan) => loan.status === 'aprovado');
  const completedLoans = myLoans.filter((loan) => loan.status === 'devolvido');
  const favoriteBooks = myFavorites
    .map((favorite) => books.find((book) => book.id === favorite.livroId))
    .filter((book): book is Book => Boolean(book))
    .slice(0, 4);

  const activeNotices = notices
    .filter((notice) => notice.ativo && (notice.publico === 'todos' || notice.publico === 'alunos'))
    .sort((left, right) => {
      if (left.destaque !== right.destaque) {
        return Number(right.destaque) - Number(left.destaque);
      }
      return right.criadoEm.localeCompare(left.criadoEm);
    })
    .slice(0, 3);

  const highlightedBooks = [...books]
    .sort((left, right) => right.classificacao - left.classificacao || right.quantidadeDisponivel - left.quantidadeDisponivel)
    .slice(0, 4);

  const recentActivity = [
    ...myLoans.slice(0, 4).map((loan) => ({
      id: `loan-${loan.id}`,
      title: books.find((entry) => entry.id === loan.livroId)?.titulo || 'Livro não encontrado',
      description:
        loan.status === 'devolvido'
          ? 'Leitura concluída e devolução registrada.'
          : loan.status === 'aprovado'
            ? 'Empréstimo aprovado e pronto para retirada.'
            : loan.status === 'recusado'
              ? loan.observacao || 'Solicitação recusada.'
              : 'Solicitação enviada para a biblioteca.',
      date: loan.status === 'devolvido' ? loan.dataDevolucao || loan.dataPedido : loan.dataPedido,
      status: loan.status,
    })),
    ...myReviews.slice(0, 2).map((review) => ({
      id: `review-${review.id}`,
      title: books.find((entry) => entry.id === review.livroId)?.titulo || 'Livro não encontrado',
      description: `Resenha publicada com nota ${review.nota}/5.`,
      date: review.atualizadoEm || review.criadoEm,
      status: undefined,
    })),
  ]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 5);

  const lastToken = myLoans[0]?.token;

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen animate-card-enter rounded-[1.55rem] p-5 sm:rounded-[1.8rem] sm:p-6">
        <h1 className="font-display text-[2rem] font-bold text-foreground sm:text-[2.2rem]">
          Olá, {user?.nome?.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-sm leading-7 text-muted-foreground">
          Aqui está um resumo da sua jornada na biblioteca, com favoritos, histórico e avisos importantes.
        </p>
      </div>

      <div className="stagger-grid grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard icon={BookOpen} label="Livros disponíveis" value={books.filter((book) => book.quantidadeDisponivel > 0).length} />
        <StatCard icon={BookMarked} label="Empréstimos ativos" value={activeLoans.length} />
        <StatCard icon={Clock} label="Aguardando aprovação" value={pendingLoans.length} />
        <StatCard icon={Heart} label="Favoritos salvos" value={myFavorites.length} />
        <StatCard icon={Star} label="Leituras concluídas" value={completedLoans.length} />
      </div>

      {lastToken && (
        <div className="glass-panel interactive-panel hover-lift animate-card-enter rounded-[1.55rem] border border-primary/30 p-5 shadow-card sm:rounded-[1.6rem]">
          <p className="mb-1 text-xs text-muted-foreground">Último token gerado</p>
          <p className="break-all font-mono text-lg font-bold text-primary">{lastToken}</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            Apresente este código à biblioteca quando o empréstimo estiver aprovado.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel animate-card-enter rounded-[1.55rem] border border-border p-4 shadow-card sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl text-foreground">Avisos da biblioteca</h2>
            </div>
            <span className="w-fit rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              {activeNotices.length} aviso(s)
            </span>
          </div>

          <div className="stagger-list space-y-3">
            {activeNotices.map((notice) => (
              <div key={notice.id} className="interactive-panel rounded-[1.3rem] border border-border/70 bg-card/70 p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {noticeCategoryLabel[notice.categoria]}
                  </span>
                  {notice.destaque && (
                    <span className="rounded-full border border-warm-gold/25 bg-warm-gold/10 px-2.5 py-1 text-[11px] text-warm-gold">
                      Destaque
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{notice.titulo}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{notice.mensagem}</p>
              </div>
            ))}

            {activeNotices.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum aviso ativo no momento.</p>
            )}
          </div>
        </div>

        <div className="glass-panel animate-card-enter-delayed rounded-[1.55rem] border border-border p-4 shadow-card sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-rose-400" />
              <h2 className="font-display text-2xl text-foreground">Minha estante favorita</h2>
            </div>
            <button onClick={() => navigate('/aluno/favoritos')} className="w-fit text-xs text-primary hover:underline">
              Abrir favoritos
            </button>
          </div>

          {favoriteBooks.length === 0 ? (
            <div className="rounded-[1.3rem] border border-dashed border-border/70 bg-card/40 p-5 text-sm leading-7 text-muted-foreground">
              Você ainda não favoritou nenhum livro. Explore o catálogo e use o coração para montar sua estante.
            </div>
          ) : (
            <div className="stagger-grid grid grid-cols-1 gap-4 min-[470px]:grid-cols-2">
              {favoriteBooks.map((book) => (
                <BookCard key={book.id} book={book} compact onClick={() => navigate(`/aluno/catalogo/${book.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="glass-panel animate-card-enter rounded-[1.55rem] border border-border p-4 shadow-card sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl text-foreground">Histórico recente</h2>
            </div>
            <button onClick={() => navigate('/aluno/historico')} className="w-fit text-xs text-primary hover:underline">
              Ver histórico completo
            </button>
          </div>

          <div className="stagger-list space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="interactive-panel rounded-[1.25rem] border border-border/70 bg-card/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">{item.description}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.date}</p>
                  </div>
                  {item.status ? <StatusBadge status={item.status} /> : <MessageSquareQuote className="h-5 w-5 text-sky-400" />}
                </div>
              </div>
            ))}

            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">Seu histórico aparecerá aqui conforme você usar o sistema.</p>
            )}
          </div>
        </div>

        <div className="glass-panel animate-card-enter-delayed rounded-[1.55rem] border border-border p-4 shadow-card sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
            <h2 className="font-display text-2xl text-foreground">Destaques do acervo</h2>
            <button onClick={() => navigate('/aluno/catalogo')} className="w-fit text-xs text-primary hover:underline">
              Explorar catálogo
            </button>
          </div>
          <div className="stagger-grid grid grid-cols-1 gap-4 min-[470px]:grid-cols-2">
            {(favoriteBooks.length > 0 ? favoriteBooks : highlightedBooks).map((book) => (
              <BookCard key={book.id} book={book} compact onClick={() => navigate(`/aluno/catalogo/${book.id}`)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

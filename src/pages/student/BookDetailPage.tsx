import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookMarked, Check, Heart, MessageSquareQuote, ShieldAlert, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { getBookReviewAverage } from '@/lib/community';

// Detalhe de um livro com regra de permissão, favoritos, resenhas e solicitação de empréstimo.
const BookDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { books, favorites, getPermissionForBook, loans, requestLoan, reviews, saveReview, toggleFavorite, users } = useLibrary();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; token?: string } | null>(null);
  const [isRequestingLoan, setIsRequestingLoan] = useState(false);
  const [reviewRating, setReviewRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  const book = books.find((entry) => entry.id === id);
  const permission = user?.role === 'aluno' && book ? getPermissionForBook(user.id, book.id) : undefined;
  const isFavorite = !!user && !!book && favorites.some((favorite) => favorite.usuarioId === user.id && favorite.livroId === book.id);
  const bookReviews = useMemo(
    () =>
      reviews
        .filter((review) => review.livroId === id)
        .sort((left, right) => (right.atualizadoEm || right.criadoEm).localeCompare(left.atualizadoEm || left.criadoEm)),
    [id, reviews],
  );
  const myReview = bookReviews.find((review) => review.usuarioId === user?.id);
  const averageReview = getBookReviewAverage(bookReviews);
  const canReview = !!user && !!book && loans.some((loan) => loan.alunoId === user.id && loan.livroId === book.id && loan.status === 'devolvido');

  useEffect(() => {
    if (myReview) {
      setReviewRating(myReview.nota);
      setReviewText(myReview.comentario);
      return;
    }

    setReviewRating(5);
    setReviewText('');
  }, [myReview]);

  if (!book) {
    return <div className="py-16 text-center text-muted-foreground">Livro não encontrado.</div>;
  }

  const handleRequestLoan = async () => {
    if (!user || user.role !== 'aluno' || isRequestingLoan) {
      return;
    }

    setIsRequestingLoan(true);
    try {
      const result = await requestLoan(book.id, user.id);
      setFeedback({
        type: result.success ? 'success' : 'error',
        message: result.message,
        token: result.token,
      });
    } finally {
      setIsRequestingLoan(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      return;
    }

    const result = await toggleFavorite(book.id, user.id);
    setFeedback({
      type: result.success ? 'success' : 'error',
      message: result.message,
    });
  };

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    const result = await saveReview({
      livroId: book.id,
      usuarioId: user.id,
      nota: reviewRating,
      comentario: reviewText,
    });

    setReviewFeedback(result.message);
  };

  const availabilityLabel =
    book.quantidadeDisponivel === 1 ? '1 exemplar disponível' : `${book.quantidadeDisponivel} exemplares disponíveis`;

  return (
    <div className="max-w-5xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <img src={book.capa} alt={book.titulo} className="aspect-[3/4] w-full rounded-xl object-cover shadow-elevated" />

          <div className="glass-panel rounded-[1.6rem] p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Disponibilidade</p>
            <p className={`text-lg font-semibold ${book.quantidadeDisponivel > 0 ? 'text-primary' : 'text-destructive'}`}>
              {book.quantidadeDisponivel > 0 ? availabilityLabel : 'Indisponível'}
            </p>
          </div>

          <div className="glass-panel rounded-[1.6rem] p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Resenhas da comunidade</p>
            <p className="mt-2 font-display text-3xl text-foreground">
              {bookReviews.length > 0 ? averageReview.toFixed(1) : '—'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {bookReviews.length} resenha{bookReviews.length !== 1 ? 's' : ''} publicada{bookReviews.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass-panel rounded-[1.8rem] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{book.categoria}</span>
                <h1 className="mt-4 font-display text-4xl text-foreground">{book.titulo}</h1>
                <p className="mt-1 text-muted-foreground">{book.autor}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/85">
                  Tombo {book.numeroTombo}
                </p>
              </div>

              {user?.role === 'aluno' && (
                <button
                  type="button"
                  onClick={handleFavoriteToggle}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                    isFavorite
                      ? 'border-rose-400/35 bg-rose-500/15 text-rose-300'
                      : 'border-border/70 bg-card/70 text-foreground'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Favorito salvo' : 'Salvar nos favoritos'}
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-4 w-4 ${index < book.classificacao ? 'fill-warm-gold text-warm-gold' : 'text-muted'}`}
                />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">{book.classificacao}/5 no acervo</span>
            </div>

            <p className="mt-5 text-sm leading-8 text-foreground/80">{book.descricao}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Numero do tombo</p>
              <p className="text-sm font-medium text-foreground">{book.numeroTombo}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Faixa escolar</p>
              <p className="text-sm font-medium text-foreground">{book.faixaEscolar}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Prazo de leitura</p>
              <p className="text-sm font-medium text-foreground">{book.diasLeitura} dias</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Total de exemplares</p>
              <p className="text-sm font-medium text-foreground">{book.quantidade}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Exemplares livres</p>
              <p className="text-sm font-medium text-foreground">{book.quantidadeDisponivel}</p>
            </div>
          </div>

          {permission && (
            <div
              className={`rounded-xl border p-4 ${
                permission.permitido ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                {permission.permitido ? (
                  <ShieldCheck className="h-4 w-4 text-primary" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                )}
                <p className={`text-sm font-semibold ${permission.permitido ? 'text-primary' : 'text-destructive'}`}>
                  {permission.permitido ? 'Leitura liberada pela administração' : 'Leitura bloqueada para este aluno'}
                </p>
              </div>
              {permission.observacao && <p className="text-sm text-muted-foreground">{permission.observacao}</p>}
            </div>
          )}

          {user?.role === 'aluno' && (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                onClick={handleRequestLoan}
                disabled={isRequestingLoan || book.quantidadeDisponivel <= 0 || permission?.permitido === false}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BookMarked className="h-4 w-4" /> {isRequestingLoan ? 'Solicitando...' : 'Solicitar empréstimo'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/aluno/historico')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/70 bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground"
              >
                <MessageSquareQuote className="h-4 w-4" />
                Ver meu histórico
              </button>
            </div>
          )}

          {feedback && (
            <div
              className={`animate-fade-in rounded-xl border p-5 ${
                feedback.type === 'success' ? 'border-primary/30 bg-primary/10' : 'border-destructive/30 bg-destructive/10'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                )}
                <p className="text-sm font-semibold text-foreground">{feedback.message}</p>
              </div>
              {feedback.token && (
                <>
                  <p className="font-mono text-xl font-bold text-primary">{feedback.token}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Guarde este token e aguarde a aprovação da biblioteca.</p>
                </>
              )}
            </div>
          )}

          <div className="glass-panel rounded-[1.8rem] p-5">
            <div className="mb-4 flex items-center gap-3">
              <MessageSquareQuote className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-2xl text-foreground">Resenhas e opiniões</h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  Alunos podem registrar uma resenha depois de concluir a leitura e devolver o livro.
                </p>
              </div>
            </div>

            {user?.role === 'aluno' && (
              <form onSubmit={handleReviewSubmit} className="rounded-[1.4rem] border border-border/70 bg-card/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {myReview ? 'Atualizar sua resenha' : 'Publicar sua resenha'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {canReview
                        ? 'Compartilhe o que esta leitura provocou em você.'
                        : 'Sua resenha será liberada após a devolução do livro.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewRating(value as 1 | 2 | 3 | 4 | 5)}
                        disabled={!canReview}
                        className="rounded-full p-1 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Dar nota ${value}`}
                      >
                        <Star className={`h-5 w-5 ${value <= reviewRating ? 'fill-warm-gold text-warm-gold' : 'text-muted'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  disabled={!canReview}
                  rows={4}
                  className="mt-4 w-full resize-none rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground focus:border-warm-gold/50 focus:outline-none focus:ring-2 focus:ring-warm-gold/25 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Conte como foi a experiência de leitura, o que chamou atenção e por que você indicaria este livro."
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-6 text-muted-foreground">Mínimo recomendado: 16 caracteres.</p>
                  <button
                    type="submit"
                    disabled={!canReview}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MessageSquareQuote className="h-4 w-4" />
                    {myReview ? 'Atualizar resenha' : 'Publicar resenha'}
                  </button>
                </div>

                {reviewFeedback && <p className="mt-3 text-sm text-muted-foreground">{reviewFeedback}</p>}
              </form>
            )}

            <div className="mt-4 space-y-3">
              {bookReviews.length === 0 && (
                <div className="rounded-[1.3rem] border border-dashed border-border/70 bg-card/40 p-4 text-sm leading-7 text-muted-foreground">
                  Ainda não há resenhas publicadas para este livro.
                </div>
              )}

              {bookReviews.map((review) => {
                const reviewer = users.find((entry) => entry.id === review.usuarioId);
                return (
                  <div key={review.id} className="rounded-[1.3rem] border border-border/70 bg-card/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{reviewer?.nome || 'Aluno'}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {review.atualizadoEm ? `${review.atualizadoEm} • atualizado` : review.criadoEm}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${index < review.nota ? 'fill-warm-gold text-warm-gold' : 'text-muted'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{review.comentario}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;

import React from 'react';
import { Heart, MessageSquareQuote, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { cn } from '@/lib/utils';
import { Book } from '@/types';

interface BookCardProps {
  book: Book;
  onClick?: () => void;
  compact?: boolean;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick, compact }) => {
  const { user } = useAuth();
  const { favorites, reviews, toggleFavorite } = useLibrary();
  const available = book.quantidadeDisponivel > 0;
  const isStudent = user?.role === 'aluno';
  const isFavorite = !!user && favorites.some((favorite) => favorite.usuarioId === user.id && favorite.livroId === book.id);
  const reviewCount = reviews.filter((review) => review.livroId === book.id).length;

  const handleFavoriteClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!user) {
      return;
    }

    await toggleFavorite(book.id, user.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
      aria-label={onClick ? `Abrir detalhes do livro ${book.titulo}` : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'glass-panel interactive-panel hover-lift group w-full overflow-hidden rounded-[1.45rem] text-left shadow-card animate-card-enter sm:rounded-[1.6rem]',
        onClick ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-gold/35' : '',
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-t-[1.45rem] sm:aspect-[3/4] sm:rounded-t-[1.6rem]">
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-warm-black/35 via-transparent to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 translate-y-3 rounded-[1rem] border border-white/10 bg-warm-black/72 px-3 py-2 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-cream">
            <span>{book.categoria}</span>
            <span>
              {book.quantidadeDisponivel}/{book.quantidade} disponíveis
            </span>
            <span>{book.diasLeitura} dias</span>
          </div>
        </div>

        {isStudent && (
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? `Remover ${book.titulo} dos favoritos` : `Salvar ${book.titulo} nos favoritos`}
            title={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
            className={cn(
              'absolute left-2.5 top-2.5 z-30 flex h-10 w-10 items-center justify-center rounded-2xl border backdrop-blur-md transition-all duration-300 sm:left-3 sm:top-3',
              isFavorite
                ? 'border-rose-400/40 bg-rose-500/20 text-rose-100'
                : 'border-white/10 bg-warm-black/55 text-cream hover:border-warm-gold/35 hover:text-warm-gold-light',
            )}
          >
            <Heart className={cn('h-4 w-4', isFavorite ? 'fill-current' : '')} />
          </button>
        )}

        <img
          src={book.capa}
          alt={book.titulo}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3">
          <span
            className={`animate-float-gentle rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.06em] sm:text-xs ${
              available ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'
            }`}
          >
            {available ? 'Disponível' : 'Indisponível'}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-3.5 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/90">
            Tombo {book.numeroTombo}
          </p>
          <h3 className="line-clamp-2 font-display text-lg leading-[1.08] text-foreground transition-transform duration-300 group-hover:translate-x-0.5 sm:text-[1.28rem]">
            {book.titulo}
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{book.autor}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:hidden">
          <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1.5">
            {book.quantidadeDisponivel}/{book.quantidade} disponíveis
          </span>
          <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1.5">
            {book.diasLeitura} dias
          </span>
        </div>

        {!compact && (
          <>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-3 w-3 ${index < book.classificacao ? 'fill-warm-gold text-warm-gold' : 'text-muted'}`}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground/78">{book.categoria}</span>
              <span className="text-xs font-medium text-muted-foreground sm:text-[13px]">{book.faixaEscolar}</span>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-[13px]">
          <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1.5 font-medium">
            {available ? 'Pronto para empréstimo' : 'Fila de espera'}
          </span>
          {reviewCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 font-medium">
              <MessageSquareQuote className="h-3 w-3" />
              {reviewCount} resenha{reviewCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;

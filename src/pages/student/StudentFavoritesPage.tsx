import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import BookCard from '@/components/shared/BookCard';
import EmptyState from '@/components/shared/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { Book } from '@/types';

// Estante pessoal do aluno com os livros salvos para leitura futura.
const StudentFavoritesPage: React.FC = () => {
  const { user } = useAuth();
  const { books, favorites } = useLibrary();
  const navigate = useNavigate();

  const myFavoriteEntries = favorites
    .filter((favorite) => favorite.usuarioId === user?.id)
    .sort((left, right) => right.criadoEm.localeCompare(left.criadoEm));

  const favoriteBooks = myFavoriteEntries
    .map((favorite) => books.find((book) => book.id === favorite.livroId))
    .filter((book): book is Book => Boolean(book));

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
        <p className="section-kicker">Minha estante pessoal</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Favoritos</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          Guarde aqui os livros que chamaram sua atenção e monte uma lista de próximas leituras.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            {favoriteBooks.length} livro(s) salvo(s)
          </span>
          <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            Toque no coração para remover ou reorganizar sua estante
          </span>
        </div>
      </div>

      {favoriteBooks.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Sua estante ainda está vazia"
          description="Quando um livro chamar sua atenção no catálogo, toque no coração para guardar e voltar depois."
          action={{ label: 'Explorar catálogo', onClick: () => navigate('/aluno/catalogo') }}
        />
      ) : (
        <>
          <div className="glass-panel rounded-[1.45rem] p-4 shadow-card sm:rounded-[1.7rem] sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Curadoria pessoal pronta</p>
                <p className="text-sm leading-7 text-muted-foreground">
                  Esses títulos ficam separados para você decidir a próxima leitura com mais calma.
                </p>
              </div>
            </div>
          </div>

          <div className="stagger-grid grid grid-cols-1 gap-4 min-[470px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {favoriteBooks.map((book) => (
              <BookCard key={book.id} book={book} onClick={() => navigate(`/aluno/catalogo/${book.id}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentFavoritesPage;

import React, { useMemo, useState } from 'react';
import { ListFilter, RotateCcw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BookCard from '@/components/shared/BookCard';
import EmptyState from '@/components/shared/EmptyState';
import { useLibrary } from '@/contexts/LibraryContext';
import { getBookReviewAverage } from '@/lib/community';

interface CatalogPageProps {
  basePath: string;
}

type AvailabilityFilter = 'todos' | 'disponiveis' | 'indisponiveis';
type SortOption = 'titulo' | 'autor' | 'avaliados' | 'disponibilidade';

const CatalogPage: React.FC<CatalogPageProps> = ({ basePath }) => {
  const { books, reviews } = useLibrary();
  const navigate = useNavigate();

  const [searchTitle, setSearchTitle] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchTombo, setSearchTombo] = useState('');
  const [category, setCategory] = useState('todas');
  const [availability, setAvailability] = useState<AvailabilityFilter>('todos');
  const [schoolRange, setSchoolRange] = useState('todas');
  const [classification, setClassification] = useState('todas');
  const [sortBy, setSortBy] = useState<SortOption>('titulo');

  const categories = useMemo(() => ['todas', ...new Set(books.map((book) => book.categoria))], [books]);
  const schoolRanges = useMemo(() => ['todas', ...new Set(books.map((book) => book.faixaEscolar))], [books]);

  const reviewAverageMap = useMemo(() => {
    const map = new Map<string, number>();

    books.forEach((book) => {
      const currentReviews = reviews.filter((review) => review.livroId === book.id);
      map.set(book.id, currentReviews.length ? getBookReviewAverage(currentReviews) : book.classificacao);
    });

    return map;
  }, [books, reviews]);

  const filteredBooks = useMemo(() => {
    const normalizedTitle = searchTitle.trim().toLowerCase();
    const normalizedAuthor = searchAuthor.trim().toLowerCase();
    const normalizedTombo = searchTombo.trim().toLowerCase();

    const filtered = books.filter((book) => {
      if (normalizedTitle && !book.titulo.toLowerCase().includes(normalizedTitle)) {
        return false;
      }

      if (normalizedAuthor && !book.autor.toLowerCase().includes(normalizedAuthor)) {
        return false;
      }

      if (normalizedTombo && !book.numeroTombo.toLowerCase().includes(normalizedTombo)) {
        return false;
      }

      if (category !== 'todas' && book.categoria !== category) {
        return false;
      }

      if (schoolRange !== 'todas' && book.faixaEscolar !== schoolRange) {
        return false;
      }

      if (availability === 'disponiveis' && book.quantidadeDisponivel <= 0) {
        return false;
      }

      if (availability === 'indisponiveis' && book.quantidadeDisponivel > 0) {
        return false;
      }

      if (classification !== 'todas' && book.classificacao < Number(classification)) {
        return false;
      }

      return true;
    });

    return filtered.sort((left, right) => {
      if (sortBy === 'autor') {
        return left.autor.localeCompare(right.autor) || left.titulo.localeCompare(right.titulo);
      }

      if (sortBy === 'avaliados') {
        return (reviewAverageMap.get(right.id) ?? 0) - (reviewAverageMap.get(left.id) ?? 0);
      }

      if (sortBy === 'disponibilidade') {
        return right.quantidadeDisponivel - left.quantidadeDisponivel || left.titulo.localeCompare(right.titulo);
      }

      return left.titulo.localeCompare(right.titulo);
    });
  }, [
    availability,
    books,
    category,
    classification,
    reviewAverageMap,
    schoolRange,
    searchAuthor,
    searchTitle,
    searchTombo,
    sortBy,
  ]);

  const resetFilters = () => {
    setSearchTitle('');
    setSearchAuthor('');
    setSearchTombo('');
    setCategory('todas');
    setAvailability('todos');
    setSchoolRange('todas');
    setClassification('todas');
    setSortBy('titulo');
  };

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.9rem] sm:p-6 xl:max-w-3xl">
          <p className="section-kicker">Acervo central</p>
          <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">Catálogo com filtros inteligentes</h1>
          <p className="reading-copy mt-2">
            Busque por título, autor e tombo. Filtre por categoria, disponibilidade, faixa escolar e classificação com
            leitura mais confortável em qualquer tela.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="info-pill">{filteredBooks.length} resultado(s)</span>
            <span className="info-pill">{categories.length - 1} categoria(s)</span>
            <span className="info-pill">{schoolRanges.length - 1} faixa(s)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:min-w-[20rem]">
          <div className="glass-panel rounded-[1.25rem] px-4 py-4">
            <span className="text-sm font-medium text-muted-foreground">Livros no acervo</span>
            <p className="mt-2 text-lg font-semibold text-foreground">{books.length}</p>
          </div>
          <div className="glass-panel rounded-[1.25rem] px-4 py-4">
            <span className="text-sm font-medium text-muted-foreground">Disponíveis agora</span>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {books.filter((book) => book.quantidadeDisponivel > 0).length}
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[1.55rem] p-4 shadow-card sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-primary" />
            <p className="text-base font-semibold text-foreground">Filtrar e ordenar o acervo</p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="field-label">Título</label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchTitle}
                onChange={(event) => setSearchTitle(event.target.value)}
                placeholder="Buscar título"
                className="field-input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Autor</label>
            <input
              type="text"
              value={searchAuthor}
              onChange={(event) => setSearchAuthor(event.target.value)}
              placeholder="Buscar autor"
              className="field-input mt-2"
            />
          </div>

          <div>
            <label className="field-label">Tombo</label>
            <input
              type="text"
              value={searchTombo}
              onChange={(event) => setSearchTombo(event.target.value)}
              placeholder="Buscar tombo"
              className="field-input mt-2"
            />
          </div>

          <div>
            <label className="field-label">Categoria</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="field-input mt-2">
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === 'todas' ? 'Todas' : item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Disponibilidade</label>
            <select
              value={availability}
              onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
              className="field-input mt-2"
            >
              <option value="todos">Todos</option>
              <option value="disponiveis">Somente disponíveis</option>
              <option value="indisponiveis">Somente indisponíveis</option>
            </select>
          </div>

          <div>
            <label className="field-label">Faixa escolar</label>
            <select
              value={schoolRange}
              onChange={(event) => setSchoolRange(event.target.value)}
              className="field-input mt-2"
            >
              {schoolRanges.map((item) => (
                <option key={item} value={item}>
                  {item === 'todas' ? 'Todas' : item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Classificação</label>
            <select
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
              className="field-input mt-2"
            >
              <option value="todas">Todas</option>
              <option value="5">5 estrelas</option>
              <option value="4">4 estrelas ou mais</option>
              <option value="3">3 estrelas ou mais</option>
              <option value="2">2 estrelas ou mais</option>
              <option value="1">1 estrela ou mais</option>
            </select>
          </div>

          <div>
            <label className="field-label">Ordenação</label>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="field-input mt-2"
            >
              <option value="titulo">Título</option>
              <option value="autor">Autor</option>
              <option value="avaliados">Mais bem avaliados</option>
              <option value="disponibilidade">Mais disponíveis</option>
            </select>
          </div>
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum livro encontrado"
          description="Ajuste os filtros para descobrir outros títulos do acervo escolar."
        />
      ) : (
        <div className="stagger-grid grid grid-cols-1 gap-4 min-[470px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} onClick={() => navigate(`${basePath}/${book.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogPage;

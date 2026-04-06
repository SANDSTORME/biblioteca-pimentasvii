import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import FileUploadField from '@/components/shared/FileUploadField';
import { useLibrary } from '@/contexts/LibraryContext';
import { Book } from '@/types';
import { UploadedAsset, uploadBookCoverRequest } from '@/services/api';

type BookFormState = {
  numeroTombo: string;
  titulo: string;
  autor: string;
  categoria: string;
  quantidade: string;
  classificacao: string;
  faixaEscolar: string;
  diasLeitura: string;
  descricao: string;
  coverMode: 'upload' | 'url';
  coverUrl: string;
  coverAsset: UploadedAsset | null;
};

const emptyForm: BookFormState = {
  numeroTombo: '',
  titulo: '',
  autor: '',
  categoria: '',
  quantidade: '1',
  classificacao: '4',
  faixaEscolar: '',
  diasLeitura: '14',
  descricao: '',
  coverMode: 'upload',
  coverUrl: '',
  coverAsset: null,
};

const toForm = (book: Book): BookFormState => ({
  numeroTombo: book.numeroTombo,
  titulo: book.titulo,
  autor: book.autor,
  categoria: book.categoria,
  quantidade: String(book.quantidade),
  classificacao: String(book.classificacao),
  faixaEscolar: book.faixaEscolar,
  diasLeitura: String(book.diasLeitura),
  descricao: book.descricao,
  coverMode: book.capaTipo === 'upload' || book.capa.startsWith('/api/assets/') ? 'upload' : 'url',
  coverUrl: book.capaTipo === 'upload' || book.capa.startsWith('/api/assets/') ? '' : book.capa,
  coverAsset:
    book.capaTipo === 'upload' || book.capa.startsWith('/api/assets/')
      ? {
          arquivoNome: book.capaArquivoNome || 'capa enviada',
          arquivoMime: 'image/*',
          arquivoTamanho: 0,
          caminhoPublico: book.capa,
        }
      : null,
});

const AdminBooksPage: React.FC = () => {
  const { books, createBook, deleteBook, updateBook } = useLibrary();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<BookFormState>(emptyForm);

  const orderedBooks = useMemo(
    () => [...books].sort((left, right) => left.titulo.localeCompare(right.titulo)),
    [books],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const capa = form.coverMode === 'upload' ? form.coverAsset?.caminhoPublico || '' : form.coverUrl.trim();
    if (!capa) {
      setFeedback(
        form.coverMode === 'upload'
          ? 'Envie uma imagem de capa antes de salvar o livro.'
          : 'Informe uma URL válida para a capa.',
      );
      return;
    }

    const payload = {
      numeroTombo: form.numeroTombo,
      titulo: form.titulo,
      autor: form.autor,
      categoria: form.categoria,
      quantidade: Number(form.quantidade),
      classificacao: Number(form.classificacao),
      faixaEscolar: form.faixaEscolar,
      diasLeitura: Number(form.diasLeitura),
      descricao: form.descricao,
      capa,
      capaTipo: form.coverMode,
      capaArquivoNome: form.coverAsset?.arquivoNome,
    };

    const result = editingId ? await updateBook(editingId, payload) : await createBook(payload);
    setFeedback(result.message);

    if (result.success) {
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    }
  };

  const handleEdit = (book: Book) => {
    setEditingId(book.id);
    setForm(toForm(book));
    setShowForm(true);
  };

  const handleDelete = async (bookId: string) => {
    const result = await deleteBook(bookId);
    setFeedback(result.message);
  };

  const handleUploadCover = async (file: File) => {
    const result = await uploadBookCoverRequest(file);
    setForm((current) => ({
      ...current,
      coverMode: 'upload',
      coverAsset: result.asset,
      coverUrl: '',
    }));
    setFeedback(result.message);
    return result.asset;
  };

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="glass-panel panel-sheen flex-1 rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
          <p className="section-kicker">Gestão do acervo</p>
          <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Livros e capas do catálogo</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Cadastre, edite e organize o acervo com upload real de capa, fallback por URL e controle visual mais forte
            para uso administrativo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((current) => !current);
            setEditingId(null);
            setForm(emptyForm);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card"
        >
          <Plus className="h-4 w-4" />
          Novo livro
        </button>
      </div>

      {feedback && <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 p-4 text-sm text-foreground">{feedback}</div>}

      {showForm && (
        <div className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-3xl text-foreground">
              {editingId ? 'Atualizar dados do livro' : 'Cadastrar novo livro'}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              O upload de capa é o fluxo principal. Se necessário, você também pode manter uma URL externa.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">Número do tombo</label>
                <input
                  type="text"
                  value={form.numeroTombo}
                  onChange={(event) => setForm((current) => ({ ...current, numeroTombo: event.target.value }))}
                  required
                  className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Título</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                  required
                  className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Autor</label>
                <input
                  type="text"
                  value={form.autor}
                  onChange={(event) => setForm((current) => ({ ...current, autor: event.target.value }))}
                  required
                  className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Categoria</label>
                <input
                  type="text"
                  value={form.categoria}
                  onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}
                  required
                  className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Faixa escolar</label>
                <input
                  type="text"
                  value={form.faixaEscolar}
                  onChange={(event) => setForm((current) => ({ ...current, faixaEscolar: event.target.value }))}
                  required
                  className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Quantidade</label>
                  <input
                    type="number"
                    value={form.quantidade}
                    onChange={(event) => setForm((current) => ({ ...current, quantidade: event.target.value }))}
                    required
                    min={1}
                    className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Classificação</label>
                  <input
                    type="number"
                    value={form.classificacao}
                    onChange={(event) => setForm((current) => ({ ...current, classificacao: event.target.value }))}
                    required
                    min={1}
                    max={5}
                    className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Dias de leitura</label>
                  <input
                    type="number"
                    value={form.diasLeitura}
                    onChange={(event) => setForm((current) => ({ ...current, diasLeitura: event.target.value }))}
                    required
                    min={1}
                    className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <textarea
                rows={4}
                value={form.descricao}
                onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
              />
            </div>

            <div className="rounded-[1.5rem] border border-border/70 bg-card/70 p-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, coverMode: 'upload' }))}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    form.coverMode === 'upload'
                      ? 'bg-gradient-gold text-primary-foreground'
                      : 'border border-border/70 bg-background/70 text-foreground'
                  }`}
                >
                  Upload de capa
                </button>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, coverMode: 'url' }))}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    form.coverMode === 'url'
                      ? 'bg-gradient-gold text-primary-foreground'
                      : 'border border-border/70 bg-background/70 text-foreground'
                  }`}
                >
                  Usar URL
                </button>
              </div>

              <div className="mt-4">
                {form.coverMode === 'upload' ? (
                  <FileUploadField
                    label="Upload principal da capa"
                    description="Envie JPG, PNG, WEBP ou GIF. O backend valida tipo e tamanho antes de liberar a imagem para o catálogo."
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    asset={form.coverAsset}
                    onUpload={handleUploadCover}
                    preview={
                      form.coverAsset ? (
                        <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/70">
                          <img
                            src={form.coverAsset.caminhoPublico}
                            alt="Prévia da capa enviada"
                            className="aspect-[4/5] h-full w-full object-cover"
                          />
                        </div>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                    <div>
                      <label className="text-sm font-medium text-foreground">URL da capa</label>
                      <input
                        type="url"
                        value={form.coverUrl}
                        onChange={(event) => setForm((current) => ({ ...current, coverUrl: event.target.value }))}
                        placeholder="https://..."
                        className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                      />
                    </div>
                    <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/70">
                      {form.coverUrl ? (
                        <img src={form.coverUrl} alt="Prévia da capa por URL" className="aspect-[4/5] h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                          A prévia da capa aparecerá aqui.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card"
              >
                {editingId ? 'Salvar alterações' : 'Cadastrar livro'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="rounded-2xl border border-border/70 bg-card/70 px-5 py-3 text-sm font-medium text-foreground"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="stagger-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {orderedBooks.map((book) => (
          <article key={book.id} className="glass-panel overflow-hidden rounded-[1.65rem] shadow-card">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={book.capa} alt={book.titulo} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Tombo {book.numeroTombo}</p>
                  <h2 className="mt-2 font-display text-3xl text-foreground">{book.titulo}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{book.autor}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    book.quantidadeDisponivel > 0
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-destructive text-destructive-foreground'
                  }`}
                >
                  {book.quantidadeDisponivel > 0 ? 'Disponível' : 'Indisponível'}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-4 w-4 ${
                      index < book.classificacao ? 'fill-warm-gold text-warm-gold' : 'text-muted'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-4 grid gap-3 rounded-[1.25rem] border border-border/70 bg-background/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Categoria</span>
                  <span className="font-medium text-foreground">{book.categoria}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Faixa escolar</span>
                  <span className="font-medium text-foreground">{book.faixaEscolar}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Estoque</span>
                  <span className="font-medium text-foreground">
                    {book.quantidadeDisponivel}/{book.quantidade}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(book)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm font-medium text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(book.id)}
                  className="inline-flex items-center justify-center rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default AdminBooksPage;

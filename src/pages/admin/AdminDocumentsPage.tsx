import React, { useMemo, useState } from 'react';
import { FilePenLine, Plus, Trash2 } from 'lucide-react';
import FileUploadField from '@/components/shared/FileUploadField';
import { useLibrary } from '@/contexts/LibraryContext';
import { documentAudienceLabel, documentCategoryLabel, formatBytes } from '@/lib/documents';
import { UploadedAsset, uploadDocumentRequest } from '@/services/api';
import { LibraryDocument } from '@/types';

type DocumentFormState = {
  titulo: string;
  descricao: string;
  categoria: LibraryDocument['categoria'];
  publico: LibraryDocument['publico'];
  ativo: boolean;
  destaque: boolean;
  asset: UploadedAsset | null;
};

const emptyForm: DocumentFormState = {
  titulo: '',
  descricao: '',
  categoria: 'regulamento',
  publico: 'todos',
  ativo: true,
  destaque: false,
  asset: null,
};

const toForm = (document: LibraryDocument): DocumentFormState => ({
  titulo: document.titulo,
  descricao: document.descricao,
  categoria: document.categoria,
  publico: document.publico,
  ativo: document.ativo,
  destaque: document.destaque,
  asset: {
    arquivoNome: document.arquivoNome,
    arquivoMime: document.arquivoMime,
    arquivoTamanho: document.arquivoTamanho,
    caminhoPublico: document.arquivoUrl,
  },
});

const AdminDocumentsPage: React.FC = () => {
  const { createDocument, deleteDocument, documents, updateDocument } = useLibrary();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<DocumentFormState>(emptyForm);

  const orderedDocuments = useMemo(
    () =>
      [...documents].sort((left, right) => {
        if (left.destaque !== right.destaque) {
          return Number(right.destaque) - Number(left.destaque);
        }
        return right.atualizadoEm.localeCompare(left.atualizadoEm);
      }),
    [documents],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.asset) {
      setFeedback('Envie um arquivo antes de salvar o documento.');
      return;
    }

    const payload = {
      titulo: form.titulo,
      descricao: form.descricao,
      categoria: form.categoria,
      publico: form.publico,
      ativo: form.ativo,
      destaque: form.destaque,
      arquivoUrl: form.asset.caminhoPublico,
      arquivoNome: form.asset.arquivoNome,
      arquivoMime: form.asset.arquivoMime,
      arquivoTamanho: form.asset.arquivoTamanho,
    };

    const result = editingId ? await updateDocument(editingId, payload) : await createDocument(payload);
    setFeedback(result.message);

    if (result.success) {
      setEditingId(null);
      setShowForm(false);
      setForm(emptyForm);
    }
  };

  const handleEdit = (document: LibraryDocument) => {
    setEditingId(document.id);
    setForm(toForm(document));
    setShowForm(true);
  };

  const handleDelete = async (documentId: string) => {
    const result = await deleteDocument(documentId);
    setFeedback(result.message);
  };

  const handleAssetUpload = async (file: File) => {
    const result = await uploadDocumentRequest(file);
    setForm((current) => ({ ...current, asset: result.asset }));
    setFeedback(result.message);
    return result.asset;
  };

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="glass-panel panel-sheen flex-1 rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
          <p className="section-kicker">Arquivos da biblioteca</p>
          <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Documentos e materiais</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Organize regulamentos, listas de leitura, orientações e comunicados com upload real, visibilidade por
            público e apresentação mais profissional.
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
          Novo documento
        </button>
      </div>

      {feedback && <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 p-4 text-sm text-foreground">{feedback}</div>}

      {showForm && (
        <div className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:p-6">
          <h2 className="font-display text-3xl text-foreground">
            {editingId ? 'Atualizar documento' : 'Publicar novo documento'}
          </h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">Título</label>
                <input
                  value={form.titulo}
                  onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                  required
                  className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Categoria</label>
                <select
                  value={form.categoria}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, categoria: event.target.value as LibraryDocument['categoria'] }))
                  }
                  className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                >
                  {Object.entries(documentCategoryLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Público</label>
                <select
                  value={form.publico}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, publico: event.target.value as LibraryDocument['publico'] }))
                  }
                  className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
                >
                  {Object.entries(documentAudienceLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
                  />
                  Documento ativo
                </label>
                <label className="inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.destaque}
                    onChange={(event) => setForm((current) => ({ ...current, destaque: event.target.checked }))}
                  />
                  Colocar em destaque
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                required
                rows={4}
                className="mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground"
              />
            </div>

            <FileUploadField
              label="Arquivo do documento"
              description="Envie PDF ou arquivo pedagógico para que a biblioteca possa disponibilizar download e consulta."
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf"
              asset={form.asset}
              onUpload={handleAssetUpload}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card"
              >
                <FilePenLine className="h-4 w-4" />
                {editingId ? 'Salvar documento' : 'Publicar documento'}
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

      <div className="stagger-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orderedDocuments.map((document) => (
          <article key={document.id} className="glass-panel rounded-[1.55rem] p-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {documentCategoryLabel[document.categoria]}
                  </span>
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {documentAudienceLabel[document.publico]}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-3xl text-foreground">{document.titulo}</h2>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                  document.ativo ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {document.ativo ? 'Ativo' : 'Oculto'}
              </span>
            </div>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">{document.descricao}</p>

            <div className="mt-4 grid gap-3 rounded-[1.2rem] border border-border/70 bg-background/70 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Arquivo</span>
                <span className="font-medium text-foreground">{document.arquivoNome}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Tamanho</span>
                <span className="font-medium text-foreground">{formatBytes(document.arquivoTamanho)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Atualizado</span>
                <span className="font-medium text-foreground">{document.atualizadoEm}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a
                href={document.arquivoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card"
              >
                Abrir arquivo
              </a>
              <button
                type="button"
                onClick={() => handleEdit(document)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm font-medium text-foreground"
              >
                <FilePenLine className="h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(document.id)}
                className="inline-flex items-center justify-center rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default AdminDocumentsPage;

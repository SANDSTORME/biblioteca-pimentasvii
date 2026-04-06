import React, { useMemo } from 'react';
import { Download, FileStack, Star } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { documentAudienceLabel, documentCategoryLabel, formatBytes } from '@/lib/documents';

interface DocumentsPageProps {
  publicView?: boolean;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ publicView = false }) => {
  const { user } = useAuth();
  const { documents } = useLibrary();

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

  const audienceLabel = publicView
    ? 'materiais públicos e documentos escolares'
    : user?.role === 'professor'
      ? 'materiais liberados para professores e toda a escola'
      : user?.role === 'aluno'
        ? 'materiais liberados para alunos e toda a escola'
        : 'documentos disponíveis';

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
        <p className="section-kicker">Central de documentos</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Biblioteca em arquivo vivo</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Regulamentos, listas de leitura, orientações e materiais pedagógicos organizados em um espaço claro, bonito
          e pronto para acesso escolar real.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            {orderedDocuments.length} documento(s)
          </span>
          <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            {audienceLabel}
          </span>
        </div>
      </div>

      {orderedDocuments.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="Nenhum documento disponível"
          description="Assim que a biblioteca publicar arquivos, eles aparecerão aqui com acesso rápido para consulta e download."
        />
      ) : (
        <div className="stagger-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedDocuments.map((document) => (
            <article
              key={document.id}
              className="glass-panel interactive-panel hover-lift rounded-[1.55rem] p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                  <FileStack className="h-5 w-5" />
                </div>
                {document.destaque && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-warm-gold/25 bg-warm-gold/10 px-3 py-1 text-[11px] font-medium text-warm-gold">
                    <Star className="h-3 w-3 fill-current" />
                    Destaque
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {documentCategoryLabel[document.categoria]}
                </span>
                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {documentAudienceLabel[document.publico]}
                </span>
              </div>

              <h2 className="mt-4 font-display text-3xl text-foreground">{document.titulo}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{document.descricao}</p>

              <div className="mt-4 grid gap-3 rounded-[1.25rem] border border-border/70 bg-background/70 p-4 text-sm">
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

              <a
                href={document.arquivoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card"
              >
                <Download className="h-4 w-4" />
                Baixar documento
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;

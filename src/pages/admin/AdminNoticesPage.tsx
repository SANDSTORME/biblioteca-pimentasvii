import React, { useMemo, useState } from 'react';
import { Megaphone, Pin, Plus, Radio, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { noticeAudienceLabel, noticeCategoryLabel } from '@/lib/community';
import { LibraryNotice } from '@/types';

const inputClassName =
  'mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/80 focus:border-warm-gold/50 focus:outline-none focus:ring-2 focus:ring-warm-gold/25';

// Painel administrativo para publicar avisos e destacar comunicados para a escola.
const AdminNoticesPage: React.FC = () => {
  const { user } = useAuth();
  const { createNotice, notices, toggleNoticeHighlight, toggleNoticeStatus } = useLibrary();
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [categoria, setCategoria] = useState<LibraryNotice['categoria']>('comunicado');
  const [publico, setPublico] = useState<LibraryNotice['publico']>('todos');
  const [destaque, setDestaque] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const orderedNotices = useMemo(
    () =>
      [...notices].sort((left, right) => {
        if (left.ativo !== right.ativo) {
          return Number(right.ativo) - Number(left.ativo);
        }
        if (left.destaque !== right.destaque) {
          return Number(right.destaque) - Number(left.destaque);
        }
        return right.criadoEm.localeCompare(left.criadoEm);
      }),
    [notices],
  );

  const activeCount = notices.filter((notice) => notice.ativo).length;
  const highlightedCount = notices.filter((notice) => notice.ativo && notice.destaque).length;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await createNotice({
      titulo,
      mensagem,
      categoria,
      publico,
      destaque,
      criadoPorId: user?.id,
    });

    setFeedback(result.message);
    if (result.success) {
      setTitulo('');
      setMensagem('');
      setCategoria('comunicado');
      setPublico('todos');
      setDestaque(true);
    }
  };

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
        <p className="section-kicker">Comunicação institucional</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Avisos da biblioteca</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          Publique comunicados, eventos e lembretes para manter toda a escola alinhada com a rotina da biblioteca.
        </p>
      </div>

      <div className="stagger-grid grid grid-cols-2 gap-4 xl:grid-cols-3">
        <div className="glass-panel rounded-[1.45rem] p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Avisos ativos</p>
          <p className="mt-3 font-display text-4xl text-foreground">{activeCount}</p>
        </div>
        <div className="glass-panel rounded-[1.45rem] p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Em destaque</p>
          <p className="mt-3 font-display text-4xl text-foreground">{highlightedCount}</p>
        </div>
        <div className="glass-panel rounded-[1.45rem] p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Canal de uso</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Os avisos aparecem no painel dos usuários e também no modo apresentação.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-foreground">Publicar novo aviso</h2>
              <p className="text-sm leading-7 text-muted-foreground">
                Monte comunicados claros para alunos, professores ou toda a escola.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Título</label>
              <input value={titulo} onChange={(event) => setTitulo(event.target.value)} required className={inputClassName} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">Categoria</label>
                <select value={categoria} onChange={(event) => setCategoria(event.target.value as LibraryNotice['categoria'])} className={inputClassName}>
                  {Object.entries(noticeCategoryLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Público</label>
                <select value={publico} onChange={(event) => setPublico(event.target.value as LibraryNotice['publico'])} className={inputClassName}>
                  {Object.entries(noticeAudienceLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Mensagem</label>
              <textarea
                value={mensagem}
                onChange={(event) => setMensagem(event.target.value)}
                required
                rows={5}
                className={`${inputClassName} resize-none`}
                placeholder="Explique o recado de forma clara e direta."
              />
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-foreground">
              <input type="checkbox" checked={destaque} onChange={(event) => setDestaque(event.target.checked)} />
              Destacar este aviso no topo das telas principais
            </label>

            {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}

            <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card">
              <Megaphone className="h-4 w-4" />
              Publicar aviso
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-foreground">Avisos publicados</h2>
              <p className="text-sm leading-7 text-muted-foreground">Controle o que está ativo e o que merece destaque visual.</p>
            </div>
            <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              {orderedNotices.length} registro(s)
            </span>
          </div>

          <div className="stagger-list space-y-3">
            {orderedNotices.map((notice) => (
              <div key={notice.id} className="interactive-panel rounded-[1.35rem] border border-border/70 bg-card/70 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                        {noticeCategoryLabel[notice.categoria]}
                      </span>
                      <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                        {noticeAudienceLabel[notice.publico]}
                      </span>
                      {notice.destaque && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warm-gold/25 bg-warm-gold/10 px-2.5 py-1 text-[11px] text-warm-gold">
                          <Sparkles className="h-3 w-3" />
                          Destaque
                        </span>
                      )}
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${notice.ativo ? 'border-primary/25 bg-primary/10 text-primary' : 'border-border/70 bg-background/70 text-muted-foreground'}`}>
                        {notice.ativo ? 'Ativo' : 'Oculto'}
                      </span>
                    </div>

                    <p className="mt-3 text-base font-semibold text-foreground">{notice.titulo}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{notice.mensagem}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{notice.criadoEm}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await toggleNoticeStatus(notice.id);
                        setFeedback(result.message);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-2 text-xs font-medium text-foreground"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      {notice.ativo ? 'Ocultar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await toggleNoticeHighlight(notice.id);
                        setFeedback(result.message);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-2 text-xs font-medium text-foreground"
                    >
                      <Pin className="h-3.5 w-3.5" />
                      {notice.destaque ? 'Tirar destaque' : 'Destacar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNoticesPage;

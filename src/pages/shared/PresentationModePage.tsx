import React from 'react';
import { ArrowLeft, BookMarked, BookOpen, Heart, Megaphone, MessageSquareQuote, Monitor } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '@/components/shared/BrandLogo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import usePublicSiteData from '@/hooks/usePublicSiteData';
import { noticeAudienceLabel, noticeCategoryLabel } from '@/lib/community';

const PresentationModePage: React.FC = () => {
  const { user } = useAuth();
  const { data: publicData } = usePublicSiteData();
  const navigate = useNavigate();

  const activeNotices = publicData.activeNotices;
  const noticesToShow = (publicData.highlightedNotices.length > 0
    ? publicData.highlightedNotices
    : activeNotices.slice(0, 3));
  const topBooks = publicData.topBooks.slice(0, 3);
  const hasPresentationData =
    publicData.overview.totalBooks > 0 ||
    publicData.overview.totalUsers > 0 ||
    publicData.totalReviews > 0 ||
    publicData.totalFavorites > 0 ||
    publicData.overview.suggestionsCount > 0 ||
    publicData.completedLoans > 0 ||
    publicData.pendingLoans > 0 ||
    activeNotices.length > 0;

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="glass-panel panel-sheen rounded-[1.7rem] p-5 sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start justify-between gap-3">
              <BrandLogo tone="default" showSubtitle />
            </div>

            <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-center">
              <ThemeToggle className="w-full min-[460px]:w-auto" />
              <button
                onClick={() => navigate(user ? (user.role === 'admin' ? '/admin' : user.role === 'professor' ? '/professor' : '/aluno') : '/')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-5 py-3 text-sm font-medium text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                {user ? 'Voltar ao sistema' : 'Voltar para a página inicial'}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="section-kicker">Modo apresentação</p>
              <h1 className="mt-3 font-display text-[2.3rem] leading-tight text-foreground sm:text-5xl">
                Panorama vivo da Biblioteca Pimentas VII.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground sm:text-base">
                Esta visão foi pensada para mostrar, em poucos blocos, como o sistema apoia a leitura, a organização do
                acervo e a comunicação da escola com alunos e professores.
              </p>

              {!hasPresentationData && (
                <div className="mt-5 rounded-[1.3rem] border border-dashed border-border/70 bg-card/45 px-4 py-3 text-sm leading-7 text-muted-foreground">
                  O ambiente publicado já está pronto para demonstração estrutural. Assim que a escola cadastrar livros,
                  avisos e documentos, esta vitrine passa a refletir dados reais da biblioteca.
                </div>
              )}
            </div>

            <div className="grid gap-4 min-[480px]:grid-cols-2">
              {[
                { icon: BookOpen, label: 'Títulos no acervo', value: publicData.overview.totalBooks },
                { icon: BookMarked, label: 'Empréstimos ativos', value: publicData.overview.activeLoans },
                { icon: MessageSquareQuote, label: 'Resenhas publicadas', value: publicData.totalReviews },
                { icon: Heart, label: 'Favoritos salvos', value: publicData.totalFavorites },
              ].map((item) => (
                <div key={item.label} className="glass-panel rounded-[1.4rem] p-5 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                      <p className="mt-3 font-display text-4xl text-foreground">{item.value}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                      <item.icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="glass-panel rounded-[1.7rem] p-5 shadow-card sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Comunicação escolar</p>
                <h2 className="mt-2 font-display text-3xl text-foreground">Avisos em destaque</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                <Megaphone className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-3">
              {noticesToShow.map((notice) => (
                <div key={notice.id} className="rounded-[1.35rem] border border-border/70 bg-card/70 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {noticeCategoryLabel[notice.categoria]}
                    </span>
                    <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {noticeAudienceLabel[notice.publico]}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-semibold text-foreground">{notice.titulo}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{notice.mensagem}</p>
                </div>
              ))}

              {activeNotices.length === 0 && (
                <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-card/40 p-5 text-sm leading-7 text-muted-foreground">
                  Nenhum aviso ativo no momento. O painel administrativo pode publicar comunicados para esta tela.
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[1.7rem] p-5 shadow-card sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Indicadores de leitura</p>
                <h2 className="mt-2 font-display text-3xl text-foreground">Fluxo da biblioteca</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                <Monitor className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Concluídos', value: publicData.completedLoans, tone: 'text-primary' },
                { label: 'Em análise', value: publicData.pendingLoans, tone: 'text-warm-gold' },
                { label: 'Sugestões docentes', value: publicData.overview.suggestionsCount, tone: 'text-sky-400' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-[1.35rem] border border-border/70 bg-card/70 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</p>
                  <p className={`mt-3 font-display text-4xl ${metric.tone}`}>{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-border/70 bg-card/70 p-4">
              <p className="text-sm font-semibold text-foreground">Alcance do sistema</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {publicData.overview.totalUsers > 0
                  ? `Hoje a plataforma reúne ${publicData.studentsCount} aluno(s), ${publicData.teachersCount} professor(es) e uma administração capaz de acompanhar empréstimos, recomendações e suporte em um único ambiente.`
                  : 'A publicação já está pronta para receber a comunidade escolar. Quando os cadastros e materiais entrarem, esta tela passa a refletir o alcance real do sistema.'}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[1.7rem] p-5 shadow-card sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">Destaques do acervo</p>
              <h2 className="mt-2 font-display text-3xl text-foreground">Livros com maior potencial de engajamento</h2>
            </div>
            <Link
              to={user ? (user.role === 'professor' ? '/professor/catalogo' : user.role === 'admin' ? '/admin/livros' : '/aluno/catalogo') : '/'}
              className="w-fit rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm text-foreground"
            >
              Abrir acervo completo
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {topBooks.map((book) => (
              <div key={book.id} className="rounded-[1.45rem] border border-border/70 bg-card/70 p-4">
                <img src={book.capa} alt={book.titulo} className="aspect-[4/3] w-full rounded-[1.2rem] object-cover shadow-card" />
                <p className="mt-4 font-display text-2xl text-foreground">{book.titulo}</p>
                <p className="mt-1 text-sm text-muted-foreground">{book.autor}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">{book.categoria}</span>
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                    {book.quantidadeDisponivel} disponível(is)
                  </span>
                  {book.reviewCount > 0 && (
                    <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                      {book.averageReview.toFixed(1)}/5 nas resenhas
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{book.descricao}</p>
              </div>
            ))}

            {topBooks.length === 0 && (
              <div className="lg:col-span-3 rounded-[1.45rem] border border-dashed border-border/70 bg-card/45 p-5 text-sm leading-7 text-muted-foreground">
                Os destaques do acervo aparecerão aqui quando os primeiros livros e resenhas forem cadastrados. A estrutura
                da apresentação já está pronta para receber dados reais da biblioteca.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-card/50 px-5 py-4 text-sm leading-7 text-muted-foreground">
          Biblioteca Pimentas VII em modo apresentação: leitura, empréstimos, suporte e comunicação institucional em um só
          panorama.
        </div>
      </div>
    </div>
  );
};

export default PresentationModePage;

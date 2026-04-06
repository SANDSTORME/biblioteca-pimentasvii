import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, Megaphone, Monitor, Users } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { noticeCategoryLabel } from '@/lib/community';

// Painel do professor com acesso rápido ao catálogo, avisos e sugestões enviadas.
const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const { books, notices, suggestions } = useLibrary();
  const navigate = useNavigate();

  const mySuggestions = suggestions.filter((suggestion) => suggestion.professorId === user?.id);
  const activeClasses = new Set(mySuggestions.map((suggestion) => suggestion.turma)).size;
  const visibleNotices = notices
    .filter((notice) => notice.ativo && (notice.publico === 'todos' || notice.publico === 'professores'))
    .sort((left, right) => {
      if (left.destaque !== right.destaque) {
        return Number(right.destaque) - Number(left.destaque);
      }
      return right.criadoEm.localeCompare(left.criadoEm);
    })
    .slice(0, 3);

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen animate-card-enter rounded-[1.55rem] p-5 sm:rounded-[1.9rem] sm:p-6">
        <p className="section-kicker">Área do professor</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">
          Olá, {user?.nome?.split(' ').slice(-1)[0]}!
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          Organize leituras por turma, acompanhe suas sugestões e mantenha a biblioteca conectada ao planejamento
          pedagógico.
        </p>
      </div>

      <div className="stagger-grid grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Livros no acervo" value={books.length} />
        <StatCard icon={ClipboardList} label="Sugestões enviadas" value={mySuggestions.length} />
        <StatCard icon={Users} label="Turmas atendidas" value={activeClasses || 1} />
        <StatCard icon={Megaphone} label="Avisos visíveis" value={visibleNotices.length} />
      </div>

      <div className="stagger-grid grid gap-4 lg:grid-cols-3">
        <button
          onClick={() => navigate('/professor/catalogo')}
          className="glass-panel interactive-panel hover-lift rounded-[1.55rem] p-5 text-left shadow-card hover:border-warm-gold/30 sm:rounded-[1.7rem]"
        >
          <BookOpen className="mb-3 h-5 w-5 text-primary" />
          <p className="text-base font-semibold text-foreground">Explorar catálogo</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Avalie títulos disponíveis e descubra novas leituras para indicar às turmas.
          </p>
        </button>

        <button
          onClick={() => navigate('/professor/sugestoes')}
          className="glass-panel interactive-panel hover-lift rounded-[1.55rem] p-5 text-left shadow-card hover:border-warm-gold/30 sm:rounded-[1.7rem]"
        >
          <ClipboardList className="mb-3 h-5 w-5 text-primary" />
          <p className="text-base font-semibold text-foreground">Gerenciar sugestões</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Envie novas recomendações e acompanhe o histórico das mensagens enviadas.
          </p>
        </button>

        <button
          onClick={() => navigate('/apresentacao')}
          className="glass-panel interactive-panel hover-lift rounded-[1.55rem] p-5 text-left shadow-card hover:border-warm-gold/30 sm:rounded-[1.7rem]"
        >
          <Monitor className="mb-3 h-5 w-5 text-primary" />
          <p className="text-base font-semibold text-foreground">Abrir modo apresentação</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Use uma visão resumida do sistema para reunião pedagógica, laboratório ou exibição em telão.
          </p>
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel animate-card-enter-delayed rounded-[1.55rem] p-4 shadow-card sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
            <h2 className="font-display text-2xl text-foreground">Últimas sugestões</h2>
            <span className="w-fit rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs text-muted-foreground">
              {mySuggestions.length} registro(s)
            </span>
          </div>

          <div className="stagger-list space-y-3">
            {mySuggestions.slice(0, 3).map((suggestion) => {
              const book = books.find((entry) => entry.id === suggestion.livroId);

              return (
                <div key={suggestion.id} className="interactive-panel hover-lift rounded-[1.3rem] border border-white/8 bg-black/10 p-4">
                  <p className="font-medium text-foreground">{book?.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    Turma {suggestion.turma} • {suggestion.criadoEm}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{suggestion.mensagem}</p>
                </div>
              );
            })}

            {mySuggestions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma sugestão enviada ainda.</p>}
          </div>
        </div>

        <div className="glass-panel animate-card-enter rounded-[1.55rem] p-4 shadow-card sm:rounded-[1.8rem] sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl text-foreground">Avisos para docência</h2>
          </div>

          <div className="space-y-3">
            {visibleNotices.map((notice) => (
              <div key={notice.id} className="rounded-[1.3rem] border border-border/70 bg-card/70 p-4">
                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {noticeCategoryLabel[notice.categoria]}
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">{notice.titulo}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{notice.mensagem}</p>
              </div>
            ))}

            {visibleNotices.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum aviso ativo para professores no momento.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;

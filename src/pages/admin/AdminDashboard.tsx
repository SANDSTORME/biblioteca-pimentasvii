import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BookMarked, BookOpen, ClipboardList, FileStack, Key, Megaphone, Monitor, TimerReset, Users } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { useLibrary } from '@/contexts/LibraryContext';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { books, documents, loans, notices, teacherTokens, users } = useLibrary();

  const pendingLoans = loans.filter((loan) => loan.status === 'pendente');
  const overdueLoans = loans.filter((loan) => loan.status === 'atrasado');
  const activeNotices = notices.filter((notice) => notice.ativo);

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
        <p className="section-kicker">Centro de controle</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Painel administrativo</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Uma visão única para circulação do acervo, documentos, auditoria, relatórios e comunicação da Biblioteca
          Pimentas VII.
        </p>
      </div>

      <div className="stagger-grid grid grid-cols-2 gap-4 xl:grid-cols-6">
        <StatCard icon={BookOpen} label="Livros cadastrados" value={books.length} />
        <StatCard icon={Users} label="Usuários ativos" value={users.filter((user) => user.ativo).length} />
        <StatCard icon={BookMarked} label="Empréstimos pendentes" value={pendingLoans.length} />
        <StatCard icon={TimerReset} label="Atrasos em aberto" value={overdueLoans.length} />
        <StatCard icon={FileStack} label="Documentos publicados" value={documents.length} />
        <StatCard icon={Megaphone} label="Avisos ativos" value={activeNotices.length} />
      </div>

      <div className="stagger-grid grid gap-4 lg:grid-cols-4">
        {[
          { label: 'Gerenciar livros', path: '/admin/livros', icon: BookOpen, desc: 'Cadastro, capas e organização do acervo.' },
          { label: 'Central de documentos', path: '/admin/documentos', icon: FileStack, desc: 'Regulamentos, listas de leitura e comunicados em arquivo.' },
          { label: 'Relatórios da escola', path: '/admin/relatorios', icon: Activity, desc: 'Números prontos para apresentação, exportação e reunião.' },
          { label: 'Auditoria administrativa', path: '/admin/auditoria', icon: ClipboardList, desc: 'Rastro das ações mais importantes do sistema.' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="glass-panel interactive-panel hover-lift rounded-[1.55rem] p-5 text-left shadow-card"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
              <item.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">{item.label}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <section className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl text-foreground">Fila de empréstimos</h2>
              <p className="text-sm leading-7 text-muted-foreground">Pedidos pendentes e alertas que merecem atenção imediata.</p>
            </div>
            <button
              onClick={() => navigate('/admin/emprestimos')}
              className="rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground"
            >
              Abrir fila
            </button>
          </div>

          <div className="space-y-3">
            {[...pendingLoans, ...overdueLoans].slice(0, 5).map((loan) => {
              const book = books.find((entry) => entry.id === loan.livroId);
              const student = users.find((entry) => entry.id === loan.alunoId);

              return (
                <div
                  key={loan.id}
                  className={`rounded-[1.3rem] border p-4 ${
                    loan.status === 'atrasado'
                      ? 'border-destructive/25 bg-destructive/10'
                      : 'border-border/70 bg-card/70'
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{book?.titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {student?.nome} • {loan.token}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {loan.status === 'atrasado'
                      ? `${loan.diasAtraso ?? 0} dia(s) de atraso`
                      : `Solicitado em ${loan.dataPedido}`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-olive text-primary-foreground shadow-card">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-3xl text-foreground">Sinais do sistema</h2>
              <p className="text-sm leading-7 text-muted-foreground">Indicadores rápidos para o uso diário da equipe.</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.3rem] border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Tokens docentes disponíveis</p>
              <p className="mt-3 font-display text-4xl text-foreground">{teacherTokens.filter((token) => !token.usado).length}</p>
            </div>
            <div className="rounded-[1.3rem] border border-border/70 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Documentos em destaque</p>
              <p className="mt-3 font-display text-4xl text-foreground">{documents.filter((document) => document.destaque).length}</p>
            </div>
            <button
              onClick={() => navigate('/apresentacao')}
              className="interactive-panel hover-lift rounded-[1.3rem] border border-border/70 bg-card/70 p-4 text-left"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                  <Monitor className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Modo apresentação</p>
                  <p className="mt-1 text-sm leading-7 text-muted-foreground">
                    Use a versão de exposição do projeto para feira, reunião ou telão.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;

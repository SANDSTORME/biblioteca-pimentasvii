import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BookMarked,
  BookOpen,
  ClipboardList,
  FileStack,
  Heart,
  History,
  Home,
  Key,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  Monitor,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/shared/BrandLogo';
import ThemeToggle from '@/components/shared/ThemeToggle';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const studentNav: NavItem[] = [
  { label: 'Início', icon: Home, path: '/aluno' },
  { label: 'Catálogo', icon: Search, path: '/aluno/catalogo' },
  { label: 'Documentos', icon: FileStack, path: '/aluno/documentos' },
  { label: 'Empréstimos', icon: BookMarked, path: '/aluno/emprestimos' },
  { label: 'Favoritos', icon: Heart, path: '/aluno/favoritos' },
  { label: 'Histórico', icon: History, path: '/aluno/historico' },
  { label: 'Recomendações', icon: BookOpen, path: '/aluno/recomendacoes' },
  { label: 'Suporte', icon: LifeBuoy, path: '/aluno/suporte' },
];

const teacherNav: NavItem[] = [
  { label: 'Início', icon: Home, path: '/professor' },
  { label: 'Catálogo', icon: Search, path: '/professor/catalogo' },
  { label: 'Documentos', icon: FileStack, path: '/professor/documentos' },
  { label: 'Sugestões', icon: ClipboardList, path: '/professor/sugestoes' },
  { label: 'Suporte', icon: LifeBuoy, path: '/professor/suporte' },
];

const adminNav: NavItem[] = [
  { label: 'Painel', icon: Home, path: '/admin' },
  { label: 'Usuários', icon: Users, path: '/admin/usuarios' },
  { label: 'Livros', icon: BookOpen, path: '/admin/livros' },
  { label: 'Documentos', icon: FileStack, path: '/admin/documentos' },
  { label: 'Empréstimos', icon: BookMarked, path: '/admin/emprestimos' },
  { label: 'Relatórios', icon: Activity, path: '/admin/relatorios' },
  { label: 'Auditoria', icon: ClipboardList, path: '/admin/auditoria' },
  { label: 'Permissões', icon: Shield, path: '/admin/permissoes' },
  { label: 'Tokens', icon: Key, path: '/admin/tokens' },
  { label: 'Avisos', icon: Megaphone, path: '/admin/avisos' },
  { label: 'Apresentação', icon: Monitor, path: '/apresentacao' },
  { label: 'Suporte', icon: LifeBuoy, path: '/admin/suporte' },
];

const isNavPathMatch = (currentPath: string, itemPath: string) =>
  currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'professor' ? teacherNav : studentNav;
  const roleLabel = user?.role === 'admin' ? 'Administração' : user?.role === 'professor' ? 'Professor(a)' : 'Aluno(a)';

  const activeItem = useMemo(
    () =>
      [...navItems]
        .filter((item) => isNavPathMatch(location.pathname, item.path))
        .sort((left, right) => right.path.length - left.path.length)[0] ?? navItems[0],
    [location.pathname, navItems],
  );

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {!mobile && (
        <div className="border-b border-sidebar-border/70 p-6">
          <BrandLogo />
        </div>
      )}

      <div className="px-4 pt-4">
        <div className="glass-panel panel-sheen rounded-2xl px-4 py-4">
          <p className="section-kicker">Ambiente ativo</p>
          <h2 className="mt-2 font-display text-2xl text-foreground">{roleLabel}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Navegação editorial para acervo, documentos, empréstimos, relatórios e suporte com foco em clareza.
          </p>
        </div>
      </div>

      <nav className="stagger-list flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {navItems.map((item) => {
          const active = item.path === activeItem?.path;
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={cn(
                'interactive-panel group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition-all duration-300',
                active
                  ? 'border-warm-gold bg-warm-gold/20 text-foreground shadow-card ring-1 ring-warm-gold/35'
                  : 'border-transparent bg-transparent text-sidebar-foreground hover:border-sidebar-border hover:bg-sidebar-accent hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300',
                  active
                    ? 'bg-gradient-gold text-primary-foreground shadow-card ring-1 ring-warm-gold/30'
                    : 'bg-sidebar-accent/80 group-hover:bg-sidebar-accent',
                )}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span className="tracking-[0.01em]">{item.label}</span>
              {active && (
                <>
                  <span className="absolute inset-y-2 left-2 w-1 rounded-full bg-warm-gold" />
                  <span className="absolute inset-y-2 right-2 w-1 rounded-full bg-warm-gold/70" />
                  <span className="absolute inset-x-3 bottom-0 h-px bg-warm-gold/65" />
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border/70 p-4">
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-olive font-semibold text-primary-foreground shadow-card">
              {user?.nome?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user?.nome}</p>
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
            </div>
          </div>

          <button
            onClick={() => void handleLogout()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Encerrar sessão
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-glow-pulse absolute left-[-10%] top-24 h-72 w-72 rounded-full bg-warm-gold/10 blur-3xl" />
        <div className="animate-drift-slow absolute bottom-0 right-[-8%] h-96 w-96 rounded-full bg-olive/10 blur-3xl" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-sidebar-border/70 bg-sidebar/85 backdrop-blur-2xl lg:flex xl:w-80">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-warm-black/80 backdrop-blur-md lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="animate-slide-in flex h-full w-[90vw] max-w-sm flex-col border-r border-sidebar-border/70 bg-sidebar/95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-sidebar-border/70 px-5 py-4">
              <BrandLogo compact showSubtitle={false} />
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Fechar menu lateral"
                title="Fechar menu lateral"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      <div className="relative flex min-h-screen flex-col lg:ml-72 xl:ml-80">
        <header className="sticky top-0 z-20 px-3 pb-3 pt-3 sm:px-4 lg:px-8 lg:pt-4">
          <div className="glass-panel panel-sheen animate-card-enter flex flex-wrap items-start gap-3 rounded-[1.35rem] px-3 py-3 sm:items-center sm:rounded-[1.75rem] sm:px-4 sm:py-4">
            <button
              aria-label="Abrir menu lateral"
              title="Abrir menu lateral"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-foreground lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="section-kicker animate-subtitle-rise">Biblioteca Pimentas VII</p>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                <h2 className="font-display text-[1.9rem] leading-none text-foreground sm:text-3xl">{activeItem?.label}</h2>
                <span className="w-fit rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/78">
                  {roleLabel}
                </span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle compact className="shrink-0" />
              <div className="hidden rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-right xl:block">
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/70">Experiência</p>
                <p className="text-sm font-semibold text-foreground">Interface editorial com resposta rápida</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 pb-5 sm:px-4 lg:px-8 lg:pb-8">
          <div className="hero-spotlight animate-page-enter rounded-[1.5rem] border border-border/60 bg-card/40 p-1 sm:rounded-[2rem]">
            <div className="reading-grid rounded-[1.35rem] border border-border/60 bg-background/70 p-3 sm:rounded-[1.8rem] sm:p-4 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

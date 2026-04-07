import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookMarked,
  GraduationCap,
  LibraryBig,
  LifeBuoy,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import usePublicSiteData from '@/hooks/usePublicSiteData';
import SchoolClassSelect from '@/components/shared/SchoolClassSelect';
import BrandLogo from '@/components/shared/BrandLogo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

type AuthMode = 'none' | 'login' | 'cadastro-aluno' | 'cadastro-professor';

const routes: Record<UserRole, string> = {
  aluno: '/aluno',
  professor: '/professor',
  admin: '/admin',
};

const STUDENT_EMAIL_DOMAIN = '@aluno.educacao.sp.gov.br';

const normalizeStudentEmailLocalPart = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '').replace(/@.*$/, '');

const buildStudentInstitutionalEmail = (localPart: string) => {
  const normalized = normalizeStudentEmailLocalPart(localPart);
  return normalized ? `${normalized}${STUDENT_EMAIL_DOMAIN}` : '';
};

const inputClassName =
  'mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/80 focus:border-warm-gold/50 focus:outline-none focus:ring-2 focus:ring-warm-gold/25';

const LandingPage: React.FC = () => {
  const { login, register, user } = useAuth();
  const { books, loans, notices } = useLibrary();
  const { data: publicData } = usePublicSiteData();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('none');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [turma, setTurma] = useState('');
  const [tokenProf, setTokenProf] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const studentEmailLocalPart = normalizeStudentEmailLocalPart(email);

  useEffect(() => {
    document.title = 'Biblioteca Pimentas VII';
    if (user) navigate(routes[user.role]);
  }, [navigate, user]);

  const stats = useMemo(
    () => [
      { value: books.length, label: 'títulos no acervo' },
      { value: books.reduce((total, book) => total + book.quantidadeDisponivel, 0), label: 'cópias disponíveis' },
      { value: loans.filter((loan) => loan.status === 'aprovado').length, label: 'empréstimos ativos' },
      { value: notices.filter((notice) => notice.ativo).length, label: 'avisos em circulação' },
    ],
    [books, loans, notices],
  );

  const highlights = [
    {
      icon: LibraryBig,
      title: 'Catálogo vivo',
      desc: 'Busca por título, autor, categoria e faixa escolar com navegação mais clara e bonita.',
    },
    {
      icon: BookMarked,
      title: 'Empréstimos em fluxo real',
      desc: 'Pedidos, aprovações, recusas e devoluções com atualização automática do estoque.',
    },
    {
      icon: MessageSquareQuote,
      title: 'Resenhas e histórico',
      desc: 'Alunos registram opiniões, acompanham sua trajetória e constroem memória de leitura.',
    },
    {
      icon: LifeBuoy,
      title: 'Suporte por e-mail institucional',
      desc: 'Contato direto com o Gmail oficial da biblioteca para dúvidas, orientação e acompanhamento.',
    },
  ];

  const projectTeam = [
    { name: 'Eduardo Loureço', role: 'Desenvolvedor líder' },
    { name: 'Professor Oderley', role: 'Orientação do projeto' },
    { name: 'Wilde Barbosa', role: 'Colaboração' },
    { name: 'Maria Clara', role: 'Colaboração' },
    { name: 'Samuel Nicolas', role: 'Colaboração' },
    { name: 'Henrique Brito', role: 'Colaboração' },
  ];

  const schoolBenefits = [
    {
      icon: LibraryBig,
      title: 'Biblioteca mais organizada',
      description: 'Centraliza catálogo, disponibilidade de livros e controle de exemplares em um ambiente fácil de acompanhar.',
    },
    {
      icon: BookMarked,
      title: 'Fluxo de empréstimos mais claro',
      description: 'Ajuda a escola a registrar pedidos, aprovações, recusas e devoluções sem depender de anotações soltas.',
    },
    {
      icon: Users,
      title: 'Mais conexão entre equipe e alunos',
      description: 'Aproxima administração, professores e estudantes com recomendações, suporte e acompanhamento em um só sistema.',
    },
  ];

  const accessGuides = [
    {
      icon: GraduationCap,
      title: 'Alunos com conta institucional',
      description: 'Entram com o e-mail escolar, acompanham leituras, empréstimos, histórico e materiais publicados pela biblioteca.',
    },
    {
      icon: Users,
      title: 'Professores com liberação da equipe',
      description: 'O cadastro docente depende de token entregue pela administração da biblioteca, sem exposição pública de credenciais.',
    },
    {
      icon: ShieldCheck,
      title: 'Administração com acesso interno',
      description: 'Gestão do acervo, relatórios, auditoria e permissões ficam restritas ao painel administrativo da escola.',
    },
  ];

  const resetForm = () => {
    setError('');
    setLoading(false);
    setEmail('');
    setSenha('');
    setNome('');
    setTurma('');
    setTokenProf('');
  };

  const openMode = (nextMode: AuthMode) => {
    resetForm();
    setMode(nextMode);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, senha);
    setLoading(false);
    if (!ok) setError('E-mail ou senha inválidos.');
  };

  const handleRegister = async (event: React.FormEvent, role: UserRole) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const normalizedEmail =
      role === 'aluno'
        ? buildStudentInstitutionalEmail(email)
        : email.trim().toLowerCase();

    if (role === 'aluno' && !normalizedEmail) {
      setLoading(false);
      setError('Informe o usuário do Gmail institucional do aluno.');
      return;
    }

    const result = await register(nome, normalizedEmail, senha, role, turma, tokenProf);
    setLoading(false);
    if (!result.success) setError(result.message);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-float-slow absolute left-[-7%] top-12 h-64 w-64 rounded-full bg-warm-gold/10 blur-3xl sm:h-72 sm:w-72" />
        <div className="animate-float-delayed absolute right-[-10%] top-1/4 h-72 w-72 rounded-full bg-olive/10 blur-3xl sm:h-80 sm:w-80" />
        <div className="animate-drift-slow absolute bottom-[-12%] left-1/3 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl sm:h-96 sm:w-96" />
      </div>

      <section className="hero-spotlight relative isolate overflow-hidden px-4 pb-14 pt-5 sm:pb-16 sm:pt-6 lg:pb-24 lg:pt-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 rounded-[1.55rem] border border-border/60 bg-card/45 px-4 py-4 backdrop-blur-xl sm:rounded-[2rem] xl:flex-row xl:items-center xl:justify-between md:px-6">
            <BrandLogo tone="light" showSubtitle={false} />
            <nav className="flex flex-wrap items-center gap-2 sm:gap-3 xl:justify-center">
              <a
                href="#sobre-projeto"
                className="rounded-full border border-border/70 bg-card/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cream transition-colors hover:border-warm-gold/30 hover:text-warm-gold"
              >
                Sobre o projeto
              </a>
              <button
                onClick={() => navigate('/apresentacao')}
                className="rounded-full border border-border/70 bg-card/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cream transition-colors hover:border-warm-gold/30 hover:text-warm-gold"
              >
                Modo apresentação
              </button>
            </nav>
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center xl:justify-end">
              <ThemeToggle tone="light" />
              <button
                onClick={() => openMode('login')}
                className="rounded-2xl border border-border/70 bg-card/70 px-5 py-3 text-sm font-medium text-cream hover:border-warm-gold/30 hover:bg-card"
              >
                Entrar
              </button>
              <button
                onClick={() => openMode('cadastro-aluno')}
                className="rounded-2xl bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card hover:scale-[1.01]"
              >
                Criar conta
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start lg:gap-8">
            <div className="animate-page-enter">
              <p className="section-kicker animate-subtitle-rise">Leitura, organização e presença institucional</p>
              <h1 className="title-glow mt-4 max-w-4xl font-display text-[2.9rem] leading-[0.94] text-cream min-[420px]:text-[3.4rem] sm:text-6xl lg:text-8xl">
                Biblioteca Pimentas VII com
                <span className="block text-gradient-gold">identidade forte e navegação memorável.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-cream/88 sm:mt-6 sm:text-base sm:leading-8 md:text-lg">
                Uma plataforma escolar com visual mais refinado, fluxos organizados e experiência mais bonita para
                alunos, professores e administração.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                <button
                  onClick={() => openMode('login')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-6 py-4 text-sm font-semibold text-primary-foreground shadow-card hover:translate-y-[-1px] sm:w-auto"
                >
                  Entrar na plataforma
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openMode('cadastro-professor')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-olive px-6 py-4 text-sm font-semibold text-primary-foreground shadow-card hover:translate-y-[-1px] sm:w-auto"
                >
                  Cadastrar professor
                </button>
                <button
                  onClick={() => navigate('/apresentacao')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-6 py-4 text-sm font-semibold text-cream hover:border-warm-gold/30 sm:w-auto"
                >
                  Ver modo apresentação
                </button>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="glass-panel rounded-[1.45rem] p-4 sm:rounded-[1.6rem] sm:p-5">
                    <p className="font-display text-3xl text-cream sm:text-4xl">{stat.value}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cream/74">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 animate-card-enter">
              <div className="glass-panel panel-sheen reading-grid relative overflow-hidden rounded-[1.7rem] p-5 sm:rounded-[2rem] sm:p-6 md:p-8">
                <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-warm-gold-light sm:right-6 sm:top-6">
                  Edição assinada
                </div>

                <div className="mx-auto max-w-md pt-8 sm:pt-0">
                  <div className="brand-frame animate-float-slow mx-auto w-fit rounded-[1.8rem] bg-black/15 p-3 sm:rounded-[2.1rem]">
                    <img
                      src="/brand/logo-biblioteca-pimentas-vii-v4.svg"
                      alt="Logo da Biblioteca Pimentas VII"
                      className="h-52 w-52 rounded-[1.45rem] object-cover shadow-elevated sm:h-64 sm:w-64 sm:rounded-[1.55rem] lg:h-72 lg:w-72 lg:rounded-[1.7rem]"
                    />
                  </div>

                  <div className="mt-5 glass-panel rounded-[1.3rem] p-4 sm:mt-6 sm:rounded-[1.4rem]">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-warm-gold" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Nova presença visual</p>
                        <p className="text-xs leading-6 text-muted-foreground">
                          Tipografia editorial, profundidade, brilho controlado e movimento orgânico.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 min-[430px]:grid-cols-2">
                    <div className="glass-panel rounded-[1.3rem] p-4 sm:rounded-[1.4rem]">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Usuários</p>
                      <p className="mt-2 font-display text-3xl text-foreground">{publicData.overview.totalUsers}</p>
                    </div>
                    <div className="glass-panel rounded-[1.3rem] p-4 sm:rounded-[1.4rem]">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Sugestões</p>
                      <p className="mt-2 font-display text-3xl text-foreground">{publicData.overview.suggestionsCount}</p>
                    </div>
                  </div>
                  {publicData.overview.totalUsers === 0 &&
                    publicData.overview.suggestionsCount === 0 &&
                    publicData.overview.totalBooks === 0 && (
                      <p className="mt-3 text-xs leading-6 text-muted-foreground">
                        Ambiente publicado pronto para receber acervo, comunidade e recomendações reais da escola.
                      </p>
                    )}
                </div>
              </div>

              <div className="glass-panel interactive-panel overflow-hidden rounded-[1.55rem] border border-warm-gold/20 p-5 shadow-elevated sm:rounded-[1.7rem] sm:p-6">
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-warm-gold/55 to-transparent" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="section-kicker text-[10px] tracking-[0.28em]">Acesso institucional</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">Credenciais e permissões sem exposição pública</p>
                    <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                      O sistema mantém contas, tokens e autorizações em fluxo interno da escola. A página pública mostra apenas
                      entradas reais de acesso e cadastro.
                    </p>
                    <button
                      type="button"
                      onClick={() => openMode('cadastro-professor')}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-warm-gold/25 bg-warm-gold/10 px-5 py-3 text-sm font-semibold text-warm-gold hover:border-warm-gold/40 hover:bg-warm-gold/15"
                    >
                      Solicitar cadastro de professor
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Destaques do sistema</p>
              <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">Mais clareza, mais identidade, mais vida.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Cada bloco abaixo resume o que ficou mais forte na experiência visual e no fluxo de uso do sistema.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {highlights.map((feature, index) => (
              <div
                key={feature.title}
                className={cn(
                  'glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.7rem] sm:p-6',
                  index % 2 === 0 ? 'animate-float-slow' : 'animate-float-delayed',
                )}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-3xl text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sobre-projeto" className="px-4 pb-10 pt-2 lg:pb-14 lg:pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="glass-panel reading-grid rounded-[1.7rem] p-5 sm:rounded-[2rem] sm:p-6 md:p-8">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
              <div>
                <p className="section-kicker">Sobre o projeto</p>
                <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
                  Um website criado para fortalecer a rotina da escola.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">
                  A Biblioteca Pimentas VII foi pensada para transformar a organização do acervo em uma experiência
                  mais clara, bonita e funcional. O sistema ajuda a escola a acompanhar leituras, organizar
                  empréstimos, liberar acessos, centralizar o suporte por e-mail e aproximar professores, estudantes e administração
                  em um fluxo digital mais confiável.
                </p>

                <div className="mt-6 rounded-[1.4rem] border border-border/70 bg-card/70 p-5 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-warm-gold">Criação e equipe</p>
                  <p className="mt-3 text-sm leading-7 text-foreground">
                    O desenvolvimento do website foi liderado por <span className="font-semibold">Eduardo Loureço</span>,
                    com orientação do <span className="font-semibold">Professor Oderley</span> e colaboração de
                    <span className="font-semibold"> Wilde Barbosa</span>, <span className="font-semibold">Maria Clara</span>,
                    <span className="font-semibold"> Samuel Nicolas</span> e <span className="font-semibold">Henrique Brito</span>.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {projectTeam.map((member) => (
                      <div
                        key={member.name}
                        className="rounded-full border border-border/70 bg-background/70 px-3 py-2 text-xs shadow-sm"
                      >
                        <span className="font-semibold text-foreground">{member.name}</span>
                        <span className="ml-2 text-muted-foreground">{member.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {schoolBenefits.map((benefit, index) => (
                  <div
                    key={benefit.title}
                    className={cn(
                      'glass-panel panel-sheen rounded-[1.45rem] p-5 shadow-card sm:rounded-[1.6rem]',
                      index === 1 ? 'animate-float-delayed' : 'animate-float-slow',
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                        <benefit.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-display text-2xl text-foreground">{benefit.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-4 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="glass-panel reading-grid rounded-[1.7rem] p-5 sm:rounded-[2rem] sm:p-6 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-kicker">Acesso institucional</p>
                <h2 className="mt-3 font-display text-4xl text-foreground">Entradas reais para cada perfil da escola.</h2>
              </div>
              <div className="rounded-[1.2rem] border border-border/70 bg-card/70 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Fluxo de acesso</p>
                <p className="mt-1 text-sm text-foreground">Cada público entra com sua própria conta e nível de autorização.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {accessGuides.map((entry) => (
                <div
                  key={entry.title}
                  className="group interactive-panel hover-lift rounded-[1.5rem] border border-border/70 bg-card/70 p-5 text-left sm:rounded-[1.6rem]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                    <entry.icon className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-lg font-semibold text-foreground">{entry.title}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{entry.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {mode !== 'none' && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-warm-black/82 p-4 backdrop-blur-md sm:items-center sm:p-6"
          onClick={() => setMode('none')}
        >
          <div
            className="glass-panel panel-sheen relative mt-4 w-full max-w-xl overflow-hidden rounded-[1.6rem] p-5 sm:mt-0 sm:max-h-[90vh] sm:rounded-[2rem] sm:p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setMode('none')}
              aria-label="Fechar janela"
              title="Fechar janela"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/10 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <BrandLogo compact={false} tone="light" showSubtitle={false} />

            {mode === 'login' && (
              <div className="mt-8">
                <p className="section-kicker">Entrar</p>
                <h2 className="mt-3 font-display text-4xl text-cream">Acesse seu ambiente.</h2>
                <p className="mt-3 text-sm leading-7 text-cream/70">Use sua conta cadastrada para acessar o ambiente correto da biblioteca.</p>
                <form onSubmit={handleLogin} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">E-mail</label>
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClassName} placeholder="seu@email.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Senha</label>
                    <input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} required className={inputClassName} placeholder="Digite sua senha" />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-gold px-6 py-4 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60">
                    {loading ? 'Entrando...' : 'Entrar no sistema'}
                  </button>
                </form>
                <Link to="/redefinir-senha" className="mt-4 inline-flex text-sm text-warm-gold hover:text-warm-gold-light">
                  Esqueci minha senha
                </Link>
              </div>
            )}

            {mode === 'cadastro-aluno' && (
              <div className="mt-8">
                <p className="section-kicker">Cadastro de aluno</p>
                <h2 className="mt-3 font-display text-4xl text-cream">Novo leitor no sistema.</h2>
                <p className="mt-3 text-sm leading-7 text-cream/70">Crie uma conta para liberar catálogo, empréstimos e suporte.</p>
                <form onSubmit={(event) => handleRegister(event, 'aluno')} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Nome completo</label>
                    <input type="text" value={nome} onChange={(event) => setNome(event.target.value)} required className={inputClassName} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Gmail institucional</label>
                    <div className="mt-2 overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm transition-all focus-within:border-warm-gold/50 focus-within:ring-2 focus-within:ring-warm-gold/25">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={studentEmailLocalPart}
                          onChange={(event) => setEmail(normalizeStudentEmailLocalPart(event.target.value))}
                          required
                          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
                          placeholder="seu.usuario"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                        <div className="border-t border-border/70 bg-background/60 px-4 py-3 text-xs font-medium text-muted-foreground sm:border-l sm:border-t-0">
                          {STUDENT_EMAIL_DOMAIN}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      Digite apenas a parte antes do <span className="font-mono text-foreground">{STUDENT_EMAIL_DOMAIN}</span>.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Turma</label>
                    <SchoolClassSelect
                      value={turma}
                      onChange={setTurma}
                      required
                      className={inputClassName}
                      placeholder="Selecione a turma"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Senha</label>
                    <input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} required className={inputClassName} />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-gold px-6 py-4 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60">
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </button>
                </form>
                <button onClick={() => openMode('login')} className="mt-4 text-sm text-warm-gold hover:text-warm-gold-light">
                  Já tenho conta
                </button>
              </div>
            )}

            {mode === 'cadastro-professor' && (
              <div className="mt-8">
                <p className="section-kicker">Cadastro de professor</p>
                <h2 className="mt-3 font-display text-4xl text-cream">Docência conectada à leitura.</h2>
                <p className="mt-3 text-sm leading-7 text-cream/70">Vincule um professor com token válido e libere sugestões pedagógicas.</p>
                <form onSubmit={(event) => handleRegister(event, 'professor')} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Nome completo</label>
                    <input type="text" value={nome} onChange={(event) => setNome(event.target.value)} required className={inputClassName} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">E-mail</label>
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClassName} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Token do professor</label>
                    <input type="text" value={tokenProf} onChange={(event) => setTokenProf(event.target.value)} required className={inputClassName} placeholder="PROF-2026-0001" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Senha</label>
                    <input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} required className={inputClassName} />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-gold px-6 py-4 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60">
                    {loading ? 'Cadastrando...' : 'Cadastrar professor'}
                  </button>
                </form>
                <button onClick={() => openMode('login')} className="mt-4 text-sm text-warm-gold hover:text-warm-gold-light">
                  Voltar para o login
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-white/8 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-2xl text-foreground">Biblioteca Pimentas VII</p>
            <p className="mt-1 text-sm text-muted-foreground">Acervo escolar com identidade própria e experiência refinada.</p>
          </div>
          <div className="text-sm text-muted-foreground">Projeto ajustado com nova marca, metadados próprios e navegação mais forte.</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

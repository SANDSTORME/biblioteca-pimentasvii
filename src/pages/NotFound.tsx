import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from '@/components/shared/BrandLogo';
import ThemeToggle from '@/components/shared/ThemeToggle';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404: rota inexistente acessada:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="hero-spotlight flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-panel panel-sheen relative w-full max-w-3xl overflow-hidden rounded-[2rem] p-8 md:p-12">
        <div className="absolute right-[-4rem] top-[-4rem] h-40 w-40 rounded-full bg-warm-gold/10 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[-4rem] h-52 w-52 rounded-full bg-olive/10 blur-3xl" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <BrandLogo tone="light" />
          <ThemeToggle tone="light" compact />
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="section-kicker animate-subtitle-rise">Página não encontrada</p>
            <h1 className="title-glow mt-3 font-display text-5xl text-cream md:text-7xl">404</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-cream/78">
              A rota <span className="font-semibold text-cream">{location.pathname}</span> não existe nesta versão da
              Biblioteca Pimentas VII. Vamos te levar de volta para um lugar melhor.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card hover:scale-[1.01]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

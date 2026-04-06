import React from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
  tone?: 'default' | 'light';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, compact = false, tone = 'default' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={cn(
        'inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all hover:border-warm-gold/30',
        tone === 'light'
          ? 'border-white/10 bg-black/10 text-cream hover:bg-black/20'
          : 'border-white/10 bg-black/10 text-foreground hover:bg-black/15',
        compact && 'px-3 py-2',
        className,
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-card">
        {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </span>
      <span className={cn('hidden sm:inline', compact && 'sm:hidden')}>
        {isDark ? 'Tema claro' : 'Tema escuro'}
      </span>
    </button>
  );
};

export default ThemeToggle;

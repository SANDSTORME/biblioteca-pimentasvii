import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  showSubtitle?: boolean;
  tone?: 'default' | 'light';
}

const BrandLogo = ({
  className,
  compact = false,
  showSubtitle = true,
  tone = 'default',
}: BrandLogoProps) => {
  const textColor = tone === 'light' ? 'text-cream' : 'text-foreground';
  const subtitleColor = tone === 'light' ? 'text-cream/70' : 'text-muted-foreground';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'brand-frame relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-black/20 shadow-elevated',
          compact ? 'h-12 w-12 p-1.5' : 'h-16 w-16 p-2',
        )}
      >
        <img
          src="/brand/logo-biblioteca-pimentas-vii-v4.svg"
          alt="Logo da Biblioteca Pimentas VII"
          className="h-full w-full rounded-[1rem] object-cover"
        />
      </div>

      <div className="min-w-0">
        <p
          className={cn(
            'font-display leading-none tracking-[0.18em]',
            compact ? 'text-[0.68rem]' : 'text-[0.72rem]',
            subtitleColor,
          )}
        >
          BIBLIOTECA ESCOLAR
        </p>
        <h1
          className={cn(
            'font-display font-semibold leading-tight',
            compact ? 'text-base' : 'text-2xl',
            textColor,
          )}
        >
          Biblioteca Pimentas VII
        </h1>
        {showSubtitle && (
          <p className={cn('truncate text-sm', subtitleColor)}>
            Acervo digital com leitura, empréstimos e suporte em um só lugar.
          </p>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;

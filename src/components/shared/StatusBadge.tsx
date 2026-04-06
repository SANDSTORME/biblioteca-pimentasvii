import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, { label: string; classes: string }> = {
  pendente: { label: 'Pendente', classes: 'border-warm-gold/30 bg-warm-gold/15 text-warm-gold' },
  aprovado: { label: 'Aprovado', classes: 'border-primary/30 bg-primary/15 text-primary' },
  atrasado: { label: 'Atrasado', classes: 'border-destructive/30 bg-destructive/15 text-destructive' },
  recusado: { label: 'Recusado', classes: 'border-destructive/30 bg-destructive/15 text-destructive' },
  devolvido: { label: 'Devolvido', classes: 'border-border bg-muted text-muted-foreground' },
  aberto: { label: 'Aberto', classes: 'border-warm-gold/30 bg-warm-gold/15 text-warm-gold' },
  em_andamento: { label: 'Em andamento', classes: 'border-primary/30 bg-primary/15 text-primary' },
  resolvido: { label: 'Resolvido', classes: 'border-border bg-muted text-muted-foreground' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusMap[status] || { label: status, classes: 'border-border bg-muted text-muted-foreground' };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] sm:text-xs',
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;

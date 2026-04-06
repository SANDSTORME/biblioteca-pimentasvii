import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className }) => (
  <div
    className={cn(
      'glass-panel panel-sheen flex flex-col items-center justify-center rounded-[1.8rem] px-6 py-16 text-center shadow-card',
      className,
    )}
  >
    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-gold text-primary-foreground shadow-card">
      <Icon className="h-8 w-8" />
    </div>
    <p className="section-kicker text-[10px]">Sem registros por aqui</p>
    <h3 className="mt-3 font-display text-3xl text-foreground">{title}</h3>
    <p className="mt-3 max-w-md text-sm leading-8 text-muted-foreground sm:text-[15px]">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="mt-6 rounded-2xl bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card hover:scale-[1.01]"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;

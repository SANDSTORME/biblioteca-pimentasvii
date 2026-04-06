import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, className }) => (
  <div
    className={cn(
      'glass-panel interactive-panel hover-lift panel-sheen group relative overflow-hidden rounded-[1.4rem] p-4 shadow-card animate-card-enter sm:rounded-[1.6rem] sm:p-5',
      className,
    )}
  >
    <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-warm-gold/40 to-transparent" />
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="section-kicker text-[11px]">Visão rápida</p>
        <p className="mt-3 font-display text-3xl leading-none text-foreground sm:mt-4 sm:text-4xl">{value}</p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[15px]">{label}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3 sm:h-12 sm:w-12">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
    </div>
  </div>
);

export default StatCard;

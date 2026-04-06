import React from 'react';
import { SCHOOL_CLASS_GROUPS } from '@/lib/schoolClasses';
import { cn } from '@/lib/utils';

interface SchoolClassSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  groups?: Array<{ label: string; classes: string[] }>;
}

const defaultSelectClassName =
  'w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

const SchoolClassSelect: React.FC<SchoolClassSelectProps> = ({
  value,
  onChange,
  placeholder = 'Selecione a turma',
  groups = SCHOOL_CLASS_GROUPS,
  className,
  ...props
}) => (
  <select
    {...props}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className={cn(defaultSelectClassName, className)}
  >
    <option value="">{placeholder}</option>
    {groups.map((group) => (
      <optgroup key={group.label} label={group.label}>
        {group.classes.map((schoolClass) => (
          <option key={schoolClass} value={schoolClass}>
            {schoolClass}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
);

export default SchoolClassSelect;

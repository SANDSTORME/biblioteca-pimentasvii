export interface SchoolClassGroup {
  label: string;
  classes: string[];
}

const buildClasses = (prefix: string, sections: string[]) => sections.map((section) => `${prefix} ${section}`);

export const SCHOOL_CLASS_GROUPS: SchoolClassGroup[] = [
  { label: '6º ano', classes: buildClasses('6º', ['A', 'B', 'C']) },
  { label: '7º ano', classes: buildClasses('7º', ['A', 'B', 'C', 'D', 'E']) },
  { label: '8º ano', classes: buildClasses('8º', ['A', 'B', 'C', 'D', 'E', 'F']) },
  { label: '9º ano', classes: buildClasses('9º', ['A', 'B', 'C', 'D']) },
  { label: '1º ano do Ensino Médio', classes: buildClasses('1º EM', ['A', 'B', 'C', 'D', 'E']) },
  { label: '2º ano do Ensino Médio', classes: buildClasses('2º EM', ['A', 'B', 'C', 'D']) },
  { label: '3º ano do Ensino Médio', classes: buildClasses('3º EM', ['A', 'B', 'C']) },
];

export const SCHOOL_CLASSES = SCHOOL_CLASS_GROUPS.flatMap((group) => group.classes);

const SCHOOL_CLASS_LOOKUP = new Map(
  SCHOOL_CLASSES.map((schoolClass) => [
    schoolClass
      .normalize('NFKC')
      .toUpperCase()
      .replace(/[.\-_/\\]/g, ' ')
      .replace(/\s+/g, ''),
    schoolClass,
  ]),
);

export const coerceSchoolClass = (value?: string | null) => {
  if (!value?.trim()) {
    return null;
  }

  const normalizedValue = value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[.\-_/\\]/g, ' ')
    .replace(/\s+/g, '');

  return SCHOOL_CLASS_LOOKUP.get(normalizedValue) ?? null;
};

export const isValidSchoolClass = (value?: string | null) => Boolean(coerceSchoolClass(value));

export const normalizeSchoolClassList = (values: string[]) => {
  const normalized: string[] = [];

  for (const value of values) {
    const schoolClass = coerceSchoolClass(value);
    if (schoolClass && !normalized.includes(schoolClass)) {
      normalized.push(schoolClass);
    }
  }

  return normalized;
};

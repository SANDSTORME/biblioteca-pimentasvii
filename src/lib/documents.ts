import { LibraryDocument } from '@/types';

export const documentCategoryLabel: Record<LibraryDocument['categoria'], string> = {
  regulamento: 'Regulamento',
  lista_leitura: 'Lista de leitura',
  orientacao: 'Orientação',
  material_pedagogico: 'Material pedagógico',
  comunicado: 'Comunicado',
};

export const documentAudienceLabel: Record<LibraryDocument['publico'], string> = {
  todos: 'Toda a escola',
  alunos: 'Somente alunos',
  professores: 'Somente professores',
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

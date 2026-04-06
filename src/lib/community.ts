import { BookReview, LibraryNotice } from '@/types';

export const noticeCategoryLabel: Record<LibraryNotice['categoria'], string> = {
  comunicado: 'Comunicado',
  evento: 'Evento',
  prazo: 'Prazo',
  destaque: 'Destaque',
};

export const noticeAudienceLabel: Record<LibraryNotice['publico'], string> = {
  todos: 'Toda a escola',
  alunos: 'Somente alunos',
  professores: 'Somente professores',
};

export const getBookReviewAverage = (reviews: BookReview[]) => {
  if (reviews.length === 0) {
    return 0;
  }

  const total = reviews.reduce((sum, review) => sum + review.nota, 0);
  return total / reviews.length;
};

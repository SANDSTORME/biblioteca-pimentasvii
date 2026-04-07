import { BookReview, FavoriteBook, LibraryNotice } from '@/types';

export const mockFavorites: FavoriteBook[] = [
  { id: 'favorite-1', usuarioId: '1', livroId: '1', criadoEm: '2025-03-19' },
  { id: 'favorite-2', usuarioId: '1', livroId: '7', criadoEm: '2025-03-22' },
];

export const mockReviews: BookReview[] = [
  {
    id: 'review-1',
    livroId: '2',
    usuarioId: '2',
    nota: 5,
    comentario: 'A leitura prende do começo ao fim e ajuda muito nas discussões sobre narrador e interpretação.',
    criadoEm: '2025-03-13',
  },
];

export const mockNotices: LibraryNotice[] = [
  {
    id: 'notice-1',
    titulo: 'Feira de leitura na próxima semana',
    mensagem: 'A biblioteca vai montar uma mostra de livros indicados por turma. Professores podem reforçar sugestões pelo painel.',
    categoria: 'evento',
    publico: 'todos',
    ativo: true,
    destaque: true,
    criadoEm: '2025-03-21',
    criadoPorId: '6',
  },
  {
    id: 'notice-2',
    titulo: 'Devoluções do bimestre',
    mensagem: 'Alunos com empréstimos ativos devem conferir o prazo previsto antes do fechamento do bimestre.',
    categoria: 'prazo',
    publico: 'alunos',
    ativo: true,
    destaque: false,
    criadoEm: '2025-03-24',
    criadoPorId: '6',
  },
  {
    id: 'notice-3',
    titulo: 'Curadoria de romances brasileiros',
    mensagem: 'A equipe separou leituras essenciais para rodas de conversa e atividades interdisciplinares.',
    categoria: 'destaque',
    publico: 'professores',
    ativo: true,
    destaque: false,
    criadoEm: '2025-03-25',
    criadoPorId: '6',
  },
];

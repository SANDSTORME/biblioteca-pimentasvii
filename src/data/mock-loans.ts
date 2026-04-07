import { Loan, SupportTicket, TeacherSuggestion, TeacherToken } from '@/types';

export const mockLoans: Loan[] = [
  { id: '1', livroId: '1', alunoId: '1', token: 'EMP-2025-0001', status: 'aprovado', dataPedido: '2025-03-10', dataDevolucaoPrevista: '2025-03-24' },
  { id: '2', livroId: '3', alunoId: '1', token: 'EMP-2025-0002', status: 'pendente', dataPedido: '2025-03-20' },
  { id: '3', livroId: '2', alunoId: '2', token: 'EMP-2025-0003', status: 'devolvido', dataPedido: '2025-02-28', dataDevolucaoPrevista: '2025-03-14', dataDevolucao: '2025-03-12' },
  { id: '4', livroId: '5', alunoId: '3', token: 'EMP-2025-0004', status: 'recusado', dataPedido: '2025-03-18', observacao: 'Aluno com empréstimo pendente' },
];

export const mockSuggestions: TeacherSuggestion[] = [
  { id: '1', professorId: '4', livroId: '1', turma: '8º A', mensagem: 'Leitura recomendada para o projeto de redação sobre valores humanos.', criadoEm: '2025-03-15' },
  { id: '2', professorId: '5', livroId: '4', turma: '9º A', mensagem: 'Material complementar para a aula de história sobre a Segunda Guerra Mundial.', criadoEm: '2025-03-18' },
];

export const mockTickets: SupportTicket[] = [
  { id: '1', usuarioId: '1', assunto: 'Livro com páginas faltando', mensagem: 'O exemplar de O Pequeno Príncipe que recebi está com as páginas 45 a 52 faltando.', status: 'aberto', criadoEm: '2025-03-19' },
  { id: '2', usuarioId: '2', assunto: 'Prazo de devolução', mensagem: 'Preciso de mais tempo para devolver o livro, pois estou doente.', status: 'resolvido', resposta: 'Prazo estendido por mais 7 dias. Melhoras!', criadoEm: '2025-03-10' },
];

export const mockTeacherTokens: TeacherToken[] = [
  {
    id: '1',
    token: 'PROF-2025-A1B2',
    descricao: 'Token para professores do Fundamental II',
    turmasPermitidas: ['6º A', '6º B', '6º C', '7º A', '7º B', '7º C', '7º D', '7º E', '8º A', '8º B', '8º C', '8º D', '8º E', '8º F', '9º A', '9º B', '9º C', '9º D'],
    usado: true,
    usadoPorId: '4',
    criadoEm: '2025-01-15',
  },
  {
    id: '2',
    token: 'PROF-2025-C3D4',
    descricao: 'Token para professores do Ensino Médio',
    turmasPermitidas: ['1º EM A', '1º EM B', '1º EM C', '1º EM D', '1º EM E', '2º EM A', '2º EM B', '2º EM C', '2º EM D', '3º EM A', '3º EM B', '3º EM C'],
    usado: false,
    criadoEm: '2025-02-01',
  },
];

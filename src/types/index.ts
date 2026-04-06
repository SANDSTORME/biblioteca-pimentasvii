export type UserRole = 'aluno' | 'professor' | 'admin';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  senha?: string;
  turma?: string;
  tokenProfessorId?: string;
  ultimoAcesso?: string;
  criadoEm: string;
  emailConfirmado?: boolean;
  emailConfirmadoEm?: string;
}

export type BookCoverSource = 'url' | 'upload';

export interface Book {
  id: string;
  numeroTombo: string;
  titulo: string;
  autor: string;
  categoria: string;
  quantidade: number;
  quantidadeDisponivel: number;
  classificacao: number;
  faixaEscolar: string;
  diasLeitura: number;
  descricao: string;
  capa: string;
  capaTipo?: BookCoverSource;
  capaArquivoNome?: string;
}

export type LoanStatusBase = 'pendente' | 'aprovado' | 'recusado' | 'devolvido';
export type LoanStatus = LoanStatusBase | 'atrasado';

export interface Loan {
  id: string;
  livroId: string;
  alunoId: string;
  token: string;
  status: LoanStatus;
  statusBase?: LoanStatusBase;
  estaAtrasado?: boolean;
  diasAtraso?: number;
  dataPedido: string;
  dataDevolucaoPrevista?: string;
  dataDevolucao?: string;
  observacao?: string;
}

export interface TeacherSuggestion {
  id: string;
  professorId: string;
  livroId: string;
  turma: string;
  mensagem: string;
  criadoEm: string;
}

export interface SupportTicket {
  id: string;
  usuarioId: string;
  assunto: string;
  mensagem: string;
  status: 'aberto' | 'em_andamento' | 'resolvido';
  resposta?: string;
  criadoEm: string;
}

export interface TeacherToken {
  id: string;
  token: string;
  descricao: string;
  turmasPermitidas: string[];
  usado: boolean;
  usadoPorId?: string;
  criadoEm: string;
}

export interface ReadingPermission {
  id: string;
  alunoId: string;
  livroId: string;
  permitido: boolean;
  observacao?: string;
  criadoEm: string;
  atualizadoEm: string;
  criadoPorId?: string;
}

export interface FavoriteBook {
  id: string;
  usuarioId: string;
  livroId: string;
  criadoEm: string;
}

export interface BookReview {
  id: string;
  livroId: string;
  usuarioId: string;
  nota: 1 | 2 | 3 | 4 | 5;
  comentario: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export type NoticeCategory = 'comunicado' | 'evento' | 'prazo' | 'destaque';
export type NoticeAudience = 'todos' | 'alunos' | 'professores';

export interface LibraryNotice {
  id: string;
  titulo: string;
  mensagem: string;
  categoria: NoticeCategory;
  publico: NoticeAudience;
  ativo: boolean;
  destaque: boolean;
  criadoEm: string;
  criadoPorId?: string;
}

export type DocumentCategory =
  | 'regulamento'
  | 'lista_leitura'
  | 'orientacao'
  | 'material_pedagogico'
  | 'comunicado';

export type DocumentAudience = 'todos' | 'alunos' | 'professores';

export interface LibraryDocument {
  id: string;
  titulo: string;
  descricao: string;
  categoria: DocumentCategory;
  publico: DocumentAudience;
  arquivoUrl: string;
  arquivoNome: string;
  arquivoMime: string;
  arquivoTamanho: number;
  ativo: boolean;
  destaque: boolean;
  criadoEm: string;
  atualizadoEm: string;
  criadoPorId?: string;
}

export type AuditAction =
  | 'livro_criado'
  | 'livro_editado'
  | 'livro_excluido'
  | 'usuario_criado'
  | 'usuario_alterado'
  | 'emprestimo_aprovado'
  | 'emprestimo_recusado'
  | 'emprestimo_devolvido'
  | 'aviso_criado'
  | 'permissao_alterada'
  | 'token_professor_gerado'
  | 'token_professor_utilizado'
  | 'documento_criado'
  | 'documento_editado'
  | 'documento_excluido'
  | 'senha_redefinida';

export interface AuditLog {
  id: string;
  acao: AuditAction;
  categoria: 'acervo' | 'usuarios' | 'emprestimos' | 'avisos' | 'permissoes' | 'tokens' | 'documentos' | 'seguranca';
  descricao: string;
  atorId?: string;
  atorNome?: string;
  atorRole?: UserRole;
  alvoTipo: 'livro' | 'usuario' | 'emprestimo' | 'aviso' | 'permissao' | 'token_professor' | 'documento' | 'seguranca';
  alvoId?: string;
  detalhes?: Record<string, unknown>;
  criadoEm: string;
}

export interface RankingBookReportItem {
  livroId: string;
  titulo: string;
  autor: string;
  categoria: string;
  totalEmprestimos: number;
  quantidadeDisponivel: number;
  quantidadeTotal: number;
  mediaAvaliacoes: number;
}

export interface RankingStudentReportItem {
  alunoId: string;
  nome: string;
  turma?: string;
  totalEmprestimos: number;
  totalDevolvidos: number;
  atrasosAtuais: number;
}

export interface LoanReportItem {
  emprestimoId: string;
  token: string;
  status: LoanStatus;
  alunoNome: string;
  alunoTurma?: string;
  livroTitulo: string;
  dataPedido: string;
  dataDevolucaoPrevista?: string;
  dataDevolucao?: string;
  diasAtraso?: number;
}

export interface LibraryReports {
  geradoEm: string;
  resumo: {
    livrosCadastrados: number;
    exemplaresDisponiveis: number;
    emprestimosAtivos: number;
    emprestimosAtrasados: number;
    emprestimosDevolvidos: number;
    livrosIndisponiveis: number;
    alunosAtivos: number;
    professoresAtivos: number;
    mediaAvaliacoes: number;
  };
  livrosMaisEmprestados: RankingBookReportItem[];
  alunosMaisAtivos: RankingStudentReportItem[];
  emprestimosEmAndamento: LoanReportItem[];
  emprestimosDevolvidos: LoanReportItem[];
  livrosIndisponiveis: RankingBookReportItem[];
  atrasos: LoanReportItem[];
}

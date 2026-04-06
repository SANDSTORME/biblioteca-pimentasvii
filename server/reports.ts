import { LibraryReports, LoanReportItem } from '../src/types';
import { readBooks, readLoans, readReviews, readUsers, serializeBook, serializeLoan, serializeReview, serializeUser } from './db';

const round = (value: number) => Math.round(value * 10) / 10;

export const getAdminReports = async (): Promise<LibraryReports> => {
  const [bookRows, loanRows, reviewRows, userRows] = await Promise.all([readBooks(), readLoans(), readReviews(), readUsers()]);

  const books = bookRows.map(serializeBook);
  const loans = loanRows.map(serializeLoan);
  const reviews = reviewRows.map(serializeReview);
  const users = userRows.map(serializeUser);

  const reviewMap = new Map<string, number[]>();
  const bookLoanMap = new Map<string, typeof loans>();
  const studentLoanMap = new Map<string, typeof loans>();

  for (const review of reviews) {
    const bucket = reviewMap.get(review.livroId) ?? [];
    bucket.push(review.nota);
    reviewMap.set(review.livroId, bucket);
  }

  for (const loan of loans) {
    const bookLoans = bookLoanMap.get(loan.livroId) ?? [];
    bookLoans.push(loan);
    bookLoanMap.set(loan.livroId, bookLoans);

    const studentLoans = studentLoanMap.get(loan.alunoId) ?? [];
    studentLoans.push(loan);
    studentLoanMap.set(loan.alunoId, studentLoans);
  }

  const toLoanReportItem = (loan: (typeof loans)[number]): LoanReportItem => {
    const student = users.find((entry) => entry.id === loan.alunoId);
    const book = books.find((entry) => entry.id === loan.livroId);

    return {
      emprestimoId: loan.id,
      token: loan.token,
      status: loan.status,
      alunoNome: student?.nome ?? 'Aluno não identificado',
      alunoTurma: student?.turma,
      livroTitulo: book?.titulo ?? 'Livro não identificado',
      dataPedido: loan.dataPedido,
      dataDevolucaoPrevista: loan.dataDevolucaoPrevista,
      dataDevolucao: loan.dataDevolucao,
      diasAtraso: loan.diasAtraso,
    };
  };

  const livrosComEstatisticas = books
    .map((book) => {
      const relatedLoans = (bookLoanMap.get(book.id) ?? []).filter((loan) => loan.status !== 'recusado' && loan.status !== 'pendente');
      const notas = reviewMap.get(book.id) ?? [];

      return {
        livroId: book.id,
        titulo: book.titulo,
        autor: book.autor,
        categoria: book.categoria,
        totalEmprestimos: relatedLoans.length,
        quantidadeDisponivel: book.quantidadeDisponivel,
        quantidadeTotal: book.quantidade,
        mediaAvaliacoes: notas.length ? round(notas.reduce((sum, nota) => sum + nota, 0) / notas.length) : 0,
      };
    })
    .sort((left, right) => right.totalEmprestimos - left.totalEmprestimos || left.titulo.localeCompare(right.titulo));

  const livrosMaisEmprestados = livrosComEstatisticas.slice(0, 8);

  const alunosMaisAtivos = users
    .filter((user) => user.role === 'aluno' && user.ativo)
    .map((student) => {
      const relatedLoans = (studentLoanMap.get(student.id) ?? []).filter((loan) => loan.status !== 'recusado');
      return {
        alunoId: student.id,
        nome: student.nome,
        turma: student.turma,
        totalEmprestimos: relatedLoans.length,
        totalDevolvidos: relatedLoans.filter((loan) => loan.status === 'devolvido').length,
        atrasosAtuais: relatedLoans.filter((loan) => loan.status === 'atrasado').length,
      };
    })
    .sort(
      (left, right) =>
        right.totalEmprestimos - left.totalEmprestimos ||
        right.totalDevolvidos - left.totalDevolvidos ||
        left.nome.localeCompare(right.nome),
    )
    .slice(0, 8);

  const emprestimosEmAndamento = loans
    .filter((loan) => loan.status === 'aprovado' || loan.status === 'atrasado')
    .map(toLoanReportItem)
    .sort((left, right) => (right.diasAtraso ?? 0) - (left.diasAtraso ?? 0) || right.dataPedido.localeCompare(left.dataPedido));

  const emprestimosDevolvidos = loans
    .filter((loan) => loan.status === 'devolvido')
    .map(toLoanReportItem)
    .sort((left, right) => (right.dataDevolucao ?? '').localeCompare(left.dataDevolucao ?? ''));

  const livrosIndisponiveis = livrosComEstatisticas.filter((book) => book.quantidadeDisponivel === 0);
  const atrasos = emprestimosEmAndamento.filter((loan) => loan.status === 'atrasado');
  const notasGerais = reviews.map((review) => review.nota);

  return {
    geradoEm: new Date().toISOString(),
    resumo: {
      livrosCadastrados: books.length,
      exemplaresDisponiveis: books.reduce((sum, book) => sum + book.quantidadeDisponivel, 0),
      emprestimosAtivos: emprestimosEmAndamento.length,
      emprestimosAtrasados: atrasos.length,
      emprestimosDevolvidos: emprestimosDevolvidos.length,
      livrosIndisponiveis: livrosIndisponiveis.length,
      alunosAtivos: users.filter((user) => user.role === 'aluno' && user.ativo).length,
      professoresAtivos: users.filter((user) => user.role === 'professor' && user.ativo).length,
      mediaAvaliacoes: notasGerais.length ? round(notasGerais.reduce((sum, nota) => sum + nota, 0) / notasGerais.length) : 0,
    },
    livrosMaisEmprestados,
    alunosMaisAtivos,
    emprestimosEmAndamento,
    emprestimosDevolvidos,
    livrosIndisponiveis,
    atrasos,
  };
};

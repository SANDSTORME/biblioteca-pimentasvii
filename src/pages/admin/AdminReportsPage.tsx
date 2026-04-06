import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileOutput, RefreshCcw, TimerReset } from 'lucide-react';
import { LibraryReports } from '@/types';
import { getAdminReportsRequest } from '@/services/api';

const buildCsv = (reports: LibraryReports) => {
  const lines: string[] = [];
  lines.push('Resumo');
  lines.push('Indicador,Valor');
  Object.entries(reports.resumo).forEach(([key, value]) => {
    lines.push(`${key},${value}`);
  });

  lines.push('');
  lines.push('Livros mais emprestados');
  lines.push('Título,Autor,Categoria,Total de empréstimos,Disponíveis,Total,Media de avaliações');
  reports.livrosMaisEmprestados.forEach((item) => {
    lines.push(
      `"${item.titulo}","${item.autor}","${item.categoria}",${item.totalEmprestimos},${item.quantidadeDisponivel},${item.quantidadeTotal},${item.mediaAvaliacoes}`,
    );
  });

  lines.push('');
  lines.push('Alunos mais ativos');
  lines.push('Nome,Turma,Total de empréstimos,Devolvidos,Atrasos atuais');
  reports.alunosMaisAtivos.forEach((item) => {
    lines.push(`"${item.nome}","${item.turma ?? ''}",${item.totalEmprestimos},${item.totalDevolvidos},${item.atrasosAtuais}`);
  });

  lines.push('');
  lines.push('Atrasos');
  lines.push('Token,Aluno,Livro,Status,Data do pedido,Previsão,Data de devolução,Dias de atraso');
  reports.atrasos.forEach((item) => {
    lines.push(
      `"${item.token}","${item.alunoNome}","${item.livroTitulo}","${item.status}","${item.dataPedido}","${item.dataDevolucaoPrevista ?? ''}","${item.dataDevolucao ?? ''}",${item.diasAtraso ?? 0}`,
    );
  });

  return lines.join('\n');
};

const downloadBlob = (filename: string, content: BlobPart, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<LibraryReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setReports(await getAdminReportsRequest());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os relatórios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchReports();
  }, []);

  const topBarScale = useMemo(
    () => Math.max(1, ...(reports?.livrosMaisEmprestados.map((item) => item.totalEmprestimos) ?? [1])),
    [reports],
  );

  const handleExportCsv = () => {
    if (!reports) {
      return;
    }

    downloadBlob(
      `relatorios-biblioteca-pimentas-vii-${reports.geradoEm.slice(0, 10)}.csv`,
      buildCsv(reports),
      'text/csv;charset=utf-8',
    );
  };

  const handleExportPdf = () => {
    if (!reports) {
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900');
    if (!printWindow) {
      return;
    }

    const html = `
      <html lang="pt-BR">
        <head>
          <title>Relatórios - Biblioteca Pimentas VII</title>
          <style>
            body { font-family: Georgia, serif; padding: 32px; color: #172229; }
            h1, h2 { margin: 0 0 12px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #d8d1bf; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f3ead5; }
            .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
            .card { border: 1px solid #d8d1bf; border-radius: 16px; padding: 16px; }
          </style>
        </head>
        <body>
          <h1>Biblioteca Pimentas VII</h1>
          <p>Relatório gerado em ${reports.geradoEm}</p>
          <div class="grid">
            ${Object.entries(reports.resumo)
              .map(
                ([label, value]) =>
                  `<div class="card"><strong>${label}</strong><div style="font-size: 24px; margin-top: 8px;">${value}</div></div>`,
              )
              .join('')}
          </div>
          <h2>Livros mais emprestados</h2>
          <table>
            <thead><tr><th>Título</th><th>Autor</th><th>Total</th><th>Disponíveis</th></tr></thead>
            <tbody>
              ${reports.livrosMaisEmprestados
                .map(
                  (item) =>
                    `<tr><td>${item.titulo}</td><td>${item.autor}</td><td>${item.totalEmprestimos}</td><td>${item.quantidadeDisponivel}/${item.quantidadeTotal}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
          <h2>Atrasos</h2>
          <table>
            <thead><tr><th>Token</th><th>Aluno</th><th>Livro</th><th>Dias</th></tr></thead>
            <tbody>
              ${reports.atrasos
                .map(
                  (item) =>
                    `<tr><td>${item.token}</td><td>${item.alunoNome}</td><td>${item.livroTitulo}</td><td>${item.diasAtraso ?? 0}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="max-w-6xl space-y-5 animate-page-enter sm:space-y-6">
      <div className="glass-panel panel-sheen rounded-[1.55rem] p-5 sm:rounded-[1.85rem] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="section-kicker">Relatórios escolares</p>
            <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Números prontos para apresentação</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Acompanhe engajamento, circulação do acervo, atrasos e disponibilidade com indicadores organizados para
              uso pedagógico e institucional.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void fetchReports()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm font-medium text-foreground"
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!reports}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!reports}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-warm-gold/25 bg-warm-gold/10 px-4 py-3 text-sm font-semibold text-warm-gold disabled:opacity-60"
            >
              <FileOutput className="h-4 w-4" />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-[1.35rem] border border-destructive/20 bg-destructive/10 p-4 text-sm text-foreground">{error}</div>}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="glass-panel h-36 animate-pulse rounded-[1.45rem]" />
          ))}
        </div>
      ) : reports ? (
        <>
          <div className="stagger-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Empréstimos ativos', reports.resumo.emprestimosAtivos],
              ['Atrasos atuais', reports.resumo.emprestimosAtrasados],
              ['Livros indisponíveis', reports.resumo.livrosIndisponiveis],
              ['Média de avaliações', reports.resumo.mediaAvaliacoes],
              ['Alunos ativos', reports.resumo.alunosAtivos],
              ['Professores ativos', reports.resumo.professoresAtivos],
              ['Devolvidos', reports.resumo.emprestimosDevolvidos],
              ['Exemplares livres', reports.resumo.exemplaresDisponiveis],
            ].map(([label, value]) => (
              <div key={label} className="glass-panel interactive-panel hover-lift rounded-[1.45rem] p-5 shadow-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
                <p className="mt-4 font-display text-4xl text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-3xl text-foreground">Livros mais emprestados</h2>
                  <p className="text-sm leading-7 text-muted-foreground">Leituras com maior circulação no período disponível.</p>
                </div>
              </div>

              <div className="space-y-4">
                {reports.livrosMaisEmprestados.map((item) => (
                  <div key={item.livroId} className="rounded-[1.3rem] border border-border/70 bg-card/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">{item.titulo}</p>
                        <p className="text-sm text-muted-foreground">{item.autor}</p>
                      </div>
                      <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                        {item.totalEmprestimos} empréstimos
                      </span>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-background/80">
                      <div
                        className="h-full rounded-full bg-gradient-gold"
                        style={{ width: `${Math.max(10, (item.totalEmprestimos / topBarScale) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                        {item.quantidadeDisponivel}/{item.quantidadeTotal} disponíveis
                      </span>
                      <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                        Média {item.mediaAvaliacoes}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-olive text-primary-foreground shadow-card">
                  <TimerReset className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-3xl text-foreground">Atrasos em foco</h2>
                  <p className="text-sm leading-7 text-muted-foreground">Empresta um panorama imediato para ação da equipe.</p>
                </div>
              </div>

              <div className="space-y-3">
                {reports.atrasos.length === 0 ? (
                  <div className="rounded-[1.3rem] border border-dashed border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">
                    Nenhum atraso em aberto no momento.
                  </div>
                ) : (
                  reports.atrasos.map((item) => (
                    <div key={item.emprestimoId} className="rounded-[1.3rem] border border-destructive/20 bg-destructive/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.alunoNome}</p>
                          <p className="text-sm text-muted-foreground">{item.livroTitulo}</p>
                        </div>
                        <span className="rounded-full bg-destructive px-3 py-1 text-[11px] font-semibold text-destructive-foreground">
                          {item.diasAtraso ?? 0} dia(s)
                        </span>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Token {item.token} • previsão {item.dataDevolucaoPrevista}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:p-6">
              <h2 className="font-display text-3xl text-foreground">Alunos mais ativos</h2>
              <div className="mt-5 space-y-3">
                {reports.alunosMaisAtivos.map((item) => (
                  <div key={item.alunoId} className="rounded-[1.3rem] border border-border/70 bg-card/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.nome}</p>
                        <p className="text-sm text-muted-foreground">{item.turma || 'Sem turma informada'}</p>
                      </div>
                      <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                        {item.totalEmprestimos} empréstimos
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                        {item.totalDevolvidos} devolvidos
                      </span>
                      <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                        {item.atrasosAtuais} atrasos atuais
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-[1.55rem] p-5 shadow-card sm:p-6">
              <h2 className="font-display text-3xl text-foreground">Em andamento</h2>
              <div className="mt-5 space-y-3">
                {reports.emprestimosEmAndamento.slice(0, 8).map((item) => (
                  <div key={item.emprestimoId} className="rounded-[1.3rem] border border-border/70 bg-card/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.livroTitulo}</p>
                        <p className="text-sm text-muted-foreground">{item.alunoNome}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          item.status === 'atrasado'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Pedido {item.dataPedido} • previsão {item.dataDevolucaoPrevista}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminReportsPage;

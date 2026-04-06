import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useLibrary } from '@/contexts/LibraryContext';
import { SCHOOL_CLASS_GROUPS } from '@/lib/schoolClasses';

// Gestão de tokens que liberam o cadastro de professores no sistema.
const AdminTokensPage: React.FC = () => {
  const { createTeacherToken, teacherTokens, toggleTeacherToken, users } = useLibrary();
  const [showForm, setShowForm] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [turmas, setTurmas] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggleTurma = (schoolClass: string) => {
    setTurmas((current) =>
      current.includes(schoolClass)
        ? current.filter((item) => item !== schoolClass)
        : [...current, schoolClass],
    );
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = await createTeacherToken(descricao, turmas);

    setFeedback(result.token ? `${result.message} ${result.token}` : result.message);
    if (result.success) {
      setDescricao('');
      setTurmas([]);
      setShowForm(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="glass-panel flex-1 rounded-[1.7rem] p-5 sm:rounded-[1.8rem] sm:p-6">
          <p className="section-kicker">Acesso docente</p>
          <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Tokens de professor</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Crie e gerencie tokens de acesso usados no cadastro de professores, com controle por turma e status de uso.
          </p>
        </div>

        <button
          onClick={() => setShowForm((current) => !current)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-transform hover:scale-[1.01] sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Novo token
        </button>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm font-medium text-primary animate-fade-in">
          <Check className="h-4 w-4" />
          {feedback}
        </div>
      )}

      {showForm && (
        <div className="glass-panel animate-fade-in rounded-[1.7rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <input
                type="text"
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex.: Token para professores do Fundamental II"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Turmas permitidas</label>
              <div className="mt-2 space-y-3 rounded-[1.2rem] border border-border bg-muted/40 p-4">
                {SCHOOL_CLASS_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.classes.map((schoolClass) => {
                        const selected = turmas.includes(schoolClass);
                        return (
                          <button
                            key={schoolClass}
                            type="button"
                            onClick={() => toggleTurma(schoolClass)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card/80 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                            }`}
                          >
                            {schoolClass}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {turmas.length > 0 ? `${turmas.length} turma(s) selecionada(s).` : 'Selecione ao menos uma turma.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row">
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Criar token
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {teacherTokens.map((token) => {
          const owner = token.usadoPorId ? users.find((entry) => entry.id === token.usadoPorId) : null;

          return (
            <div key={token.id} className="glass-panel rounded-[1.7rem] p-5 shadow-card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-all font-mono text-lg font-bold text-foreground">{token.token}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{token.descricao}</p>
                  <p className="mt-3 rounded-[1rem] border border-border/70 bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                    Turmas: {token.turmasPermitidas.join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground">Criado em {token.criadoEm}</p>
                  {owner && <p className="text-xs text-muted-foreground">Utilizado por {owner.nome}</p>}
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      token.usado ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {token.usado ? 'Indisponível' : 'Disponível'}
                  </span>

                  {!token.usadoPorId && (
                    <button
                      onClick={async () => {
                        const result = await toggleTeacherToken(token.id);
                        setFeedback(result.message);
                      }}
                      className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-xs font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      {token.usado ? 'Reativar' : 'Desativar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminTokensPage;

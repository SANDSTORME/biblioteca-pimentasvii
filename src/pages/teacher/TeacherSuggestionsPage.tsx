import React, { useMemo, useState } from 'react';
import { Check, ClipboardList, Send } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import SchoolClassSelect from '@/components/shared/SchoolClassSelect';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { SCHOOL_CLASS_GROUPS } from '@/lib/schoolClasses';

// Tela onde o professor envia sugestões de leitura para as turmas.
const TeacherSuggestionsPage: React.FC = () => {
  const { user } = useAuth();
  const { books, createSuggestion, suggestions, teacherTokens } = useLibrary();
  const mySuggestions = suggestions
    .filter((suggestion) => suggestion.professorId === user?.id)
    .sort((left, right) => right.criadoEm.localeCompare(left.criadoEm));

  const [showForm, setShowForm] = useState(false);
  const [livroId, setLivroId] = useState('');
  const [turma, setTurma] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const classesCovered = new Set(mySuggestions.map((suggestion) => suggestion.turma)).size;
  const allowedClasses = useMemo(() => {
    const tokenClasses = teacherTokens.find((token) => token.id === user?.tokenProfessorId)?.turmasPermitidas ?? [];
    return tokenClasses.length ? tokenClasses : SCHOOL_CLASS_GROUPS.flatMap((group) => group.classes);
  }, [teacherTokens, user?.tokenProfessorId]);

  const availableGroups = useMemo(
    () =>
      SCHOOL_CLASS_GROUPS.map((group) => ({
        label: group.label,
        classes: group.classes.filter((schoolClass) => allowedClasses.includes(schoolClass)),
      })).filter((group) => group.classes.length > 0),
    [allowedClasses],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    const result = await createSuggestion({
      livroId,
      turma,
      mensagem,
    });

    setFeedback(result.message);
    if (result.success) {
      setLivroId('');
      setTurma('');
      setMensagem('');
      setShowForm(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="glass-panel flex-1 rounded-[1.7rem] p-5 sm:rounded-[1.8rem] sm:p-6">
          <p className="section-kicker">Curadoria pedagógica</p>
          <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Sugestões de leitura</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Envie recomendações com contexto pedagógico, organize por turma e mantenha um histórico claro das
            orientações.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              {mySuggestions.length} sugestão(ões)
            </span>
            <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              {classesCovered || 0} turma(s)
            </span>
          </div>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-transform hover:scale-[1.01] sm:w-auto"
          >
            Nova sugestão
          </button>
        )}
      </div>

      {feedback && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm text-primary font-medium animate-fade-in flex items-center gap-2">
          <Check className="w-4 h-4" />
          {feedback}
        </div>
      )}

      {showForm && (
        <div className="glass-panel animate-fade-in rounded-[1.7rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <h2 className="font-display text-2xl text-foreground sm:col-span-2">Nova sugestão</h2>

            <div>
              <label className="text-sm font-medium text-foreground">Livro</label>
              <select
                value={livroId}
                onChange={(event) => setLivroId(event.target.value)}
                required
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione um livro</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.titulo} - {book.autor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Turma</label>
              <SchoolClassSelect
                value={turma}
                onChange={setTurma}
                groups={availableGroups}
                required
                className="mt-1"
                placeholder="Selecione a turma"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground">Mensagem para a turma</label>
              <textarea
                value={mensagem}
                onChange={(event) => setMensagem(event.target.value)}
                required
                rows={4}
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Send className="w-4 h-4" /> Enviar
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {mySuggestions.length === 0 && !showForm ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma sugestão enviada"
          description="Monte a primeira recomendação e compartilhe o contexto da leitura com a turma."
          action={{ label: 'Criar sugestão', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="space-y-3">
          {mySuggestions.map((suggestion) => {
            const book = books.find((entry) => entry.id === suggestion.livroId);

            return (
              <div key={suggestion.id} className="glass-panel rounded-[1.7rem] p-5 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{book?.titulo}</p>
                    <p className="text-xs text-muted-foreground">Turma {suggestion.turma} • {suggestion.criadoEm}</p>
                  </div>
                  <span className="w-fit rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Curadoria enviada
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{suggestion.mensagem}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherSuggestionsPage;

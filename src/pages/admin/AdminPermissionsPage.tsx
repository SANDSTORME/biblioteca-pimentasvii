import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';

// Controle fino para permitir ou bloquear leituras por aluno e por livro.
const AdminPermissionsPage: React.FC = () => {
  const { user } = useAuth();
  const { books, permissions, savePermission, users } = useLibrary();
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [allowed, setAllowed] = useState(true);
  const [obs, setObs] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const students = users.filter((entry) => entry.role === 'aluno');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = await savePermission({
      alunoId: selectedStudent,
      livroId: selectedBook,
      permitido: allowed,
      observacao: obs,
      criadoPorId: user?.id,
    });

    setFeedback(result.message);
    if (result.success) {
      setSelectedStudent('');
      setSelectedBook('');
      setObs('');
      setAllowed(true);
    }
  };

  return (
    <div className="max-w-5xl space-y-5 sm:space-y-6">
      <div className="glass-panel rounded-[1.7rem] p-5 sm:rounded-[1.8rem] sm:p-6">
        <p className="section-kicker">Leitura supervisionada</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Permissões de leitura</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Controle quais alunos podem acessar leituras específicas e registre observações para orientar a biblioteca.
        </p>
      </div>

      {feedback && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm text-primary font-medium animate-fade-in">
          {feedback}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel rounded-[1.7rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Aluno</label>
              <select
                value={selectedStudent}
                onChange={(event) => setSelectedStudent(event.target.value)}
                required
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione um aluno</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.nome} - {student.turma}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Livro</label>
              <select
                value={selectedBook}
                onChange={(event) => setSelectedBook(event.target.value)}
                required
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione um livro</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Ação</label>
              <div className="mt-1 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAllowed(true)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    allowed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Permitir
                </button>
                <button
                  type="button"
                  onClick={() => setAllowed(false)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    !allowed ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Bloquear
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Observação</label>
              <textarea
                value={obs}
                onChange={(event) => setObs(event.target.value)}
                rows={3}
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 sm:w-auto"
            >
              Salvar permissão
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-[1.7rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
          <h2 className="mb-4 font-display text-2xl text-foreground">Permissões registradas</h2>
          <div className="space-y-3">
            {permissions.map((permission) => {
              const student = users.find((entry) => entry.id === permission.alunoId);
              const book = books.find((entry) => entry.id === permission.livroId);

              return (
                <div key={permission.id} className="rounded-[1.3rem] border border-border/70 bg-card/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{student?.nome} - {book?.titulo}</p>
                      <p className="text-xs text-muted-foreground">Atualizado em {permission.atualizadoEm}</p>
                      {permission.observacao && <p className="mt-2 text-sm text-muted-foreground">{permission.observacao}</p>}
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        permission.permitido ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {permission.permitido ? 'Permitido' : 'Bloqueado'}
                    </span>
                  </div>
                </div>
              );
            })}

            {permissions.length === 0 && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                Nenhuma permissão cadastrada ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPermissionsPage;

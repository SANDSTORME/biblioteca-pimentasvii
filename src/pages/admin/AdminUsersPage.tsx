import React, { useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { UserRole } from '@/types';
import SchoolClassSelect from '@/components/shared/SchoolClassSelect';
import { useLibrary } from '@/contexts/LibraryContext';

const roleLabel = (role: UserRole) => (role === 'admin' ? 'Admin' : role === 'professor' ? 'Professor' : 'Aluno');

// Gestão administrativa de usuários, perfis e status de acesso.
const AdminUsersPage: React.FC = () => {
  const { createUser, toggleUserStatus, users } = useLibrary();
  const [roleFilter, setRoleFilter] = useState<'todos' | UserRole>('todos');
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'aluno' as UserRole, turma: '' });

  const filtered = roleFilter === 'todos' ? users : users.filter((user) => user.role === roleFilter);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = await createUser({
      nome: form.nome,
      email: form.email,
      senha: form.senha,
      role: form.role,
      turma: form.role === 'aluno' ? form.turma : undefined,
    });

    setFeedback(result.message);
    if (result.success) {
      setForm({ nome: '', email: '', senha: '', role: 'aluno', turma: '' });
      setShowForm(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const result = await toggleUserStatus(userId);
    setFeedback(result.message);
  };

  return (
    <div className="max-w-6xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="glass-panel flex-1 rounded-[1.7rem] p-5 sm:rounded-[1.8rem] sm:p-6">
          <p className="section-kicker">Perfis e acessos</p>
          <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Usuários</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Gerencie alunos, professores e administradores com criação local, ativação de contas e filtro por perfil.
          </p>
        </div>

        <button
          onClick={() => setShowForm((current) => !current)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-transform hover:scale-[1.01] sm:w-auto"
        >
          <UserPlus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

      {feedback && <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm text-primary font-medium">{feedback}</div>}

      <div className="flex gap-2 flex-wrap">
        {(['todos', 'aluno', 'professor', 'admin'] as const).map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              roleFilter === role ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {role === 'todos' ? 'Todos' : roleLabel(role as UserRole)}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="glass-panel animate-fade-in rounded-[1.7rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-foreground">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                required
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Senha</label>
              <input
                type="text"
                value={form.senha}
                onChange={(event) => setForm({ ...form, senha: event.target.value })}
                required
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Perfil</label>
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
                required
                className="w-full mt-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground">Turma</label>
              <SchoolClassSelect
                value={form.turma}
                onChange={(value) => setForm({ ...form, turma: value })}
                disabled={form.role !== 'aluno'}
                className="mt-1 disabled:opacity-50"
                placeholder="Selecione a turma"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row">
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Criar usuário
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {filtered.map((user) => (
          <div key={user.id} className="glass-panel rounded-[1.55rem] p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{user.nome}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.ativo ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                {user.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 rounded-[1.15rem] border border-border/70 bg-card/70 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Perfil</span>
                <span className="font-medium text-foreground">{roleLabel(user.role)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Turma</span>
                <span className="font-medium text-foreground">{user.turma || '-'}</span>
              </div>
            </div>
            <button onClick={() => handleToggleStatus(user.id)} className="mt-4 w-full rounded-xl border border-border/70 bg-card/70 px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/5">
              {user.ativo ? 'Desativar usuário' : 'Reativar usuário'}
            </button>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[1.8rem] shadow-card md:block glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-mail</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Perfil</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Turma</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{user.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">{roleLabel(user.role)}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.turma || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${user.ativo ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleStatus(user.id)} className="text-xs text-primary hover:underline">
                      {user.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground glass-panel rounded-[1.6rem] p-4">
          <Users className="w-4 h-4" />
          Nenhum usuário encontrado para esse filtro.
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;

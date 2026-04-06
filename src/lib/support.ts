import { User } from '@/types';

export const SUPPORT_EMAIL = 'bibiotecapimentasvii@gmail.com';

export const buildSupportSubject = (user?: User | null, assunto?: string) => {
  const cleanedSubject = assunto?.trim();
  if (cleanedSubject) {
    return cleanedSubject;
  }

  const roleLabel =
    user?.role === 'admin'
      ? 'Administração'
      : user?.role === 'professor'
        ? 'Professor(a)'
        : user?.role === 'aluno'
          ? 'Aluno(a)'
          : 'Usuário';

  return `Suporte Biblioteca Pimentas VII - ${roleLabel}${user?.nome ? ` - ${user.nome}` : ''}`;
};

export const buildSupportBody = (user?: User | null, mensagem?: string) => {
  const header = [
    'Olá, equipe da Biblioteca Pimentas VII.',
    '',
    `Nome: ${user?.nome || ''}`,
    `Perfil: ${
      user?.role === 'admin'
        ? 'Administração'
        : user?.role === 'professor'
          ? 'Professor(a)'
          : user?.role === 'aluno'
            ? 'Aluno(a)'
            : ''
    }`,
    `Turma: ${user?.turma || '-'}`,
    '',
    'Mensagem:',
    mensagem?.trim() || '',
  ];

  return header.join('\n').trim();
};

export const createSupportMailtoUrl = (subject: string, body: string) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const createSupportGmailComposeUrl = (subject: string, body: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

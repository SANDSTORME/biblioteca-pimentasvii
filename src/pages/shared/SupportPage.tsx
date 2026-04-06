import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, LifeBuoy, Mail } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildSupportBody,
  buildSupportSubject,
  createSupportGmailComposeUrl,
  createSupportMailtoUrl,
  SUPPORT_EMAIL,
} from '@/lib/support';

// Canal de suporte para aluno e professor via Gmail institucional da biblioteca.
const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [copied, setCopied] = useState(false);

  const supportSubject = useMemo(() => buildSupportSubject(user, assunto), [assunto, user]);
  const supportBody = useMemo(() => buildSupportBody(user, mensagem), [mensagem, user]);

  const handleOpenGmail = () => {
    const gmailUrl = createSupportGmailComposeUrl(supportSubject, supportBody);
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenMailApp = () => {
    window.location.href = createSupportMailtoUrl(supportSubject, supportBody);
  };

  const handleCopyEmail = async () => {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-5xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="glass-panel flex-1 rounded-[1.7rem] p-5 sm:rounded-[1.8rem] sm:p-6">
          <p className="section-kicker">Atendimento da biblioteca</p>
          <h1 className="font-display text-[2rem] text-foreground sm:text-[2.4rem]">Suporte</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            O atendimento agora acontece pelo Gmail institucional da biblioteca. Escreva o assunto, descreva sua
            necessidade e abriremos a mensagem já direcionada para o endereço oficial do sistema.
          </p>
        </div>

        <div className="glass-panel w-full rounded-[1.7rem] p-5 shadow-card sm:w-auto sm:min-w-[21rem]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warm-gold">E-mail oficial</p>
          <p className="mt-3 break-all font-mono text-base font-semibold text-foreground">{SUPPORT_EMAIL}</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Use este endereço para dúvidas sobre acesso, empréstimos, leitura e apoio pedagógico.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel rounded-[1.7rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleOpenGmail();
            }}
            className="space-y-4"
          >
            <h2 className="font-display text-2xl text-foreground">Enviar mensagem para o suporte</h2>

            <div>
              <label className="text-sm font-medium text-foreground">Assunto</label>
              <input
                type="text"
                value={assunto}
                onChange={(event) => setAssunto(event.target.value)}
                placeholder="Ex.: Dúvida sobre empréstimo"
                className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Mensagem</label>
              <textarea
                value={mensagem}
                onChange={(event) => setMensagem(event.target.value)}
                rows={6}
                placeholder="Descreva aqui a sua dúvida ou necessidade."
                className="mt-1 w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Mail className="h-4 w-4" />
                Abrir Gmail
              </button>
              <button
                type="button"
                onClick={handleOpenMailApp}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir app de e-mail
              </button>
              <button
                type="button"
                onClick={() => void handleCopyEmail()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/70 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'E-mail copiado' : 'Copiar endereço'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="glass-panel rounded-[1.7rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warm-gold">Como funciona</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              <p>1. Você escreve o assunto e a mensagem nesta tela.</p>
              <p>2. O sistema abre o Gmail já direcionado para o suporte oficial da biblioteca.</p>
              <p>3. Você revisa, envia e acompanha a resposta diretamente no seu e-mail.</p>
            </div>
          </div>

          <EmptyState
            icon={LifeBuoy}
            title="Suporte por e-mail institucional"
            description="Esse canal facilita o contato direto com a equipe da biblioteca, sem depender de chamado interno dentro da plataforma."
            action={{ label: 'Abrir Gmail', onClick: handleOpenGmail }}
          />

          <div className="rounded-[1.4rem] border border-primary/20 bg-primary/5 p-4 text-sm text-foreground shadow-sm">
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 text-primary" />
              <p>
                A mensagem já pode sair com seu nome, perfil e turma no corpo do e-mail para facilitar a identificação
                da equipe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;

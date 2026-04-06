import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Inbox, Mail } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/support';

// Painel administrativo com orientações do novo fluxo de suporte por e-mail.
const AdminSupportPage: React.FC = () => {
  const [copied, setCopied] = useState(false);

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
      <div className="glass-panel rounded-[1.7rem] p-5 sm:rounded-[1.8rem] sm:p-6">
        <p className="section-kicker">Atendimento institucional</p>
        <h1 className="mt-3 font-display text-[2rem] text-foreground sm:text-4xl">Suporte por e-mail</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Os pedidos de suporte agora são enviados diretamente para o Gmail oficial da Biblioteca Pimentas VII. A
          equipe pode acompanhar o canal pelo endereço abaixo e responder os usuários por lá.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel rounded-[1.7rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warm-gold">Canal oficial do sistema</p>
          <p className="mt-4 break-all font-mono text-lg font-semibold text-foreground sm:text-xl">{SUPPORT_EMAIL}</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Oriente alunos e professores a utilizarem este endereço ao precisarem de ajuda com acesso, empréstimos,
            leitura, cadastro e demais dúvidas do sistema.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href="https://mail.google.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Mail className="h-4 w-4" />
              Abrir Gmail
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir app de e-mail
            </a>
            <button
              type="button"
              onClick={() => void handleCopyEmail()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/70 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'E-mail copiado' : 'Copiar endereço'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel rounded-[1.7rem] p-5 shadow-card sm:rounded-[1.8rem] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl text-foreground">Fluxo recomendado</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                  <p>1. O usuário abre a área de suporte na plataforma.</p>
                  <p>2. O sistema direciona a mensagem para o Gmail oficial da biblioteca.</p>
                  <p>3. A equipe responde diretamente pelo e-mail institucional.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-primary/20 bg-primary/5 p-4 text-sm text-foreground shadow-sm">
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 text-primary" />
              <p>
                Esse formato simplifica o atendimento e evita que mensagens de suporte fiquem presas apenas dentro do
                sistema local.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSupportPage;

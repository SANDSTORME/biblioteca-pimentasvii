import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, LifeBuoy, Mail, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BrandLogo from '@/components/shared/BrandLogo';
import {
  requestPasswordResetRequest,
  resetPasswordRequest,
  validatePasswordResetTokenRequest,
} from '@/services/api';

const inputClassName =
  'mt-2 w-full rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/80 focus:border-warm-gold/50 focus:outline-none focus:ring-2 focus:ring-warm-gold/25';

const PasswordResetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() || '';

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; previewUrl?: string } | null>(null);
  const [tokenValidado, setTokenValidado] = useState<'idle' | 'validando' | 'valido' | 'invalido'>(
    token ? 'validando' : 'idle',
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    setTokenValidado('validando');

    void validatePasswordResetTokenRequest(token)
      .then((result) => {
        if (!active) {
          return;
        }

        setTokenValidado(result.success ? 'valido' : 'invalido');
        if (result.email) {
          setEmail(result.email);
        }
        if (!result.success) {
          setStatus({ type: 'error', message: result.message });
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setTokenValidado('invalido');
        setStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Não foi possível validar o link enviado.',
        });
      });

    return () => {
      active = false;
    };
  }, [token]);

  const mode = useMemo(() => (token ? 'resetar' : 'solicitar'), [token]);

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const result = await requestPasswordResetRequest(email);
      setStatus({
        type: 'success',
        message: result.message,
        previewUrl: result.previewUrl,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível iniciar a recuperação.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (senha !== confirmacao) {
      setStatus({ type: 'error', message: 'A confirmação precisa ser igual à nova senha.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const result = await resetPasswordRequest(token, senha);
      setStatus({ type: 'success', message: result.message });
      window.setTimeout(() => navigate('/'), 1200);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível redefinir a senha.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-float-slow absolute left-[-8%] top-16 h-72 w-72 rounded-full bg-warm-gold/10 blur-3xl" />
        <div className="animate-drift-slow absolute bottom-[-12%] right-[-8%] h-96 w-96 rounded-full bg-olive/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="glass-panel panel-sheen rounded-[1.8rem] p-5 sm:p-6 lg:sticky lg:top-6">
            <BrandLogo tone="light" showSubtitle={false} />
            <p className="section-kicker mt-6">Segurança da conta</p>
            <h1 className="mt-3 font-display text-4xl text-cream sm:text-5xl">
              {mode === 'solicitar' ? 'Recuperar acesso com tranquilidade.' : 'Defina uma nova senha com segurança.'}
            </h1>
            <p className="mt-4 text-sm leading-8 text-cream/78">
              {mode === 'solicitar'
                ? 'Informe seu e-mail cadastrado. Se a conta existir, enviaremos as orientações para redefinição.'
                : 'Valide o link recebido e escolha uma senha forte para voltar ao sistema da Biblioteca Pimentas VII.'}
            </p>

            <div className="mt-6 grid gap-3">
              {[
                { icon: Mail, title: 'Envio controlado', desc: 'O sistema responde sem expor se um e-mail existe ou não.' },
                { icon: ShieldCheck, title: 'Token seguro', desc: 'O link de redefinição possui expiração e uso único.' },
                { icon: LifeBuoy, title: 'Fluxo escolar', desc: 'Compatível com contas institucionais e expansão futura de validação.' },
              ].map((item) => (
                <div key={item.title} className="rounded-[1.35rem] border border-border/70 bg-card/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-card">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm leading-7 text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[1.8rem] p-5 shadow-card sm:p-6 md:p-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a página inicial
            </Link>

            <div className="mt-6">
              <p className="section-kicker">{mode === 'solicitar' ? 'Esqueci minha senha' : 'Redefinir senha'}</p>
              <h2 className="mt-3 font-display text-4xl text-foreground">
                {mode === 'solicitar' ? 'Receber orientações' : 'Criar nova senha'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {mode === 'solicitar'
                  ? 'Use o mesmo e-mail da sua conta escolar para continuar.'
                  : 'A nova senha precisa ter ao menos 8 caracteres, com letra maiúscula, minúscula, número e símbolo.'}
              </p>
            </div>

            {mode === 'solicitar' ? (
              <form onSubmit={handleRequestReset} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">E-mail cadastrado</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className={inputClassName}
                    placeholder="seu.email@escola.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-5 py-4 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" />
                  {isLoading ? 'Enviando orientações...' : 'Enviar link de redefinição'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div className="rounded-[1.35rem] border border-border/70 bg-card/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Status do link</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {tokenValidado === 'validando' && 'Validando o link enviado...'}
                    {tokenValidado === 'valido' && 'Link válido e pronto para uso.'}
                    {tokenValidado === 'invalido' && 'Este link expirou ou já foi utilizado.'}
                  </p>
                  {email && <p className="mt-2 text-sm text-muted-foreground">Conta vinculada: {email}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Nova senha</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    required
                    disabled={tokenValidado !== 'valido'}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={confirmacao}
                    onChange={(event) => setConfirmacao(event.target.value)}
                    required
                    disabled={tokenValidado !== 'valido'}
                    className={inputClassName}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || tokenValidado !== 'valido'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-5 py-4 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isLoading ? 'Salvando nova senha...' : 'Salvar nova senha'}
                </button>
              </form>
            )}

            {status && (
              <div
                className={`mt-5 rounded-[1.35rem] border p-4 ${
                  status.type === 'success'
                    ? 'border-primary/20 bg-primary/10 text-foreground'
                    : 'border-destructive/20 bg-destructive/10 text-foreground'
                }`}
              >
                <p className="text-sm font-semibold">{status.message}</p>
                {status.previewUrl && (
                  <a
                    href={status.previewUrl}
                    className="mt-3 inline-flex text-sm font-medium text-warm-gold hover:text-warm-gold-light"
                  >
                    Abrir link de redefinição neste ambiente
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;

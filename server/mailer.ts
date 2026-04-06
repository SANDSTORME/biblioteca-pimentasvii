import nodemailer from 'nodemailer';
import { serverConfig } from './config';
import { logError, logInfo, logWarn } from './logger';

const canSendMail = Boolean(serverConfig.smtpHost && serverConfig.smtpPort);

const transporter =
  canSendMail
    ? nodemailer.createTransport({
        host: serverConfig.smtpHost,
        port: serverConfig.smtpPort,
        secure: serverConfig.smtpSecure,
        auth:
          serverConfig.smtpUser && serverConfig.smtpPass
            ? {
                user: serverConfig.smtpUser,
                pass: serverConfig.smtpPass,
              }
            : undefined,
      })
    : null;

export interface PasswordResetDispatchResult {
  accepted: boolean;
  delivered: boolean;
  previewUrl?: string;
}

export const buildPublicAppUrl = (pathName: string) => {
  const fallbackBase = `http://127.0.0.1:${serverConfig.port}`;
  return new URL(pathName, serverConfig.appPublicUrl || fallbackBase).toString();
};

export const sendPasswordResetEmail = async (input: {
  to: string;
  nome: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<PasswordResetDispatchResult> => {
  const subject = 'Redefinição de senha - Biblioteca Pimentas VII';
  const text = [
    `Olá, ${input.nome}.`,
    '',
    'Recebemos um pedido para redefinir a sua senha na Biblioteca Pimentas VII.',
    `Use o link abaixo em até ${input.expiresInMinutes} minutos:`,
    input.resetUrl,
    '',
    'Se você não solicitou essa alteração, ignore este e-mail.',
  ].join('\n');

  if (!transporter) {
    if (serverConfig.passwordResetPreviewEnabled) {
      logWarn('SMTP não configurado. Link de redefinição liberado apenas para ambiente controlado.', {
        email: input.to,
      });

      return {
        accepted: true,
        delivered: false,
        previewUrl: input.resetUrl,
      };
    }

    logWarn('SMTP não configurado. Solicitação de redefinição registrada sem expor link público.', {
      email: input.to,
    });

    return {
      accepted: false,
      delivered: false,
    };
  }

  try {
    await transporter.sendMail({
      from: serverConfig.mailFrom,
      to: input.to,
      subject,
      text,
    });
  } catch (error) {
    logError('Falha ao enviar e-mail de redefinição.', error, { email: input.to });

    return {
      accepted: false,
      delivered: false,
    };
  }

  logInfo('E-mail de redefinição enviado.', { email: input.to });

  return {
    accepted: true,
    delivered: true,
  };
};

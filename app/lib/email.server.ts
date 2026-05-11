import { Resend } from 'resend';
import { env } from './env.server';

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}

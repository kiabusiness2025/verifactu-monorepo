import { Resend } from 'resend';

function cleanEnv(value?: string | null) {
  return value?.replace(/[\r\n]/g, '').trim() || '';
}

export const resendClient = {
  apiKey: cleanEnv(process.env.RESEND_API_KEY),
  baseUrl: 'https://api.resend.com',
};

function getResend() {
  if (!resendClient.apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(resendClient.apiKey);
}

export async function sendEmail({
  to,
  from = 'noreply@isaak.app',
  subject,
  html,
  replyTo,
}: {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  try {
    const resend = getResend();
    return await resend.emails.send({
      to,
      from,
      subject,
      html,
      reply_to: replyTo,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function getDeliveryStatus(emailId: string) {
  try {
    const resend = getResend();
    return await resend.emails.get(emailId);
  } catch (error) {
    console.error('Error fetching delivery status:', error);
    throw error;
  }
}

export async function listRecentEmails(limit = 50) {
  try {
    const response = await fetch(`${resendClient.baseUrl}/emails?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${resendClient.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing emails:', error);
    throw error;
  }
}

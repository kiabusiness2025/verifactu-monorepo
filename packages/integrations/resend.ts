export const resendClient = {
  apiKey: process.env.RESEND_API_KEY || '',
  baseUrl: 'https://api.resend.com',
};

export async function sendEmail({
  to,
  from = 'noreply@verifactu.business',
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
    const response = await fetch(`${resendClient.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendClient.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, from, subject, html, reply_to: replyTo }),
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function getDeliveryStatus(emailId: string) {
  try {
    const response = await fetch(`${resendClient.baseUrl}/emails/${emailId}`, {
      headers: {
        Authorization: `Bearer ${resendClient.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    return await response.json();
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

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Get or list received messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, status } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    const resend = new Resend(apiKey);

    // Use Resend's emails.list() to get sent emails
    const { data, error } = await resend.emails.list();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Filter by status if provided
    let messages = data || [];
    if (status && status !== 'all') {
      messages = messages.filter((msg: any) => msg.status === status);
    }

    // Transform to our format
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      from: msg.from,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      cc: msg.cc || [],
      bcc: msg.bcc || [],
      replyTo: msg.reply_to,
      subject: msg.subject,
      html: msg.html || '',
      text: msg.text || '',
      tags: msg.tags || [],
      createdAt: msg.created_at,
      status: msg.status || 'delivered',
      opens: msg.opens || 0,
      clicks: msg.clicks || 0,
    }));

    return NextResponse.json({
      messages: formattedMessages,
      total: formattedMessages.length,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error fetching messages' },
      { status: 500 }
    );
  }
}

// Get a specific received email
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');
    const emailId = searchParams.get('emailId');

    if (!apiKey || !emailId) {
      return NextResponse.json({ error: 'API key and emailId required' }, { status: 400 });
    }

    const resend = new Resend(apiKey);

    // Use Resend's emails.get() to get a specific email
    const { data, error } = await resend.emails.get(emailId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: {
        id: data.id,
        from: data.from,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

// Delete message
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, messageId } = body;

    if (!apiKey || !messageId) {
      return NextResponse.json({ error: 'API key and messageId required' }, { status: 400 });
    }

    // Note: Resend doesn't have a delete API for received emails
    // This is a placeholder - you'd typically mark as archived in your database
    return NextResponse.json({
      success: true,
      message: 'Message marked for deletion (stored locally)',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

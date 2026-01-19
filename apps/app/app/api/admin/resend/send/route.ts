import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      apiKey,
      from,
      to,
      cc,
      bcc,
      replyTo,
      subject,
      html,
      text,
      tags,
      scheduledAt,
    } = body;

    if (!apiKey || !from || !to || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: apiKey, from, to, subject" },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    const response = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      replyTo: replyTo || undefined,
      subject,
      html: html || undefined,
      text: text || undefined,
      tags: tags || undefined,
      scheduledAt: scheduledAt || undefined,
    });

    if (response.error) {
      return NextResponse.json(
        { error: response.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id: response.data?.id,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error sending email" },
      { status: 500 }
    );
  }
}

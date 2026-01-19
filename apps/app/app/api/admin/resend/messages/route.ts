import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Get or list messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, status } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    // Resend doesn't have a native message list API
    // This is a placeholder - in production you'd use your own database
    return NextResponse.json({
      messages: [
        {
          id: "msg_1",
          from: "soporte@verifactu.business",
          to: ["cliente@ejemplo.com"],
          subject: "Mensaje de ejemplo",
          html: "<p>Este es un mensaje de ejemplo</p>",
          text: "Este es un mensaje de ejemplo",
          createdAt: new Date().toISOString(),
          status: "delivered",
          opens: 1,
          clicks: 0,
        },
      ],
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
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
      return NextResponse.json(
        { error: "API key and messageId required" },
        { status: 400 }
      );
    }

    // Placeholder for delete logic
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}

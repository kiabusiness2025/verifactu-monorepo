import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// List attachments for a received email
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get("apiKey");
    const emailId = searchParams.get("emailId");
    const attachmentId = searchParams.get("attachmentId");

    if (!apiKey || !emailId) {
      return NextResponse.json(
        { error: "API key and emailId required" },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    // If attachmentId is provided, get specific attachment
    if (attachmentId) {
      const { data, error } = await resend.attachments.receiving.get({
        id: attachmentId,
        emailId: emailId,
      });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        attachment: data,
      });
    }

    // Otherwise, list all attachments for the email
    const { data, error } = await resend.attachments.receiving.list({
      emailId: emailId,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      attachments: data || [],
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching attachments" },
      { status: 500 }
    );
  }
}

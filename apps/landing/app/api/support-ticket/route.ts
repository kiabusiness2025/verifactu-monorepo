import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function toSafeString(value: FormDataEntryValue | null): string {
  if (!value || typeof value !== "string") return "";
  return value.trim();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const name = toSafeString(formData.get("name"));
    const email = toSafeString(formData.get("email"));
    const company = toSafeString(formData.get("company"));
    const product = toSafeString(formData.get("product"));
    const category = toSafeString(formData.get("category"));
    const priority = toSafeString(formData.get("priority"));
    const subject = toSafeString(formData.get("subject"));
    const description = toSafeString(formData.get("description"));
    const url = toSafeString(formData.get("url"));

    if (!name || !email || !subject || !description) {
      return NextResponse.json(
        { error: "Completa los campos obligatorios" },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      if (process.env.NODE_ENV === "development") {
        console.log("Ticket received (dev mode):", {
          name,
          email,
          company,
          product,
          category,
          priority,
          subject,
          description,
          url,
        });
        return NextResponse.json({
          success: true,
          message: "Ticket recibido correctamente (modo desarrollo)",
        });
      }
      return NextResponse.json(
        { error: "Servicio de email no configurado" },
        { status: 500 }
      );
    }

    const attachments: { filename: string; content: string }[] = [];
    const files = formData.getAll("attachments");
    for (const entry of files.slice(0, MAX_ATTACHMENTS)) {
      if (!(entry instanceof File)) continue;
      if (entry.size > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          { error: "El archivo supera el limite de 5MB" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await entry.arrayBuffer());
      attachments.push({
        filename: entry.name || "adjunto",
        content: buffer.toString("base64"),
      });
    }

    const escapeHtml = (text: string): string => {
      const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    const emailContent = `
      <h2>Nuevo ticket de soporte</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${company ? `<p><strong>Empresa:</strong> ${escapeHtml(company)}</p>` : ""}
      ${product ? `<p><strong>Producto:</strong> ${escapeHtml(product)}</p>` : ""}
      ${category ? `<p><strong>Categoria:</strong> ${escapeHtml(category)}</p>` : ""}
      ${priority ? `<p><strong>Prioridad:</strong> ${escapeHtml(priority)}</p>` : ""}
      <p><strong>Asunto:</strong> ${escapeHtml(subject)}</p>
      ${url ? `<p><strong>URL:</strong> ${escapeHtml(url)}</p>` : ""}
      <p><strong>Descripcion:</strong></p>
      <p>${escapeHtml(description)}</p>
    `;

    const resend = new Resend(resendApiKey);
    const recipientEmail = process.env.SUPPORT_EMAIL || "soporte@verifactu.business";

    await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@verifactu.business",
      to: recipientEmail,
      subject: `Ticket soporte: ${escapeHtml(subject)}`,
      html: emailContent,
      attachments,
    });

    return NextResponse.json({
      success: true,
      message: "Ticket enviado correctamente",
    });
  } catch (error) {
    console.error("Error processing ticket:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

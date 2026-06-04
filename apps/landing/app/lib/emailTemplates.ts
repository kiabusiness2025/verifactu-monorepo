export type CorporateEmailVariant = 'comercial' | 'inversores' | 'soporte';

type CorporateTemplateInput = {
  variant: CorporateEmailVariant;
  title: string;
  intro: string;
  bodyHtml: string;
  footerNote?: string;
};

type CorporatePlainTextInput = {
  variant: CorporateEmailVariant;
  title: string;
  intro: string;
  lines: string[];
  footerNote?: string;
};

const VARIANT_META: Record<CorporateEmailVariant, { badge: string; color: string; bg: string }> = {
  comercial: {
    badge: 'Comercial',
    color: '#2361d8',
    bg: '#eef5ff',
  },
  inversores: {
    badge: 'Inversores',
    color: '#0f766e',
    bg: '#ecfeff',
  },
  soporte: {
    badge: 'Soporte',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function renderCorporateBrandedEmail(input: CorporateTemplateInput): string {
  const { variant, title, intro, bodyHtml, footerNote } = input;
  const meta = VARIANT_META[variant];

  return `
    <div style="margin:0;padding:24px;background:#f3f7ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #dbe7ff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;background:#ffffff;border-bottom:1px solid #e2e8f0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tr>
                <td style="vertical-align:middle;">
                  <span style="display:inline-flex;align-items:center;gap:10px;">
                    <img src="https://verifactu.business/Isaak/isaak-avatar-verifactu.png" alt="Isaak" style="display:block;height:34px;width:34px;border-radius:999px;" />
                    <span>
                      <span style="display:block;font-size:16px;font-weight:800;color:#0f172a;line-height:1.1;">Isaak</span>
                      <span style="display:block;font-size:12px;color:#64748b;line-height:1.2;">verifactu.business</span>
                    </span>
                  </span>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <img src="https://verifactu.business/brand/logo-horizontal-dark.png" alt="verifactu.business" style="display:block;height:24px;width:auto;margin-left:auto;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <span style="display:inline-flex;padding:6px 10px;border-radius:999px;background:${meta.bg};color:${meta.color};font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${meta.badge}</span>
            <h1 style="margin:12px 0 12px 0;font-size:22px;line-height:1.3;color:#0b1f66;">${escapeHtml(title)}</h1>
            <p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#334155;">${escapeHtml(intro)}</p>
            <div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fbff;">
              ${bodyHtml}
            </div>
            ${
              footerNote
                ? `<p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:#64748b;">${escapeHtml(footerNote)}</p>`
                : ''
            }
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function renderCorporatePlainTextEmail(input: CorporatePlainTextInput): string {
  const { variant, title, intro, lines, footerNote } = input;
  const badge = VARIANT_META[variant].badge;

  const sections = [
    `verifactu.business - ${badge}`,
    '',
    title,
    '',
    intro,
    '',
    ...lines,
    '',
    footerNote || '',
  ];

  return sections.filter((line, index, arr) => !(line === '' && arr[index - 1] === '')).join('\n');
}

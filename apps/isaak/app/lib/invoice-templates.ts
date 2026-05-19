export type TemplateConfig = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string;
  layoutConfig?: Record<string, unknown>;
};

export type PredefinedTemplate = {
  slug: string;
  name: string;
  description: string;
  config: TemplateConfig;
};

export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  {
    slug: 'classic',
    name: 'Clásico',
    description: 'Azul marino profesional, estilo corporativo tradicional',
    config: {
      primaryColor: '#011c67',
      secondaryColor: '#1e293b',
      accentColor: '#2361d8',
      fontFamily: 'Helvetica',
    },
  },
  {
    slug: 'modern',
    name: 'Moderno',
    description: 'Azul eléctrico con líneas limpias',
    config: {
      primaryColor: '#2361d8',
      secondaryColor: '#0f172a',
      accentColor: '#3b82f6',
      fontFamily: 'Helvetica',
    },
  },
  {
    slug: 'minimal',
    name: 'Minimalista',
    description: 'Negro sobre blanco, sin distracciones',
    config: {
      primaryColor: '#18181b',
      secondaryColor: '#3f3f46',
      accentColor: '#71717a',
      fontFamily: 'Helvetica',
    },
  },
  {
    slug: 'professional',
    name: 'Profesional',
    description: 'Cabecera oscura con acento verde esmeralda',
    config: {
      primaryColor: '#0f172a',
      secondaryColor: '#1e293b',
      accentColor: '#059669',
      fontFamily: 'Helvetica',
    },
  },
  {
    slug: 'fiscal',
    name: 'Fiscal',
    description: 'Diseño oficial con marca VeriFactu destacada',
    config: {
      primaryColor: '#1d4ed8',
      secondaryColor: '#1e3a5f',
      accentColor: '#f59e0b',
      fontFamily: 'Helvetica',
      layoutConfig: { showVerifactuBadge: true, showAeatFooter: true },
    },
  },
];

export function getPredefinedTemplate(slug: string): PredefinedTemplate | undefined {
  return PREDEFINED_TEMPLATES.find((t) => t.slug === slug);
}

export async function extractTemplateFromInvoiceImage(
  fileBase64: string,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<Partial<TemplateConfig> | null> {
  const isPdf = mimeType === 'application/pdf';
  const fileBlock = isPdf
    ? {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
      }
    : { type: 'image', source: { type: 'base64', media_type: mimeType, data: fileBase64 } };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
  if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system:
        'Eres un asistente que analiza facturas y extrae los colores y estilo de diseño para crear una plantilla corporativa. Devuelve únicamente los colores hex extraídos.',
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            {
              type: 'text',
              text: 'Analiza esta factura y extrae el estilo visual corporativo: color principal del encabezado, color de texto, color de acento/detalle. Si hay logo, descríbelo. Usa la herramienta extract_template_style.',
            },
          ],
        },
      ],
      tools: [
        {
          name: 'extract_template_style',
          description: 'Extraer estilo visual de una factura para crear una plantilla',
          input_schema: {
            type: 'object',
            properties: {
              primaryColor: {
                type: 'string',
                description: 'Color principal del encabezado (hex #RRGGBB)',
              },
              secondaryColor: {
                type: 'string',
                description: 'Color del texto principal (hex #RRGGBB)',
              },
              accentColor: {
                type: 'string',
                description: 'Color de acento o detalles (hex #RRGGBB)',
              },
              hasLogo: { type: 'boolean', description: 'Si la factura tiene logotipo' },
              logoDescription: { type: 'string', description: 'Descripción del logo si existe' },
            },
            required: ['primaryColor', 'secondaryColor'],
          },
        },
      ],
      tool_choice: { type: 'auto' },
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { content?: Array<{ type: string; input?: unknown }> };
  const toolUse = data.content?.find((b) => b.type === 'tool_use');
  if (!toolUse?.input) return null;

  const input = toolUse.input as Partial<TemplateConfig>;
  const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);

  return {
    primaryColor: isHex(input.primaryColor) ? input.primaryColor : undefined,
    secondaryColor: isHex(input.secondaryColor) ? input.secondaryColor : undefined,
    accentColor: isHex(input.accentColor) ? input.accentColor : undefined,
  };
}

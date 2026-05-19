import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

function loadAsBase64(filePath: string, mime: string): string {
  const buf = readFileSync(path.join(process.cwd(), filePath));
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export async function GET() {
  const claudeLogoSvg = readFileSync(
    path.join(process.cwd(), 'public/brand/claude-logo.svg'),
    'utf8'
  );
  const claudeLogo = `data:image/svg+xml;base64,${Buffer.from(claudeLogoSvg).toString('base64')}`;
  const holdedLogo = loadAsBase64('public/brand/holded/holded-diamond-logo.png', 'image/png');

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '1200px',
        height: '630px',
        background: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '28px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
        <img
          src={claudeLogo}
          width={160}
          height={160}
          style={{ borderRadius: '32px' }}
          alt="Claude"
        />
        <span style={{ fontSize: '80px', color: '#334155', lineHeight: '1', fontWeight: '300' }}>
          ×
        </span>
        <img
          src={holdedLogo}
          width={160}
          height={160}
          style={{ borderRadius: '32px' }}
          alt="Holded"
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span
          style={{ fontSize: '48px', color: '#F1F5F9', fontWeight: '700', letterSpacing: '-1px' }}
        >
          Claude × Holded
        </span>
        <span style={{ fontSize: '22px', color: '#64748B' }}>
          Consulta tus datos de Holded desde Claude
        </span>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function readChallengeValue() {
  return (
    process.env.OPENAI_APPS_CHALLENGE?.trim() ||
    process.env.OPENAI_APPS_DOMAIN_CHALLENGE?.trim() ||
    ''
  );
}

export async function GET() {
  const challenge = readChallengeValue();

  if (!challenge) {
    return NextResponse.json({ error: 'OPENAI_APPS_CHALLENGE is not configured' }, { status: 404 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
}

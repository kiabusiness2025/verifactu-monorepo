/**
 * OpenAI domain verification challenge.
 * Set OPENAI_APPS_CHALLENGE in env with the value provided by OpenAI.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const challenge = process.env.OPENAI_APPS_CHALLENGE?.trim() || '';

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

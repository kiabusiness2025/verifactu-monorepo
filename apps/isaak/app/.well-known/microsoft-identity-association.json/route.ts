import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(
    {
      associatedApplications: [
        {
          applicationId: '454f35d6-b13c-40c6-a907-05443c732e09',
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    }
  );
}

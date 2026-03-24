import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HoldedAuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const holdedUrl = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
  const source = firstValue(params.source)?.trim();
  const next = firstValue(params.next)?.trim();

  if (next) {
    try {
      const parsed = new URL(next);
      if (parsed.origin === new URL(holdedUrl).origin) {
        redirect(parsed.toString());
      }
    } catch {
      // Ignore malformed next param and fallback to holded home
    }
  }

  const target = new URL('/', holdedUrl);

  if (source) {
    target.searchParams.set('source', source);
  }

  redirect(target.toString());
}

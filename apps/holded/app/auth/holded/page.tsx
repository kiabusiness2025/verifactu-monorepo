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
  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || 'https://verifactu.business';
  const target = new URL('/auth/holded', landingUrl);

  const source = firstValue(params.source)?.trim();
  const next = firstValue(params.next)?.trim();

  if (source) target.searchParams.set('source', source);
  if (next) target.searchParams.set('next', next);

  redirect(target.toString());
}

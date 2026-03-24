function getOrigin(value: string | undefined, fallback: string) {
  const candidate = (value || fallback).trim();
  try {
    return new URL(candidate).origin;
  } catch {
    return fallback;
  }
}

export const ISAAK_PUBLIC_URL = getOrigin(
  process.env.NEXT_PUBLIC_ISAAK_SITE_URL,
  'https://isaak.verifactu.business'
);

export const APP_URL = getOrigin(process.env.NEXT_PUBLIC_APP_URL, 'https://app.verifactu.business');

export const HOLDed_URL = getOrigin(
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL,
  'https://holded.verifactu.business'
);

export const CONTACT_URL = `${getOrigin(
  process.env.NEXT_PUBLIC_SITE_URL,
  'https://verifactu.business'
)}/recursos/contacto`;

import { redirect } from 'next/navigation';

export default function LoginPage() {
  const landingUrl = (process.env.NEXT_PUBLIC_LANDING_URL || 'https://verifactu.business')
    .trim()
    .replace(/\/$/, '');
  redirect(`${landingUrl}/auth/login`);
}

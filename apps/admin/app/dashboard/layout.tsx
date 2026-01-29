import { redirect } from 'next/navigation';
import { getAdminSessionOrNull } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSessionOrNull();

  if (!session) {
    redirect('/auth/signin');
  }

  return <div className="min-h-screen bg-slate-50 text-slate-900">{children}</div>;
}

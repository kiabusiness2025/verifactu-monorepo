import { redirect } from 'next/navigation';

export default function CompaniesRedirect() {
  redirect('/dashboard/admin/companies');
}

import { redirect } from 'next/navigation';

export default function OperationsRedirect() {
  redirect('/dashboard/admin/emails');
}

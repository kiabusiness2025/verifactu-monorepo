import { redirect } from 'next/navigation';

export default function EmailsRedirect() {
  redirect('/dashboard/admin/emails');
}
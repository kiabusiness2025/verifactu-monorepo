import { redirect } from 'next/navigation';

export default function WebhooksRedirect() {
  redirect('/dashboard/admin/integrations');
}
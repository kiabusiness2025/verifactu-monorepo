import { redirect } from 'next/navigation';

type Props = { params: { id: string } };

export default function WebhookRedirect({ params }: Props) {
  redirect('/dashboard/admin/integrations');
}
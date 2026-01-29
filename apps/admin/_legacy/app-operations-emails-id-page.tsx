import { redirect } from 'next/navigation';

type Props = { params: { id: string } };

export default function EmailRedirect({ params }: Props) {
  redirect('/dashboard/admin/emails');
}
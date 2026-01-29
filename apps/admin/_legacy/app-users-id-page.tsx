import { redirect } from 'next/navigation';

type Props = { params: { id: string } };

export default function UserRedirect({ params }: Props) {
  redirect(`/dashboard/admin/users/${params.id}`);
}
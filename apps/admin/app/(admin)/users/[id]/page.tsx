import UserDetailPage from "../../../dashboard/admin/users/[id]/page";

export default async function AdminUserDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await params;
	return <UserDetailPage />;
}

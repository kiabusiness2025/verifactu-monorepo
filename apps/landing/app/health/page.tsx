export const dynamic = "force-static";

export default function HealthPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-lg font-semibold text-gray-900">OK</h1>
        <p className="text-sm text-gray-600">Landing is healthy</p>
      </div>
    </main>
  );
}


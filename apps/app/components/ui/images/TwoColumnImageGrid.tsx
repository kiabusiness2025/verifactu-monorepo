export default function TwoColumnImageGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-32 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-600"
        >
          Imagen {item}
        </div>
      ))}
    </div>
  );
}

export default function ThreeColumnImageGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="h-28 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-600"
        >
          Imagen {item}
        </div>
      ))}
    </div>
  );
}

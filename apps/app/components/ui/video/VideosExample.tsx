export default function VideosExample() {
  return (
    <div className="space-y-4">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="aspect-video w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-600"
        >
          Vídeo embebido {item}
        </div>
      ))}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="container py-8 text-sm text-[var(--muted)] flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Expert App · Robotcontable</p>
        <p>Desarrollado por KIA BUSINESS · Asistencia IA (OpenAI)</p>
      </div>
    </footer>
  );
}

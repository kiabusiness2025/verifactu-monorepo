import { redirect } from 'next/navigation';

// Ruta canónica: /contacto
// La lógica y el formulario viven en /recursos/contacto
// Esta redirección evita duplicar contenido mientras la migración está en progreso.
export default function ContactoCanonicoPage() {
  redirect('/recursos/contacto');
}

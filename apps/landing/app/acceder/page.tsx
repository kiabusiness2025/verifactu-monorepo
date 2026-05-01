import { redirect } from 'next/navigation';

// Ruta canónica: /acceder
// El login vive en /auth/login mientras se unifica el flujo de acceso.
export default function AccederPage() {
  redirect('/auth/login');
}

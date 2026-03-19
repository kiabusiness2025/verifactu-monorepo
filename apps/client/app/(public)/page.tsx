import { redirect } from 'next/navigation';

// Safety net: el middleware ya redirige / pero si llega aquí, mandamos a /login
export default function PublicLanding() {
  redirect('/login');
}

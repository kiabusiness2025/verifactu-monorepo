import { redirect } from 'next/navigation';

// El tour animado se ha integrado en la home (/#como-funciona).
// La demo en vivo está en /demo.
export default function TourPage() {
  redirect('/#como-funciona');
}

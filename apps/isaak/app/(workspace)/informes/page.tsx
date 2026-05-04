import type { Metadata } from 'next';
import InformesClient from './InformesClient';

export const metadata: Metadata = { title: 'Informes — Isaak' };

export default function InformesPage() {
  const year = new Date().getFullYear();
  return (
    <div className="flex h-full flex-col">
      <InformesClient year={year} />
    </div>
  );
}

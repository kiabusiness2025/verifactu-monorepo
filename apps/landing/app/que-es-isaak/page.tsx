import { redirect } from 'next/navigation';
import { getIsaakUrl } from '../lib/urls';

export default function QueEsIsaakPage() {
  redirect(getIsaakUrl());
}

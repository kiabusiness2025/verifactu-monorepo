'use client';

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { formatDate, formatCurrency } from '@verifactu/utils';

dayjs.locale('es');

export const EjemploFormatoES: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [fecha, setFecha] = useState<Date | null>(null);
  const cantidad = 123456.78;

  useEffect(() => {
    setFecha(new Date());
    setMounted(true);
  }, []);

  if (!mounted || !fecha) return null;

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2>Ejemplo de formato espanol</h2>
      <p>Fecha (Intl): {formatDate(fecha, { dateStyle: 'full', timeStyle: 'short' })}</p>
      <p>Fecha (dayjs): {dayjs(fecha).format('DD MMMM YYYY, HH:mm')}</p>
      <p>Moneda: {formatCurrency(cantidad)}</p>
    </div>
  );
};

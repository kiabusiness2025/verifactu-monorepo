'use client';

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

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

  const fechaIntl = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(fecha);

  const moneda = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(cantidad);

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2>Ejemplo de formato espanol</h2>
      <p>Fecha (Intl): {fechaIntl}</p>
      <p>Fecha (dayjs): {dayjs(fecha).format('DD MMMM YYYY, HH:mm')}</p>
      <p>Moneda: {moneda}</p>
    </div>
  );
};

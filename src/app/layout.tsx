import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Avocado.shop Spa - Citas y Servicios',
  description: 'Sistema de reserva de citas para Avocado.Shop Spa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
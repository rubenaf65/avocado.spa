import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Avocado Spa',
  description: 'Sistema de reserva de citas',
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
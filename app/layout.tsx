import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sirius AI',
  description: 'Lyra destekli premium AI asistan arayüzü',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

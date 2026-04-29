import './globals.css';

export const metadata = {
  title: 'Lyra Clean 2026',
  description: 'Sesli ve yazılı Lyra AI asistanı',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

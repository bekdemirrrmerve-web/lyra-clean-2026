import './globals.css';

export const metadata = {
  title: 'Lyra',
  description: 'Lyra AI Assistant',
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

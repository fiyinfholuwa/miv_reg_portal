import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jan Conf 2027 | International Ministers & Leadership Conference',
  description: 'A six-day gathering for ministry, leadership, and the next generation.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

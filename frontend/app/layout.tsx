import type { Metadata } from 'next';
import Toaster from '../components/Toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Men of Issachar Vision | Conferences, retreats & gatherings',
  description: 'Every MIV conference, retreat and leadership gathering in one place. Find your next event and register.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Browser extensions (Grammarly, QuillBot…) add attributes to <html>/<body>
    // before React hydrates; ignore those two tags only, children are still checked.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

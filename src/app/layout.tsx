import type { Metadata } from 'next';
import { Source_Serif_4, Source_Sans_3 } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';
import { Nav } from '@/components/Nav';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OpenPatch',
  description: 'Higher correctness via multi-model orchestration and verification',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen flex flex-col font-sans antialiased" style={{ color: 'var(--text-primary)', background: 'var(--bg-app)' }}>
        <Nav />
        <main className="flex-1 w-full px-6 overflow-y-auto overflow-x-hidden scroll-smooth">
          {children}
        </main>
      </body>
    </html>
  );
}

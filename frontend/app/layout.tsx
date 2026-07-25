import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import './globals.css';

const sansFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Segwise — Customer Segmentation & Personalization Copilot',
  description: 'AI-powered customer segmentation copilot for retail banking analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable}`} suppressHydrationWarning>
      <body className="bg-bg text-text-primary antialiased selection:bg-accent/20 selection:text-white">
        <ThemeProvider>
          {children}
          <Toaster
            theme="system"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const sansFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
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
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable}`}>
      <body style={{ background: '#FDFDFC', color: '#1a1a18', margin: 0, padding: 0 }}>
        {children}
        <Toaster
          theme="light"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.07)',
              color: '#1a1a18',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              borderRadius: '10px',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  );
}

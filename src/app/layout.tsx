import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { AdminAuthProvider } from '@/components/AdminAuthProvider';
import { AdminShell } from '@/components/AdminShell';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-code',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TemporaMail Admin Console',
  description: 'Internal operations, security, and governance console for TemporaMail.',
  robots: {
    index: false,
    follow: false,
  },
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('temporamail_admin_theme');if(s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-[#060b18] dark:text-slate-100">
        <ThemeProvider>
          <AdminAuthProvider>
            <AdminShell>{children}</AdminShell>
          </AdminAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

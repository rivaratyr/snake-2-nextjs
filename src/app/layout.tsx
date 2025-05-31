// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import { auth } from '@/auth';
import ClientProviders from '@/providers';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Snake2',
  description: 'The Ultimate PVP Snake',
};

export default async function RootLayout({ children }: { children: ReactNode }) {

  const session = await auth();
    
  return (
    
    <html lang="en">
      <body className="bg-gray-100 text-gray-900">
        <ClientProviders session={session}>
        {children}
        </ClientProviders>
      </body>
    </html>
  );
}

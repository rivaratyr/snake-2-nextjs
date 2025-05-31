// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';

export default function RootLayout({ children }: { children: ReactNode }) {

  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900">
        <MiniKitProvider>
        {children}
        </MiniKitProvider>
      </body>
    </html>
  );
}

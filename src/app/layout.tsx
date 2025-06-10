// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import { auth } from '@/auth';
import ClientProviders from '@/providers';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import type { Metadata } from 'next';

/**
 * This has to look exactly like this for Farcaster.
 * @returns Metadata for the root layout.
 */
export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL;
  return {
    title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
    description: process.env.NEXT_PUBLIC_DESCRIPTION,
    other: {
      "fc:frame": JSON.stringify({
        version: process.env.NEXT_PUBLIC_VERSION,
        imageUrl: process.env.NEXT_PUBLIC_IMAGE_URL,
        button: {
          title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}`,
          action: {
            type: "launch_frame",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE_URL,
            splashBackgroundColor: `#${process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR}`,
          },
        },
      }),
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {

  const session = await auth();
    
  return (
    
    <html lang="en">
      <body className="game-font font-white">
        <ClientProviders session={session}>
        {children}
        </ClientProviders>
      </body>
    </html>
  );
}

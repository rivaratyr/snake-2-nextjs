'use client';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { FarcasterProvider } from '@/providers/Base/providers';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { Page } from '@/components/PageLayout';

const ErudaProvider = dynamic(
  () => import('@/providers/Eruda').then((c) => c.ErudaProvider),
  { ssr: false },
);

// Define props for ClientProviders
interface ClientProvidersProps {
  children: ReactNode;
  session: Session | null; // Use the appropriate type for session from next-auth
}

/**
 * ClientProvider wraps the app with essential context providers.
 *
 * - ErudaProvider:
 *     - Should be used only in development.
 *     - Enables an in-browser console for logging and debugging.
 *
 * - MiniKitProvider:
 *     - Required for MiniKit functionality.
 *
 * This component ensures both providers are available to all child components.
 */
export default function ClientProviders({
  children,
  session,
}: ClientProvidersProps) {
  return (
    <>
      {process.env.NEXT_PUBLIC_ECOSYSTEM === 'world' && (
        <ErudaProvider>
          <MiniKitProvider>
            <SessionProvider session={session}>
              <Page className="flex flex-col game-background items-center justify-center">
                {children}
              </Page>
            </SessionProvider>
          </MiniKitProvider>
        </ErudaProvider>
      )}
      {process.env.NEXT_PUBLIC_ECOSYSTEM === 'farcaster' && (
        <FarcasterProvider>
          {/* <SessionProvider session={session}> */}
            <div className="flex flex-col min-h-screen mini-app-theme">
              <div className="flex flex-col flex-1 w-full max-w-md mx-auto game-background px-4 py-3">
                {children}
              </div>
            </div>
          {/* </SessionProvider> */}
        </FarcasterProvider>
      )}
    </>
  );
}

'use client';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

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
  // Log the raw env value to be sure Next.js sees it:
  console.log('[ClientProviders] NEXT_PUBLIC_DISABLE_WORLDCOIN =', process.env.NEXT_PUBLIC_DISABLE_WORLDCOIN);

  // Read the debug flag—if it’s "true", we skip the Worldcoin/MiniKit provider
  const disableWC = process.env.NEXT_PUBLIC_DISABLE_WORLDCOIN === 'true';

  return (
    <ErudaProvider>
      {disableWC ? (
        // If disabled, skip MiniKit and only wrap with SessionProvider
        <SessionProvider session={session}>{children}</SessionProvider>
      ) : (
        // Otherwise, use the normal Worldcoin MiniKitProvider → SessionProvider → children
        <MiniKitProvider>
          <SessionProvider session={session}>{children}</SessionProvider>
        </MiniKitProvider>
      )}
    </ErudaProvider>
  );
}

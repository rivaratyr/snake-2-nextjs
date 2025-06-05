'use client';

import { walletAuth } from '@/auth/wallet';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This component is an example of how to authenticate a user.
 * When NEXT_PUBLIC_DISABLE_WORLDCOIN=true, clicking the button routes you
 * directly to /lobby (skipping walletAuth).
 */
export const AuthButton = () => {
  console.log('[AuthButton] NEXT_PUBLIC_DISABLE_WORLDCOIN =', process.env.NEXT_PUBLIC_DISABLE_WORLDCOIN);
  const disableWC = process.env.NEXT_PUBLIC_DISABLE_WORLDCOIN === 'true';
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);
  const { isInstalled } = useMiniKit();

  const onClick = useCallback(async () => {
    // If debug flag is on, drop into lobby
    if (disableWC) {
      console.log('[AuthButton] Debug mode – redirecting to /lobby');
      router.push('/lobby');
      return;
    }

    if (!isInstalled || isPending) {
      return;
    }

    setIsPending(true);
    try {
      await walletAuth();
    } catch (error) {
      console.error('Wallet authentication button error', error);
      setIsPending(false);
      return;
    }

    setIsPending(false);
  }, [disableWC, isInstalled, isPending, router]);

  useEffect(() => {
    // Skip auto‐login when debug flag is on
    if (disableWC) {
      console.log('[AuthButton] Skipping auto‐authenticate because disableWC=true');
      return;
    }

    const authenticate = async () => {
      console.log('[AuthButton] Calling walletAuth() on mount');
      if (isInstalled && !isPending) {
        setIsPending(true);
        try {
          await walletAuth();
        } catch (error) {
          console.error('Auto wallet authentication error', error);
        } finally {
          setIsPending(false);
        }
      }
    };

    authenticate();
  }, [disableWC, isInstalled, isPending]);

  return (
    <LiveFeedback
      label={{
        failed: 'Failed to login',
        pending: 'Logging in',
        success: 'Logged in',
      }}
      state={isPending ? 'pending' : undefined}
    >
      <Button
        onClick={onClick}
        disabled={isPending}
        size="lg"
        variant="primary"
      >
        Login with Wallet
      </Button>
    </LiveFeedback>
  );
};

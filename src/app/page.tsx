"use client";

import { redirect } from 'next/navigation';
import { AuthButton } from '../components/AuthButton';
import { ConnectWallet, Wallet } from "@coinbase/onchainkit/wallet";
import { Name } from "@coinbase/onchainkit/identity";
import { signIn } from 'next-auth/react';
import { useAccount, useEnsName, useEnsAvatar } from "wagmi";

export default function Home() {

  /**
   * This is for debugging purposes only.
   * If you want to test the login flow, set USE_LOGIN to true in your .env file.
   */
  if (process.env.USE_LOGIN === 'false') {
    redirect('/home');
  }

  // Move hooks to the top level
  const { address } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName || undefined });

  // Use the hook values in your handler
  const nextSigninPrep = async () => {
    await signIn('coinbase', { redirectTo: '/home', address, ensName, ensAvatar });
  };

  return (
    <>
    {process.env.NEXT_PUBLIC_ECOSYSTEM === 'world' && (
      <AuthButton />
    )}
    {process.env.NEXT_PUBLIC_ECOSYSTEM === 'farcaster' && (
      <Wallet className="w-[90%] mx-auto">
        <ConnectWallet 
          className="text-xl w-full button-rounded button-purple game-font-white"
          onConnect={nextSigninPrep}
        >
          <Name className="text-inherit" />
        </ConnectWallet>
      </Wallet>
    )}
    </>
  );
}

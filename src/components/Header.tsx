"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { sdk } from '@farcaster/frame-sdk'
import { Button } from "./Button";
import { Icon } from "./Icon";
import {
  useMiniKit,
  useAddFrame,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";

export function Header() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);

  const addFrame = useAddFrame();
  
  useEffect(() => {
    if (!isFrameReady) {
      (async () => {
        console.log("Setting frame ready...");
        setFrameReady();
        await sdk.actions.ready();
      })();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
      const frameAdded = await addFrame();
      setFrameAdded(Boolean(frameAdded));
    }, [addFrame]);
  
    const saveFrameButton = useMemo(() => {
      if (context && !context.client.added) {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddFrame}
            className="text-[var(--app-accent)] p-4"
            icon={<Icon name="plus" size="sm" />}
          >
            Save Frame
          </Button>
        );
      }
  
      if (frameAdded) {
        return (
          <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
            <Icon name="check" size="sm" className="text-[#0052FF]" />
            <span>Saved</span>
          </div>
        );
      }
  
      return null;
    }, [context, frameAdded, handleAddFrame]);

  return (
    <header className="flex justify-between items-center mb-3 h-11">
      <div className="flex items-center space-x-2">
        <Wallet className="z-10">
          <ConnectWallet>
            <Name className="text-inherit" />
          </ConnectWallet>
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
              <Avatar />
              <Name />
              <Address />
              <EthBalance />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>
      <div>{saveFrameButton}</div>
      <div className="text-lg font-bold text-[var(--app-accent)]">{process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}</div>
      
    </header>
  );
}

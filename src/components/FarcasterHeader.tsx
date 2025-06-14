"use client";

import { useEffect, 
  // useState, useCallback 
} from "react";
import { sdk } from '@farcaster/frame-sdk'
// import { Button } from "./Button";
// import { Icon } from "./Icon";
import {
  useMiniKit,
  // useAddFrame,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  //Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";

export function FarcasterHeader() {
  const { 
    setFrameReady, 
    isFrameReady, 
    // context 
  } = useMiniKit();
  /* const [frameAdded, setFrameAdded] = useState(false);

  const addFrame = useAddFrame(); */
  
  useEffect(() => {
    if (!isFrameReady) {
      (async () => {
        console.log("Setting frame ready...");
        setFrameReady();
        await sdk.actions.ready();
      })();
    }
  }, [setFrameReady, isFrameReady]);

  /* const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]); */
  
    /* const saveFrameButton = useMemo(() => {
      if (context && !context.client.added) {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddFrame}
            className="p-4"
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
    }, [context, frameAdded, handleAddFrame]); */

  return (
    <header className="flex flex-col justify-between items-center space-y-2 mb-10">
      <div className="w-full text-center text-3xl game-font-yellow">{process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}</div>

      <div className="w-full items-center">
        <Wallet className="w-[90%] mx-auto">
          <ConnectWallet className="text-xl w-full button-rounded button-purple game-font-white">
            <Name className="text-inherit" />
          </ConnectWallet>
          <WalletDropdown className="panel w-full mt-10 mx-auto space-y-3">
            <Identity hasCopyAddressOnClick>
              <Avatar />
              <Name className="text-sm game-font-white" />
              <EthBalance className="text-sm game-font-white" />
            </Identity>
            <WalletDropdownDisconnect className="text-sm text-white items-center w-full game-font-white button-rounded button-green" />
          </WalletDropdown>
        </Wallet>
      </div>
      
    </header>
  );
}

"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomeContent() {

  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="text-white text-2xl font-bold">Loading...</div>
        </div>
      )}

      <div className="flex flex-row justify-between items-center gap-4 mb-8">
        <div className="statusbar-dark w-full py-1 px-0 ml-3 h-[26px] flex flex-row justify-between items-center relative">
          <Image src="/icons/gem.svg" alt="Gem" width={31.2} height={36} className="ml-[-10px]" />
          <span className="game-font-white">24</span>
          <button>
            <Image src="/icons/add.svg" alt="Add Gem" width={33.3} height={32.8} />
          </button>
        </div>
        <div className="statusbar-dark w-full py-1 px-0 ml-3 h-[26px] flex flex-row justify-between items-center">
          <Image src="/icons/coin.svg" alt="Coin" width={34} height={35} className="ml-[-10px]" />
          <span>1435</span>
          <button>
            <Image src="/icons/add.svg" alt="Add Coin" width={33.3} height={32.8} />
          </button>
        </div>
      </div>

      <div className="flex flex-row">
        <div className="statusbar-dark w-full py-2 px-2 mb-4 h-[54px] flex flex-row justify-between items-center relative rounded-[8px]">
          <div className="flex flex-col panel-blue items-center justify-center p-2 w-[38px] h-[38px] rounded-[4px]">
            <Image src="/icons/basic-user-icon.svg" alt="User Icon" width={33.3} height={32.8} />
          </div>
          <span className="text-md game-font-white">
            USERNAME
          </span>
          <div className="flex flex-row statusbar-dark h-[26px] rounded-full pr-4 space-x-1">
            <Image src="/icons/medal.svg" alt="Medal" width={20.7} height={28.7} className="ml-[-5px]" />
            <span className="game-font-white">234</span>
          </div>
        </div>
      </div>

      <div className="flex flex-row gap-4">
        <button className="flex flex-col w-full button-blue mb-4 justify-center items-center h-[87px] p-[10px] rounded-[10px] space-y-1">
          <Image src="/icons/quest.svg" alt="Quests" width={29.3} height={40} />
          Quests
        </button>
        <button className="flex flex-col w-full button-yellow mb-4 justify-center items-center h-[87px] p-[10px] rounded-[10px] space-y-1">
          <Image src="/icons/reward.svg" alt="Rewards" width={36.3} height={40} />
          Rewards
        </button>
      </div>

      <div className="flex flex-row w-1/2 justify-between items-center gap-4 mb-4 mx-auto py-[16px]">
        <div className="flex flex-col w-full space-y-1">
          <span className="text-md game-font-white">Rank 8</span>
          <div className="flex flex-row statusbar-dark rounded-full w-full h-[18px]">
            <div className="flex bar-yellow h-full" style={{ width: '50%' }}></div>
          </div>
        </div>
        <Image src="/icons/chest.svg" alt="Chest" width={45} height={38.8} />
      </div>

      <div className="flex flex-row gap-4 mb-4">
        <div className="flex flex-col w-2/3 relative">
          <Image src="/logo.png" fill alt="SnakeDuel" className="rounded-[16px]" style={{ objectFit: 'cover', objectPosition: 'top center' }} />
        </div>
        <div className="flex flex-col w-1/3 space-y-2">
          <button className="flex flex-col w-full button-teal mb-4 justify-center items-center h-[87px] p-[10px] rounded-[10px] space-y-1">
            <Image src="/icons/hammer.svg" alt="Skins" width={44} height={40} />
            Sssskins
          </button>
          <button className="flex flex-col w-full button-teal mb-4 justify-center items-center h-[87px] p-[10px] rounded-[10px] space-y-1">
            <Image src="/icons/house.svg" alt="Shop" width={37} height={40} />
            Shop
          </button>
        </div>
      </div>

      <div className="flex flex-row">
        <button
            type="button"
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                router.push('/lobby');
              }, 100);
            }}
            className="w-full button-rounded button-purple mb-4"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Duel'}
          </button>
      </div>

      <div className="flex flex-row">
        <button
            type="button"
            disabled
            className="w-full button-rounded button-grey mb-8"
          >
            Ranked
          </button>
      </div>
      <div className="flex flex-row"></div>
    </>
  );
}

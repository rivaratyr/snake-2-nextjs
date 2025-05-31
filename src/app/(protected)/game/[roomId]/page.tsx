// app/game/[roomId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/utils/socket';

interface RoomInfo {
  roomId: string;
  playersCount: number;
}

export default function GamePage() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();
  const [playersCount, setPlayersCount] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    const socket = getSocket();

    // 1) Join (or re‐join) the room on mount:
    socket.emit('lobby:joinRoom', { roomId });

    // 2) Get updated room list and update playersCount:
    socket.on('lobby:roomList', (roomList: RoomInfo[]) => {
      const thisRoom = roomList.find((r) => r.roomId === roomId);
      if (thisRoom) {
        setPlayersCount(thisRoom.playersCount);
      } else {
        // If the room vanished, go back to lobby
        router.push('/lobby');
      }
    });

    // 3) Listen for “room:ready” to flip our isReady flag:
    socket.on('room:ready', ({ roomId: readyId }: { roomId: string }) => {
      if (readyId === roomId) {
        setIsReady(true);
      }
    });

    // 4) If we get a roomError (e.g. somehow invalid), go back:
    socket.on('lobby:roomError', (errMsg: string) => {
      alert(errMsg);
      router.push('/lobby');
    });

    return () => {
      socket.off('lobby:roomList');
      socket.off('room:ready');
      socket.off('lobby:roomError');
    };
  }, [roomId, router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
      {/* Placeholder “Game Frame” */}
      <div className="border-4 border-gray-300 w-64 h-64 flex items-center justify-center bg-white shadow-md">
        <p className="text-gray-500">Game Frame</p>
      </div>

      <p className="mt-6 text-lg text-black">
        {isReady
          ? 'Both players joined. Starting game…'
          : `Waiting for players: ${playersCount}/2`}
      </p>
    </div>
  );
}

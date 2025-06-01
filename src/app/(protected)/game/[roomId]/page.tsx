// app/game/[roomId]/page.tsx
'use client';

import { useEffect, useRef, useState, TouchEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/utils/socket';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Cell { x: number; y: number; }

interface SnakeState {
  body: Cell[];
  direction: Direction;
  alive: boolean;
  score: number;
}

interface GameStatePayload {
  snakes: Record<string, SnakeState>;
  food: Cell;
}

export default function GamePage() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();
  const socket = getSocket();

  // 3→2→1 countdown
  const [countdown, setCountdown] = useState<number | null>(null);

  // Flag once countdown hits 0
  const [gameStarted, setGameStarted] = useState(false);

  // Canvas sizing
  const GRID_ROWS = 20;
  const GRID_COLS = 20;
  const [cellSize, setCellSize] = useState(15);

  // Authoritative state from server
  const [snakes, setSnakes] = useState<Record<string, SnakeState>>({});
  const [food, setFood] = useState<Cell>({ x: -1, y: -1 });

  // Our own socket ID (so we can display “You” vs “Opponent”)
  const [myId, setMyId] = useState<string>('');

  // Prevent 180° reversals
  const lastDirectionRef = useRef<Direction | null>(null);

  // For swipe detection
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 20; // pixels

  // --- Responsive cell size calculation ---
  useEffect(() => {
    const updateCellSize = () => {
      const screenW = window.innerWidth;
      const target = screenW * 0.9;
      const size = Math.floor(target / GRID_COLS);
      setCellSize(size > 5 ? size : 5);
    };
    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => {
      window.removeEventListener('resize', updateCellSize);
    };
  }, []);

  // --- Join room & listen for countdown (“room:ready”) ---
  useEffect(() => {
    // 1) Emit joinRoom
    socket.emit('lobby:joinRoom', { roomId });

    // 2) Capture our socket ID
    socket.on('connect', () => {
      setMyId(socket.id ?? '');
    });

    // 3) Handle “room:ready” from server
    socket.on('room:ready', ({ roomId: readyId }: { roomId: string }) => {
      if (readyId === roomId) {
        setCountdown(3);
      }
    });

    // 4) Handle errors or room deletion
    socket.on('lobby:roomError', (errMsg: string) => {
      alert(errMsg);
      router.push('/lobby');
    });
    socket.on(
      'lobby:roomList',
      (roomList: { roomId: string; playersCount: number }[]) => {
        const found = roomList.some((r) => r.roomId === roomId);
        if (!found) {
          router.push('/lobby');
        }
      }
    );

    return () => {
      socket.off('connect');
      socket.off('room:ready');
      socket.off('lobby:roomError');
      socket.off('lobby:roomList');
    };
  }, [roomId, router, socket]);

  // --- Countdown logic (3→2→1→0) ---
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(
        () => setCountdown((c) => (c! > 0 ? c! - 1 : 0)),
        1000
      );
      return () => clearTimeout(timer);
    }
    if (countdown === 0) {
      // Now the countdown is done, begin listening to game state
      setGameStarted(true);

      // 1) game:state → update snakes + food
      socket.on('game:state', (payload: GameStatePayload) => {
        setSnakes(payload.snakes);
        setFood(payload.food);
      });

      // 2) game:over → show result, emit leaveRoom, then redirect
      socket.on(
        'game:over',
        ({ winnerId, result }: { winnerId?: string; result?: string }) => {
          // Before redirecting, tell server we are leaving this room
          socket.emit('lobby:leaveRoom', { roomId });

          if (result === 'draw') {
            alert('Draw!');
          } else if (winnerId === myId) {
            alert('You WIN!');
          } else {
            alert('You LOSE.');
          }
          router.push('/lobby');
        }
      );
    }
  }, [countdown, myId, router, roomId, socket]);

  // --- Draw canvas & scores whenever snakes/food update ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!gameStarted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw food (red)
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);

    // Draw each snake
    Object.entries(snakes).forEach(([playerId, sd]) => {
      const isMe = playerId === myId;
      sd.body.forEach((seg, idx) => {
        if (idx === 0) {
          // Head: darker shade
          ctx.fillStyle = isMe ? '#155724' : '#004085';
        } else {
          // Body
          ctx.fillStyle = isMe ? 'green' : 'blue';
        }
        ctx.fillRect(seg.x * cellSize, seg.y * cellSize, cellSize, cellSize);
      });
    });

    // Draw scores above the canvas
    ctx.clearRect(0, -30, canvas.width, 30);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'black';
    const myScore = snakes[myId]?.score ?? 0;
    const opponentId = Object.keys(snakes).find((id) => id !== myId) || '';
    const oppScore = opponentId ? snakes[opponentId]?.score : 0;
    const myLabel = 'You';
    const oppLabel = 'Opponent';
    const scoreText = `${myLabel}: ${myScore}    ${oppLabel}: ${oppScore}`;
    ctx.fillText(scoreText, 10, -10);
  }, [snakes, food, cellSize, gameStarted, myId]);

  // --- Handle direction change (called by keys, buttons, or swipe) ---
  const changeDirection = (newDir: Direction) => {
    const opposite: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };
    // Prevent reversing 180°
    if (lastDirectionRef.current === newDir) return;
    if (
      lastDirectionRef.current &&
      opposite[lastDirectionRef.current] === newDir
    )
      return;
    lastDirectionRef.current = newDir;
    socket.emit('game:changeDirection', { roomId, newDirection: newDir });
  };

  // Keyboard arrow keys for desktop
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          changeDirection('up');
          break;
        case 'ArrowDown':
          changeDirection('down');
          break;
        case 'ArrowLeft':
          changeDirection('left');
          break;
        case 'ArrowRight':
          changeDirection('right');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [roomId, socket]);

  // --- Touch handlers for swipe on mobile ---
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      // Horizontal swipe
      if (dx > 0) {
        changeDirection('right');
      } else {
        changeDirection('left');
      }
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_THRESHOLD) {
      // Vertical swipe
      if (dy > 0) {
        changeDirection('down');
      } else {
        changeDirection('up');
      }
    }
  };

  // --- Render ---
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
      {/* Wrapper for touch events */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ position: 'relative' }}
      >
        {/* Canvas with margin-top so scores (drawn at y=-10) are visible */}
        <canvas
          ref={canvasRef}
          width={GRID_COLS * cellSize}
          height={GRID_ROWS * cellSize}
          style={{ marginTop: '30px' }}
          className="border border-gray-400"
        />
      </div>

      {/* Countdown / Status */}
      {!gameStarted && countdown !== null && countdown > 0 && (
        <p className="mt-4 text-4xl font-bold text-black">{countdown}</p>
      )}
      {!gameStarted && countdown !== null && countdown === 0 && (
        <p className="mt-4 text-2xl font-semibold text-black">Go!</p>
      )}
      {!gameStarted && countdown === null && (
        <p className="mt-4 text-lg font-semibold text-black">
          Waiting for opponent…
        </p>
      )}

      {/* On‐screen arrow controls (shown once gameStarted = true) */}
      {gameStarted && (
        <div className="mt-4 flex flex-col items-center space-y-1">
          <button
            onClick={() => changeDirection('up')}
            className="bg-gray-200 p-2 rounded"
          >
            ↑
          </button>
          <div className="flex space-x-1">
            <button
              onClick={() => changeDirection('left')}
              className="bg-gray-200 p-2 rounded"
            >
              ←
            </button>
            <button
              onClick={() => changeDirection('right')}
              className="bg-gray-200 p-2 rounded"
            >
              →
            </button>
          </div>
          <button
            onClick={() => changeDirection('down')}
            className="bg-gray-200 p-2 rounded"
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );
}

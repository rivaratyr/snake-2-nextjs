// src/app/(protected)/game/[roomId]/page.tsx
'use client';

import {
  useEffect,
  useRef,
  useState,
  TouchEvent,
  useCallback,
} from 'react';
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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
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

  // Track previous food position for "eat" detection
  const prevFoodRef = useRef<Cell>({ x: -1, y: -1 });

  // Our own socket ID (so we can display “You” vs “Opponent”)
  const [myId, setMyId] = useState<string>('');

  // Prevent 180° reversals
  const lastDirectionRef = useRef<Direction | null>(null);

  // For swipe detection
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 20; // pixels

  // Refs to canvases
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);

  // Particle state
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

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

  // --- Particle animation loop ---
  const animateParticles = useCallback(() => {
    const ctx = particleCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear the entire particle canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Update and draw each particle
    const nowParticles: Particle[] = [];
    particlesRef.current.forEach((p) => {
      // Move
      p.x += p.vx;
      p.y += p.vy;
      // Fade and shrink
      p.alpha -= 0.02;
      p.size *= 0.96;
      if (p.alpha > 0 && p.size > 0.5) {
        // Draw circle
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        nowParticles.push(p);
      }
    });
    particlesRef.current = nowParticles;

    animationRef.current = requestAnimationFrame(animateParticles);
  }, []);

  // Start particle animation loop once
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animateParticles);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animateParticles]);

  // --- Join room & listen for countdown (“room:ready”) ---
  useEffect(() => {
    // Immediately capture socket.id
    setMyId(socket.id);

    // Emit joinRoom
    socket.emit('lobby:joinRoom', { roomId });

    // In case the socket reconnects later, update myId again
    socket.on('connect', () => {
      setMyId(socket.id);
    });

    // Handle “room:ready” from server
    socket.on('room:ready', ({ roomId: readyId }: { roomId: string }) => {
      if (readyId === roomId) {
        setCountdown(5);
      }
    });

    // Handle errors or room deletion
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

      // 1) game:state → update snakes + food & detect “eat”
      socket.on('game:state', (payload: GameStatePayload) => {
        // Detect if any snake head is on prevFood location → trigger particles
        Object.values(payload.snakes).forEach((snake) => {
          const head = snake.body[0];
          if (
            prevFoodRef.current.x === head.x &&
            prevFoodRef.current.y === head.y
          ) {
            // Convert grid coords to pixel center
            const px = head.x * cellSize + cellSize / 2;
            const py = head.y * cellSize + cellSize / 2;
            for (let i = 0; i < 20; i++) {
              // create ~20 particles
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * 2 + 1;
              particlesRef.current.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                size: Math.random() * 4 + 2,
              });
            }
          }
        });

        // Update prevFood, then update state
        prevFoodRef.current = payload.food;
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
  }, [countdown, cellSize, myId, router, roomId, socket]);

  // --- Draw canvas & scores whenever snakes/food update ---
  const drawMainCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas || !gameStarted) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size in case cellSize changed
    canvas.width = GRID_COLS * cellSize;
    canvas.height = GRID_ROWS * cellSize;

    // 1) Draw dashed background grid
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e2e8f0'; // light gray
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    for (let i = 0; i <= GRID_COLS; i++) {
      const x = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j <= GRID_ROWS; j++) {
      const y = j * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 2) Draw food as 🍎
    ctx.font = `${cellSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fx = food.x * cellSize + cellSize / 2;
    const fy = food.y * cellSize + cellSize / 2;
    ctx.fillText('🍎', fx, fy);

    // 3) Draw each snake
    Object.entries(snakes).forEach(([playerId, sd]) => {
      const isMe = playerId === myId;
      sd.body.forEach((seg, idx) => {
        const px = seg.x * cellSize;
        const py = seg.y * cellSize;
        if (idx === 0) {
          ctx.fillStyle = isMe ? '#155724' : '#004085'; // darker head
        } else {
          ctx.fillStyle = isMe ? 'green' : 'blue';
        }
        ctx.fillRect(px, py, cellSize, cellSize);
      });
    });

    // 4) Draw scores above the canvas
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
  }, [cellSize, food, gameStarted, myId, snakes]);

  useEffect(() => {
    drawMainCanvas();
  }, [drawMainCanvas, snakes, food]);

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
      {/* Outer container with gradient border & shadow */}
      <div className="relative border-4 border-gradient-to-r from-green-400 to-blue-600 rounded-xl shadow-xl">
        {/* Main game canvas */}
        <canvas
          ref={mainCanvasRef}
          width={GRID_COLS * cellSize}
          height={GRID_ROWS * cellSize}
          className="rounded-lg bg-white"
        />

        {/* Particle overlay canvas (absolute on top) */}
        <canvas
          ref={particleCanvasRef}
          width={GRID_COLS * cellSize}
          height={GRID_ROWS * cellSize}
          className="absolute top-0 left-0 pointer-events-none"
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
        <div className="mt-6 flex flex-col items-center space-y-4 space-x-4">
          <button
            onClick={() => changeDirection('up')}
            className="bg-gray-200 p-4 rounded-full shadow-lg text-2xl"
          >
            ↑
          </button>
          <div className="flex space-x-6">
            <button
              onClick={() => changeDirection('left')}
              className="bg-gray-200 p-4 rounded-full shadow-lg text-2xl"
            >
              ←
            </button>
            <button
              onClick={() => changeDirection('right')}
              className="bg-gray-200 p-4 rounded-full shadow-lg text-2xl"
            >
              →
            </button>
          </div>
          <button
            onClick={() => changeDirection('down')}
            className="bg-gray-200 p-4 rounded-full shadow-lg text-2xl"
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );
}

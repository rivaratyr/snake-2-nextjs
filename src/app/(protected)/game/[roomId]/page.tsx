// src/app/(protected)/game/[roomId]/page.tsx
'use client';

import { Pay } from '@/components/Pay';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/utils/socket';
import { GameBoard } from '@/components/GameBoard';


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
const [hasMounted, setHasMounted] = useState(false);
useEffect(() => {
  setHasMounted(true);
}, []);

export default function GamePage() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();
  const socket = getSocket();

  // 3→2→1 countdown
  const [countdown, setCountdown] = useState<number | null>(null);

  // Flag once countdown hits 0
  const [gameStarted, setGameStarted] = useState(false);
  // Show modal to start game (when both players join)
  const [showStartModal, setShowStartModal] = useState(false);
  // Track if this player has pressed ready
  const [hasPressedReady, setHasPressedReady] = useState(false);

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

  // Refs to canvases
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);

  // Particle state
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);

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

  // --- Join room & listen for server events ---
  useEffect(() => {
    // Immediately capture socket.id
    setMyId(socket.id || '');

    // Emit joinRoom
    socket.emit('lobby:joinRoom', { roomId });

    // In case the socket reconnects later, update myId again
    socket.on('connect', () => {
      setMyId(socket.id || '');
    });

    // Listen for "room:showReady" to show the ready modal
    socket.on('room:showReady', ({ roomId: readyId }: { roomId: string }) => {
      if (readyId === roomId) {
        setShowStartModal(true);
        setHasPressedReady(false);
        setCountdown(null);
        setGameStarted(false);
      }
    });

    // Listen for "room:ready" to start the countdown
    socket.on('room:ready', ({ roomId: readyId }: { roomId: string }) => {
      if (readyId === roomId) {
        setShowStartModal(false);
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
      socket.off('room:showReady');
      socket.off('room:ready');
      socket.off('lobby:roomError');
      socket.off('lobby:roomList');
    };
  }, [roomId, router, socket]);

  // --- Always listen for game:state and game:over ---
  useEffect(() => {
    // 1) game:state → update snakes + food & detect “eat”
    const handleGameState = (payload: GameStatePayload) => {
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
    };

    // 2) game:over → show result, emit leaveRoom, then redirect
    const handleGameOver = ({
      winnerId,
      result,
    }: { winnerId?: string; result?: string }) => {
      socket.emit('lobby:leaveRoom', { roomId });

      if (result === 'draw') {
        setTimeout(() => {
          setShowStartModal(true);
          alert('Draw!');
        }, 100);
      } else if (winnerId === myId) {
        alert('You WIN!');
      } else {
        alert('You LOSE.');
      }
      router.push('/lobby');
    };

    socket.on('game:state', handleGameState);
    socket.on('game:over', handleGameOver);

    return () => {
      socket.off('game:state', handleGameState);
      socket.off('game:over', handleGameOver);
    };
  }, [cellSize, myId, router, roomId, socket]);

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
      setGameStarted(true);
    }
  }, [countdown]);

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

  // --- Render ---
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
      {/* Outer container with gradient border & shadow */}
      <div className="relative border-4 border-gradient-to-r from-green-400 to-blue-600 rounded-xl shadow-xl">
        {/* Main game canvas */}
        <div className="flex justify-center items-center mt-4">
          <GameBoard snakes={Object.values(snakes)} food={food} gridSize={GRID_ROWS} />
        </div>
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

      {/* Modal to start game */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center space-y-4">
            <h2 className="text-2xl font-bold mb-4">Ready to start?</h2>

            <Pay />
            
            <Button
              onClick={() => {
                if (!hasPressedReady) {
                  socket.emit('player:ready', { roomId });
                  setHasPressedReady(true);
                }
              }}
              disabled={hasPressedReady}
              size="lg"
              variant="secondary"
              className="w-full mt-4"
            >
              {hasPressedReady ? "Waiting for opponent..." : "I'm Ready"}
            </Button>

            {hasPressedReady && (
              <p className="mt-4 text-gray-700">Waiting for opponent to be ready…</p>
            )}
          </div>
        </div>
      )}

      {/* On‐screen arrow controls (shown once gameStarted = true) */}
      {gameStarted && (
        <div className="mt-6 flex flex-col items-center space-y-4 space-x-4">

          <button
            onClick={() => changeDirection('up')}
            className="bg-gray-200 w-16 h-16 p-4 rounded-full shadow-lg text-2xl text-black text-center border-1 border-black"
          >
            ↑
          </button>

          <div className="flex flex-row space-x-6">
            <button
              onClick={() => changeDirection('left')}
              className="bg-gray-200 w-16 h-16 p-4 rounded-full shadow-lg text-2xl text-black text-center border-1 border-black"
            >
              ←
            </button>
            <button
              onClick={() => changeDirection('right')}
              className="bg-gray-200 w-16 h-16 p-4 rounded-full shadow-lg text-2x text-black text-center border-1 border-black"
            >
              →
            </button>
          </div>
          <button
            onClick={() => changeDirection('down')}
            className="bg-gray-200 w-16 h-16 p-4 rounded-full shadow-lg text-2xl text-black text-center border-1 border-black"
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );
}

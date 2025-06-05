// File: src/app/(protected)/game/[roomId]/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import SnakeBoard, { Position } from '@/components/SnakeBoard';

// Board constants
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE: Position[] = [
  { x: 9, y: 9 },
  { x: 8, y: 9 },
  { x: 7, y: 9 },
];
const INITIAL_DIRECTION: Position = { x: 1, y: 0 };
const MOVE_INTERVAL_MS = 200;

// Particle interface
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  alpha: number;
  color: string;
}

export default function GamePage() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();

  // Common state
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Position>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>(() =>
    generateFoodPosition(INITIAL_SNAKE)
  );
  const [score, setScore] = useState(0);

  // Refs
  const moveRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const prevFoodRef = useRef<Position>(food);

  // Canvas & particles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  // Restart logic common to both modes
  const restartGame = useCallback((): Position[] => {
    alert('Game Over! Starting new game.');
    setDirection(INITIAL_DIRECTION);
    const newInitial = [...INITIAL_SNAKE];
    setFood(generateFoodPosition(newInitial));
    setScore(0);
    return newInitial;
  }, []);

  // ---------------------------
  // 1) SINGLE-PLAYER MODE
  // ---------------------------
  useEffect(() => {
    if (roomId !== 'single') return;

    // Clear any existing multiplayer socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Local move logic
    function moveSnakeLocal() {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const newHead = { x: head.x + direction.x, y: head.y + direction.y };

        // Wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          return restartGame();
        }

        // Self-collision
        if (
          prevSnake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)
        ) {
          return restartGame();
        }

        // Check if ate food
        const ate = newHead.x === food.x && newHead.y === food.y;

        // If ate, trigger particles
        if (ate) {
          triggerParticles(food.x, food.y);
        }

        const newSnake = [newHead, ...prevSnake];
        if (!ate) {
          newSnake.pop();
        } else {
          const nextFood = generateFoodPosition(newSnake);
          setFood(nextFood);
          prevFoodRef.current = nextFood;
          setScore((s) => s + 1);
        }

        return newSnake;
      });
    }

    // Start interval
    moveRef.current = setInterval(moveSnakeLocal, MOVE_INTERVAL_MS);

    return () => {
      if (moveRef.current) {
        clearInterval(moveRef.current);
      }
    };
  }, [roomId, direction, food, restartGame]);

  // ---------------------------
  // 2) MULTIPLAYER MODE
  // ---------------------------
  useEffect(() => {
    if (roomId === 'single') return;

    const socket = io();
    socketRef.current = socket;

    // Join room
    socket.emit('joinRoom', roomId);

    // On game state updates
    socket.on(
      'gameState',
      (state: { snake: Position[]; food: Position; score: number }) => {
        // Detect eating: if prevFoodRef matches head position before update
        const prevFood = prevFoodRef.current;
        const headBefore = snake[0];
        const headAfter = state.snake[0];
        if (headAfter.x === prevFood.x && headAfter.y === prevFood.y) {
          triggerParticles(prevFood.x, prevFood.y);
        }

        setSnake(state.snake);
        setFood(state.food);
        prevFoodRef.current = state.food;
        setScore(state.score);
      }
    );

    // On game over
    socket.on('gameOver', () => {
      setSnake((prev) => restartGame());
      socket.emit('restart', roomId);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, restartGame, snake]);

  // ---------------------------
  // 3) HANDLE ARROW KEYS
  // ---------------------------
  const handleArrowKey = useCallback(
    (newDir: Position) => {
      if (newDir.x === -direction.x && newDir.y === -direction.y) {
        return;
      }
      setDirection(newDir);

      if (roomId !== 'single' && socketRef.current) {
        socketRef.current.emit('playerMove', { roomId, direction: newDir });
      }
    },
    [direction, roomId]
  );

  // ---------------------------
  // 4) PARTICLE LOGIC
  // ---------------------------
  // Initialize canvas size and start animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      const alive: Particle[] = [];

      for (const p of particles) {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        // Gravity effect
        p.vy += 0.1;
        // Fade out
        p.life -= 1;
        p.alpha = Math.max(p.life / 60, 0);
        if (p.life > 0) {
          alive.push(p);
          ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      particlesRef.current = alive;
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Emit particles at grid coordinates
  function triggerParticles(gridX: number, gridY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const offsetX = rect.left;
    const offsetY = rect.top;

    // Compute center pixel of the cell
    const px = gridX * CELL_SIZE + CELL_SIZE / 2;
    const py = gridY * CELL_SIZE + CELL_SIZE / 2;

    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      newParticles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 60,
        alpha: 1,
        color: '255,165,0', // orange
      });
    }
    particlesRef.current = particlesRef.current.concat(newParticles);
  }

  // ---------------------------
  // 5) CLEANUP ON UNMOUNT
  // ---------------------------
  useEffect(() => {
    return () => {
      if (moveRef.current) {
        clearInterval(moveRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // ---------------------------
  // 6) EXIT BUTTON
  // ---------------------------
  const handleExit = () => {
    if (socketRef.current && roomId !== 'single') {
      socketRef.current.emit('leaveRoom', roomId);
    }
    router.push('/lobby');
  };

  // ---------------------------
  // 7) RENDER
  // ---------------------------
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md relative">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            {roomId === 'single' ? 'Single Player Snake' : `Room: ${roomId}`}
          </h1>
          <button
            onClick={handleExit}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            {roomId === 'single' ? 'Back to Lobby' : 'Leave Room'}
          </button>
        </div>

        {/* Board container: relative to position canvas */}
        <div
          className="relative"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
          }}
        >
          {/* SnakeBoard renders the grid */}
          <SnakeBoard
            snake={snake}
            food={food}
            gridSize={GRID_SIZE}
            cellSize={CELL_SIZE}
            onArrowKey={handleArrowKey}
            score={score}
          />
          {/* Canvas overlay for particles */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}

// Utility: generate a random food position not on the snake
function generateFoodPosition(snakeBody: Position[]): Position {
  while (true) {
    const newPos: Position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    const collision = snakeBody.some(
      (seg) => seg.x === newPos.x && seg.y === newPos.y
    );
    if (!collision) return newPos;
  }
}

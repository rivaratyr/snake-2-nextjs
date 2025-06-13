'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SnakeState, Cell, Direction, moveSnake, generateFood } from '@/lib/game-core';
import { GameBoard } from '@/components/GameBoard';
import { DPad } from '@/components/DPad/DPad';

const gridSize = 20;

function createInitialSnake(): SnakeState {
  return {
    body: [{ x: 10, y: 10 }],
    direction: 'right',
    alive: true,
    score: 0,
  };
}

export default function SinglePlayerGame() {
  const [snake, setSnake] = useState<SnakeState>(createInitialSnake);
  const [food, setFood] = useState<Cell>(generateFood(gridSize, createInitialSnake()));
  const [tickInterval, setTickInterval] = useState<NodeJS.Timeout | null>(null);
  const [particles, setParticles] = useState<{ x: number; y: number; id: number }[]>([]);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<Direction>('right');


  const [aiSnake, setAiSnake] = useState<SnakeState>({
    body: [{ x: 0, y: 0 }],
    direction: "down",
    alive: true,
    score: 0,
  });

  const changeDirection = (newDir: Direction) => {
    const opposite: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };

    if (
      lastDirectionRef.current &&
      opposite[lastDirectionRef.current] === newDir
    ) {
      return;
    }

    lastDirectionRef.current = newDir;
    setSnake((prev) => ({ ...prev, direction: newDir }));
  };
  interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  }

  const animateParticles = useCallback(() => {
  const ctx = particleCanvasRef.current?.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const nextParticles: Particle[] = [];

  for (const p of particlesRef.current) {
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.02;
    p.size *= 0.96;

    if (p.alpha > 0 && p.size > 0.5) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      nextParticles.push(p);
    }
  }

  particlesRef.current = nextParticles;
  animationRef.current = requestAnimationFrame(animateParticles);
  }, []);

  function getAiDirection(ai: SnakeState, target: Cell): Direction {
    const head = ai.body[0];
    if (Math.abs(target.x - head.x) > Math.abs(target.y - head.y)) {
      return target.x > head.x ? "right" : "left";
    } else {
      return target.y > head.y ? "down" : "up";
    }
  }
  function triggerParticles(center: Cell) {
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      x: center.x,
      y: center.y,
      id: Date.now() + i,
      angle: (i * 360) / 12, // evenly spread in a circle
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    // Remove them after animation
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id < Date.now()));
    }, 600);
  }

  // Initialize canvases
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animateParticles);
    return () => {
     if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animateParticles]);
  // Controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      setSnake(prev => {
        const dirMap: Record<string, Direction> = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        };
        const newDir = dirMap[e.key];
        if (newDir && newDir !== prev.direction) {
          return { ...prev, direction: newDir };
        }
        return prev;
      });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
     setSnake((prev) => {
  const { snake: moved, ate } = moveSnake(prev, food);
  const nextHead = moved.body[0];

  const outOfBounds =
    nextHead.x < 0 ||
    nextHead.x >= gridSize ||
    nextHead.y < 0 ||
    nextHead.y >= gridSize;

  if (outOfBounds) {
    clearInterval(interval); // or call your gameOver() handler
    return { ...prev, alive: false };
  }

  if (ate) {
    const px = food.x * gridSize + gridSize / 2;
    const py = food.y * gridSize + gridSize / 2;
    for (let i = 0; i < 20; i++) {
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
    setFood(generateFood(gridSize, moved));
  }

  triggerParticles(moved.body[0]);
  return moved;
  });

      // AI snake
      setAiSnake((prev) => {
        const dir = getAiDirection(prev, food);
        const withDir = { ...prev, direction: dir };
        const { snake: moved, ate } = moveSnake(withDir, food);
        if (ate) {
          setFood(generateFood(gridSize, moved));
          setParticles((prevParticles) => [
            ...prevParticles,
            {
              x: food.x,
              y: food.y,
              id: Date.now(), // unique identifier
            },
          ]);
        }
        return moved;
      });
    }, 200);
    setTickInterval(interval);
      return () => clearInterval(interval);
    }, [food]);

  useEffect(() => {
    if (particles.length === 0) return;
    const timeout = setTimeout(() => {
      setParticles([]);
    }, 500); // animation duration
    return () => clearTimeout(timeout);
  }, [particles]);

  useEffect(() => {
    const canvas = mainCanvasRef.current;
    const particleCanvas = particleCanvasRef.current;
    if (canvas && particleCanvas) {
      const size = gridSize * 20; // match your cell size
      canvas.width = size;
      canvas.height = size;
      particleCanvas.width = size;
      particleCanvas.height = size;
    }
  }, []);

  return (
    <div className="relative p-4 text-white min-h-screen flex flex-col items-center">
      <div className="p-4 text-white">
        <h1 className="text-xl font-bold">Single Player Snake</h1>
        <div className="mb-4 space-x-4 flex">
          {[snake, aiSnake].map((s, i) => (
            <div
              key={i}
              className="text-sm text-white bg-gray-800 px-2 py-1 rounded"
            >
              Player {i + 1}: {s.score}
            </div>
          ))}
        </div>
        {!snake.alive && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-black bg-opacity-80 px-8 py-6 rounded-xl text-center shadow-lg pointer-events-auto">
              <h2 className="text-4xl font-bold text-white mb-4">Game Over</h2>
              <p className="text-xl text-white mb-4">Score: {snake.score}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition"
              >
                Restart
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <canvas ref={mainCanvasRef} className="absolute top-0 left-0 z-10" />
          <canvas
            ref={particleCanvasRef}
            className="absolute top-0 left-0 z-20"
          />
          
          <GameBoard
            snakes={[snake, aiSnake]}
            food={food}
            gridSize={gridSize}
          />
          <DPad onDirection={changeDirection} />
        </div>
      </div>
    </div>
  );
}

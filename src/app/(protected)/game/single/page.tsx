'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SnakeState,
  Cell,
  Direction,
  moveSnake,
  generateFood,
} from '@/lib/game-core';

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
      setSnake(prev => {
        const { snake: moved, ate } = moveSnake(prev, food);
        if (ate) setFood(generateFood(gridSize, moved));
        return moved;
      });
    }, 200);
    setTickInterval(interval);
    return () => clearInterval(interval);
  }, [food]);

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl font-bold">Single Player Snake</h1>
      <p>Score: {snake.score}</p>
      <div className="grid grid-cols-20 gap-1 mt-4">
        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
          const x = i % gridSize;
          const y = Math.floor(i / gridSize);
          const isSnake = snake.body.some(cell => cell.x === x && cell.y === y);
          const isFood = food.x === x && food.y === y;
          return (
            <div key={i} className={`w-4 h-4 ${isSnake ? 'bg-green-500' : isFood ? 'bg-red-500' : 'bg-gray-800'}`} />
          );
        })}
      </div>
    </div>
  );
}

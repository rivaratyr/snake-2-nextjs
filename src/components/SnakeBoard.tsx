// File: src/components/SnakeBoard.tsx
'use client';

import { useEffect } from 'react';

export interface Position {
  x: number;
  y: number;
}

interface SnakeBoardProps {
  snake: Position[];
  food: Position;
  gridSize: number; // e.g. 20 for a 20×20 board
  cellSize: number; // e.g. 20px
  onArrowKey: (direction: Position) => void;
  score?: number;
}

export default function SnakeBoard({
  snake,
  food,
  gridSize,
  cellSize,
  onArrowKey,
  score,
}: SnakeBoardProps) {
  // Listen for arrow‐key events and translate to direction callbacks
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowUp':
          onArrowKey({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          onArrowKey({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          onArrowKey({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          onArrowKey({ x: 1, y: 0 });
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onArrowKey]);

  return (
    <div className="flex flex-col items-center">
      {typeof score === 'number' && (
        <div className="mb-4 text-lg font-semibold">Score: {score}</div>
      )}

      <div
        className="relative"
        style={{
          width: gridSize * cellSize,
          height: gridSize * cellSize,
          border: '2px solid #333',
          backgroundColor: '#fafafa',
        }}
      >
        {Array.from({ length: gridSize }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex"
            style={{ width: '100%' }}
          >
            {Array.from({ length: gridSize }).map((_, colIdx) => {
              const isSnake = snake.some(
                (seg) => seg.x === colIdx && seg.y === rowIdx
              );
              const isFood = food.x === colIdx && food.y === rowIdx;
              return (
                <div
                  key={colIdx}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: isSnake
                      ? '#22c55e'
                      : isFood
                      ? '#ef4444'
                      : '#fff',
                    border: '1px solid #ccc',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

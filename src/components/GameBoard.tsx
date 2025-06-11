'use client';

import React from 'react';
import { Cell, SnakeState } from '@/lib/game-core';

interface GameBoardProps {
  snakes: SnakeState[];
  food: Cell;
  gridSize: number;
  particles?: { x: number; y: number; id: number }[];
}

export const GameBoard: React.FC<GameBoardProps> = ({
  snakes,
  food,
  gridSize,
  particles,
  cellSize = 20
}) => {
  const boardStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
    gap: '1px',
    backgroundColor: '#222',
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={boardStyle}>
        {Array.from({ length: gridSize * gridSize }).map((_, index) => {
          const x = index % gridSize;
          const y = Math.floor(index / gridSize);

          let backgroundColor = "#111";
          let head = false;
          let snakeIndex = -1;

          // Detect snake segment
          snakes.forEach((snake, idx) => {
            if (snake.body.some((cell) => cell.x === x && cell.y === y)) {
              backgroundColor = "#22c55e"; // green
              snakeIndex = idx;

              if (snake.body[0].x === x && snake.body[0].y === y) {
                backgroundColor = "#16a34a"; // darker green for head
                head = true;
              }
            }
          });

          // Detect food
          if (food.x === x && food.y === y) {
            backgroundColor = "#ef4444"; // red
          }

          return (
            <div
              key={index}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                backgroundColor,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
                color: "#fff",
                fontWeight: head ? "bold" : "normal",
              }}
            >
              {head
                ? (() => {
                    const dir = snakes[snakeIndex]?.direction;
                    switch (dir) {
                      case "up":
                        return "↑";
                      case "down":
                        return "↓";
                      case "left":
                        return "←";
                      case "right":
                        return "→";
                      default:
                        return "●";
                    }
                  })()
                : snakeIndex >= 0
                ? snakeIndex + 1
                : ""}
            </div>
          );
        })}
      </div>

      {/* Particle overlay layer */}
      {particles?.map((p) => (
        <div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300"
          style={{
            left: `${p.x * cellSize + cellSize / 2}px`,
            top: `${p.y * cellSize + cellSize / 2}px`,
            transform: `translate(-50%, -50%) rotate(${p.angle}deg)`,
            animation: `explode 0.6s ease-out`,
            zIndex: 50,
          }}
        />
      ))}
    </div>
  );
};

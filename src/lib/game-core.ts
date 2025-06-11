export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cell {
  x: number;
  y: number;
}

export interface SnakeState {
  body: Cell[];
  direction: Direction;
  alive: boolean;
  score: number;
}

// Move snake based on direction
export function getNextHead(snake: SnakeState): Cell {
  const head = snake.body[0];
  switch (snake.direction) {
    case 'up': return { x: head.x, y: head.y - 1 };
    case 'down': return { x: head.x, y: head.y + 1 };
    case 'left': return { x: head.x - 1, y: head.y };
    case 'right': return { x: head.x + 1, y: head.y };
  }
}

export function moveSnake(snake: SnakeState, food: Cell): { snake: SnakeState; ate: boolean } {
  const nextHead = getNextHead(snake);
  const newBody = [nextHead, ...snake.body];
  let ate = false;

  if (nextHead.x === food.x && nextHead.y === food.y) {
    snake.score += 1;
    ate = true;
  } else {
    newBody.pop(); // Don't grow
  }

  return {
    snake: {
      ...snake,
      body: newBody,
    },
    ate,
  };
}

export function generateFood(gridSize: number, snake: SnakeState): Cell {
  let cell: Cell;
  do {
    cell = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
  } while (snake.body.some(s => s.x === cell.x && s.y === cell.y));
  return cell;
}

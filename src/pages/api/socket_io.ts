// pages/api/socket_io.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Server } from 'socket.io';

/**
 * In‐memory storage:
 * - userNames maps socketId → username.
 * - rooms maps roomId → a Set of socket IDs that have joined.
 */
const userNames: Record<string, string> = {};
const rooms: Record<string, { players: Set<string> }> = {};

// Per‐room game data:
interface Cell { x: number; y: number; }
type Direction = 'up' | 'down' | 'left' | 'right';

interface SnakeState {
  body: Cell[];
  direction: Direction;
  alive: boolean;
  score: number; // How many foods this snake has eaten
}

interface GameData {
  snakes: Record<string, SnakeState>; // socketId → SnakeState
  food: Cell;
  status: 'waiting' | 'playing' | 'finished';
  startTimeout?: NodeJS.Timeout;  // Timeout for 3s countdown
  intervalId?: NodeJS.Timeout;    // Interval for game ticks
  readyPlayers: Set<string>;      // Track which players pressed "Start"
}

const gameDataByRoom: Record<string, GameData> = {}; // roomId → GameData

// Grid dimensions for the snake game
const GRID_COLS = 20;
const GRID_ROWS = 20;

/** Returns a list of rooms with their current player counts */
function getRoomsArray() {
  return Object.entries(rooms).map(([roomId, room]) => ({
    roomId,
    playersCount: room.players.size,
  }));
}

/** Place food at a random empty cell (no overlap with any snake segment) */
function placeFood(game: GameData) {
  let fx: number, fy: number, collision: boolean;
  do {
    fx = Math.floor(Math.random() * GRID_COLS);
    fy = Math.floor(Math.random() * GRID_ROWS);
    collision = Object.values(game.snakes).some((sd) =>
      sd.body.some((seg) => seg.x === fx && seg.y === fy)
    );
  } while (collision);
  game.food = { x: fx, y: fy };
}

import { Server as HTTPServer } from 'http';

type WithIO = {
  server: HTTPServer & { io?: Server };
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only create one Socket.IO server instance
  const socketServer = res.socket as typeof res.socket & WithIO;
  if (!socketServer.server.io) {
    console.log('⌛️ Initializing Socket.IO server…');
    if (!res.socket) {
      res.status(500).send('Socket is not available.');
      return;
    }
    const httpServer: HTTPServer = socketServer.server;
    const io = new Server(httpServer, {
      path: '/api/socket_io',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    socketServer.server.io = io;

    io.on('connection', (socket) => {
      console.log(`⚡️ Socket connected: ${socket.id}`);

      // 0) Send the current room list immediately
      socket.emit('lobby:roomList', getRoomsArray());

      // ============================
      // LOBBY / ROOM HANDLERS
      // ============================

      // 1) Set Username
      socket.on('lobby:setUsername', (username: string) => {
        const nameToStore = username?.trim() || 'Anonymous';
        userNames[socket.id] = nameToStore;
        console.log(`🆕 User "${nameToStore}" joined (socket.id = ${socket.id})`);
        io.emit('lobby:userList', Object.values(userNames));
      });

      // 2) Chat Message
      socket.on('lobby:chat', (msg: string) => {
        const username = userNames[socket.id] || 'Anonymous';
        console.log(`💬 [${username}]: ${msg}`);
        io.emit('lobby:newMessage', {
          username,
          text: msg,
          timestamp: new Date().toISOString(),
        });
      });

      // 3) Create a New Room
      socket.on('lobby:createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = { players: new Set() };
        console.log(`🎮 Room created: ${roomId}`);
        io.emit('lobby:roomList', getRoomsArray());
      });

      // 4) Join Room
      socket.on('lobby:joinRoom', ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) {
          socket.emit('lobby:roomError', `Room "${roomId}" does not exist.`);
          return;
        }

        // If this socket is already in the room (e.g. client reconnected),
        // re‐emit appropriate events and return early
        if (room.players.has(socket.id)) {
          socket.emit('lobby:roomJoined', { roomId });
          const game = gameDataByRoom[roomId];
          if (game) {
            if (game.status === 'waiting') {
              // The original 'room:showReady' might have been missed, re-send it:
              socket.emit('room:showReady', { roomId });
            } else if (game.status === 'playing') {
              // If game is already in progress, send current state immediately
              socket.emit('game:state', {
                snakes: game.snakes,
                food: game.food,
              });
            }
          }
          return;
        }

        // If the room already has two players, reject
        if (room.players.size >= 2) {
          socket.emit('lobby:roomError', `Room "${roomId}" is already full.`);
          return;
        }

        // Add this socket to the room
        room.players.add(socket.id);
        socket.join(roomId);
        console.log(
          `🔑 User "${userNames[socket.id] || socket.id}" joined room ${roomId}`
        );

        // Broadcast updated room list to all clients
        io.emit('lobby:roomList', getRoomsArray());

        // Notify this client that they successfully joined
        socket.emit('lobby:roomJoined', { roomId });

        // If now exactly two players, initialize game data for this room (status='waiting')
        if (room.players.size === 2) {
          const [playerA, playerB] = Array.from(room.players);
          const newGame: GameData = {
            status: 'waiting',
            snakes: {
              [playerA]: {
                body: [{ x: 2, y: 2 }], // top-left corner
                direction: 'right',
                alive: true,
                score: 0,
              },
              [playerB]: {
                body: [{ x: GRID_COLS - 3, y: GRID_ROWS - 3 }], // bottom-right
                direction: 'left',
                alive: true,
                score: 0,
              },
            },
            food: { x: 0, y: 0 },
            readyPlayers: new Set(),
          };
          placeFood(newGame);
          gameDataByRoom[roomId] = newGame;

          // Notify both players to show the "Ready" popup (client will show modal)
          io.to(roomId).emit('room:showReady', { roomId });
        }
      });

      // ============================
      // MANUAL “LEAVE ROOM” HANDLER
      // ============================
      socket.on('lobby:leaveRoom', ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) return;

        if (room.players.has(socket.id)) {
          room.players.delete(socket.id);
          socket.leave(roomId);
          console.log(
            `🚪 User "${
              userNames[socket.id] || socket.id
            }" left room ${roomId}`
          );

          // If a game was waiting or running, cancel it
          const game = gameDataByRoom[roomId];
          if (game) {
            if (game.startTimeout) {
              clearTimeout(game.startTimeout);
            }
            if (game.status === 'playing' && game.intervalId) {
              clearInterval(game.intervalId);
              game.status = 'finished';
              // Notify the remaining player they win by default
              const [remaining] = Array.from(room.players);
              if (remaining) {
                io.to(roomId).emit('game:over', { winnerId: remaining });
              }
            }
            delete gameDataByRoom[roomId];
          }

          // If the room is now empty, delete it
          if (room.players.size === 0) {
            delete rooms[roomId];
            console.log(`❌ Room ${roomId} destroyed (empty after leaveRoom)`);
          }

          // Broadcast updated room list
          io.emit('lobby:roomList', getRoomsArray());
        }
      });

      // ============================
      // GAME‐SPECIFIC HANDLERS
      // ============================

      // Handle player "ready" (after pressing Start button in modal)
      socket.on('player:ready', ({ roomId }: { roomId: string }) => {
        const game = gameDataByRoom[roomId];
        if (!game || game.status !== 'waiting') return;
        game.readyPlayers.add(socket.id);

        // If both players are ready, start the countdown and then the game
        const room = rooms[roomId];
        if (room && game.readyPlayers.size === 2) {
          io.to(roomId).emit('room:ready', { roomId });

          // Reset both snakes to starting positions and alive state using current snake keys
          const snakeIds = Object.keys(game.snakes);
          if (snakeIds.length === 2) {
            const [idA, idB] = snakeIds;
            game.snakes[idA] = {
              body: [{ x: 2, y: 2 }],
              direction: 'right',
              alive: true,
              score: 0,
            };
            game.snakes[idB] = {
              body: [{ x: GRID_COLS - 3, y: GRID_ROWS - 3 }],
              direction: 'left',
              alive: true,
              score: 0,
            };
            placeFood(game);
          }
          // Clear readyPlayers for next round
          game.readyPlayers.clear();

          // Start the countdown, then start the game loop
          game.startTimeout = setTimeout(() => {
            const game = gameDataByRoom[roomId];
            if (!game || game.status !== 'waiting') return;

            // Ensure both snakes are alive and in starting positions using current snake keys
            const snakeIds = Object.keys(game.snakes);
            if (snakeIds.length === 2) {
              const [idA, idB] = snakeIds;
              game.snakes[idA].alive = true;
              game.snakes[idA].body = [{ x: 2, y: 2 }];
              game.snakes[idA].direction = 'right';
              game.snakes[idA].score = 0;
              game.snakes[idB].alive = true;
              game.snakes[idB].body = [{ x: GRID_COLS - 3, y: GRID_ROWS - 3 }];
              game.snakes[idB].direction = 'left';
              game.snakes[idB].score = 0;
              placeFood(game);
            }

            game.status = 'playing';
            // Debug: log snake states before starting game loop
            console.log(`🚦 Starting game loop for room ${roomId}`);
            console.log('Snake states at game start:', JSON.stringify(game.snakes, null, 2));

            // Tick every 200ms (half speed)
            const TICK_RATE = 400;
            game.intervalId = setInterval(() => {
              const currentGame = gameDataByRoom[roomId];
              if (!currentGame || currentGame.status !== 'playing') return;

              // Move each snake one step
              Object.entries(currentGame.snakes).forEach(([pid, snake]: [string, SnakeState]) => {
          
                console.log(`🐍 Moving snake ${pid} in direction ${snake.direction}`);

                if (!snake.alive) return;
                const head = { ...snake.body[0] };
                switch (snake.direction) {
                  case 'up':
                    head.y -= 1;
                    break;
                  case 'down':
                    head.y += 1;
                    break;
                  case 'left':
                    head.x -= 1;
                    break;
                  case 'right':
                    head.x += 1;
                    break;
                }

                // Border collision (no wrap). Hitting the wall kills the snake.
                if (
                  head.x < 0 ||
                  head.x >= GRID_COLS ||
                  head.y < 0 ||
                  head.y >= GRID_ROWS
                ) {
                  snake.alive = false;
                  return;
                }

                // Add new head
                snake.body.unshift(head);

                // Check if we ate food
                if (
                  head.x === currentGame.food.x &&
                  head.y === currentGame.food.y
                ) {
                  snake.score += 1;
                  // Grow (do NOT pop tail) and place new food
                  placeFood(currentGame);
                } else {
                  // Regular move: remove tail segment
                  snake.body.pop();
                }
              });

              // Collision checks: self and other
              const entries = Object.entries(currentGame.snakes);
              entries.forEach(([pid, snake]) => {
                if (!snake.alive) return;
                const head = snake.body[0];
                // Self‐collision
                for (let i = 1; i < snake.body.length; i++) {
                  if (
                    snake.body[i].x === head.x &&
                    snake.body[i].y === head.y
                  ) {
                    snake.alive = false;
                    break;
                  }
                }
                // Collision with other snake’s body
                entries.forEach(([otherId, otherSnake]) => {
                  if (otherId === pid) return;
                  otherSnake.body.forEach((seg) => {
                    if (seg.x === head.x && seg.y === head.y) {
                      snake.alive = false;
                    }
                  });
                });
              });

              // Check if game is over (0 or 1 alive)
              const alivePlayers = Object.entries(currentGame.snakes).filter(
                ([, s]) => s.alive
              );
              if (alivePlayers.length <= 0) {
                // Draw
                clearInterval(currentGame.intervalId!);
                currentGame.status = 'finished';
                io.to(roomId).emit('game:over', { result: 'draw' });
                return;
              } else if (alivePlayers.length === 1) {
                const winnerId = alivePlayers[0][0];
                clearInterval(currentGame.intervalId!);
                currentGame.status = 'finished';
                io.to(roomId).emit('game:over', { winnerId });
                return;
              }

              // Broadcast the updated state to both clients
              io.to(roomId).emit('game:state', {
                snakes: currentGame.snakes,
                food: currentGame.food,
              });
            }, TICK_RATE);
          }, 3000);
        }
      });

      socket.on(
        'game:changeDirection',
        ({
          roomId,
          newDirection,
        }: { roomId: string; newDirection: Direction }) => {
          const game = gameDataByRoom[roomId];
          if (!game || game.status !== 'playing') return;
          const snake = game.snakes[socket.id];
          if (!snake || !snake.alive) return;
          // Prevent 180° reversal
          const opposite: Record<Direction, Direction> = {
            up: 'down',
            down: 'up',
            left: 'right',
            right: 'left',
          };
          if (newDirection !== opposite[snake.direction]) {
            snake.direction = newDirection;
          }
        }
      );

      // ============================
      // HANDLE CLIENT DISCONNECT
      // ============================
      socket.on('disconnect', () => {
        const name = userNames[socket.id] || 'Anonymous';
        console.log(`🔌 User "${name}" disconnected (socket.id = ${socket.id})`);
        delete userNames[socket.id];

        let roomsChanged = false;
        Object.entries(rooms).forEach(([roomId, roomData]) => {
          if (roomData.players.has(socket.id)) {
            roomData.players.delete(socket.id);
            console.log(`↪️ Removed ${name} from room ${roomId} (disconnect)`);

            // If a game was in progress, end it:
            const game = gameDataByRoom[roomId];
            if (game) {
              if (game.startTimeout) {
                clearTimeout(game.startTimeout);
              }
              if (game.status === 'playing' && game.intervalId) {
                clearInterval(game.intervalId);
                game.status = 'finished';
                // Remaining player (if any) wins
                const [remaining] = Array.from(roomData.players);
                if (remaining) {
                  io.to(roomId).emit('game:over', { winnerId: remaining });
                }
              }
              delete gameDataByRoom[roomId];
            }

            // Remove empty room
            if (roomData.players.size === 0) {
              delete rooms[roomId];
              console.log(`❌ Room ${roomId} deleted (empty)`);
            }

            roomsChanged = true;
          }
        });

        io.emit('lobby:userList', Object.values(userNames));
        if (roomsChanged) {
          io.emit('lobby:roomList', getRoomsArray());
        }
      });
    });

    console.log('✅ Socket.IO server initialized.');
  }

  res.status(200).end();
}

// pages/api/socket_io.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Server } from 'socket.io';

// In‐memory storage:
const userNames: Record<string, string> = {};               // socketId → username
const rooms: Record<string, { players: Set<string> }> = {}; // roomId → set of socket IDs

// Helper to return an array of rooms with counts
function getRoomsArray() {
  return Object.entries(rooms).map(([roomId, room]) => ({
    roomId,
    playersCount: room.players.size,
  }));
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only initialize once
  if (res.socket && !res.socket.server.io) {
    console.log('⌛️ Initializing Socket.IO server…');
    const httpServer: any = res.socket.server;
    const io = new Server(httpServer, {
      path: '/api/socket_io', // Must match client
      cors: {
        origin: '*', // For development; tighten in production
        methods: ['GET', 'POST'],
      },
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(`⚡️ Socket connected: ${socket.id}`);

      // 0) Immediately send current room list
      socket.emit('lobby:roomList', getRoomsArray());

      // 1) When a client sets their username
      socket.on('lobby:setUsername', (username: string) => {
        const nameToStore = username?.trim() || 'Anonymous';
        userNames[socket.id] = nameToStore;
        console.log(`🆕 User "${nameToStore}" joined (socket.id = ${socket.id})`);
        io.emit('lobby:userList', Object.values(userNames));
      });

      // 2) When a client sends a chat message
      socket.on('lobby:chat', (msg: string) => {
        const username = userNames[socket.id] || 'Anonymous';
        console.log(`💬 [${username}]: ${msg}`);
        io.emit('lobby:newMessage', {
          username,
          text: msg,
          timestamp: new Date().toISOString(),
        });
      });

      // 3) When a client creates a new room
      socket.on('lobby:createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = { players: new Set() };
        console.log(`🎮 Room created: ${roomId}`);
        io.emit('lobby:roomList', getRoomsArray());
      });

      // 4) When a client attempts to join a room
      socket.on('lobby:joinRoom', ({ roomId }: { roomId: string }) => {
        const room = rooms[roomId];
        if (!room) {
          socket.emit('lobby:roomError', `Room "${roomId}" does not exist.`);
          return;
        }

        // If this same socket is already in the room, we do NOT treat it as "full";
        // we simply re‐emit "roomJoined" (and "room:ready" if it's already 2/2) and return.
        if (room.players.has(socket.id)) {
          socket.emit('lobby:roomJoined', { roomId });
          if (room.players.size === 2) {
            io.to(roomId).emit('room:ready', { roomId });
          }
          return;
        }

        // Now if socket was NOT already in the set, check fullness:
        if (room.players.size >= 2) {
          socket.emit('lobby:roomError', `Room "${roomId}" is already full.`);
          return;
        }

        // OK to add them
        room.players.add(socket.id);
        socket.join(roomId);
        console.log(
          `🔑 User "${userNames[socket.id] || socket.id}" joined room ${roomId}`
        );

        // Broadcast updated room list to everyone
        io.emit('lobby:roomList', getRoomsArray());

        // Inform this socket that join succeeded
        socket.emit('lobby:roomJoined', { roomId });

        // If now exactly 2 players are in the room, broadcast "room:ready"
        if (room.players.size === 2) {
          io.to(roomId).emit('room:ready', { roomId });
        }
      });

      // 5) Handle client disconnection
      socket.on('disconnect', () => {
        const name = userNames[socket.id] || 'Anonymous';
        console.log(`🔌 User "${name}" disconnected (socket.id = ${socket.id})`);
        delete userNames[socket.id];

        let roomsChanged = false;
        Object.entries(rooms).forEach(([roomId, roomData]) => {
          if (roomData.players.has(socket.id)) {
            roomData.players.delete(socket.id);
            console.log(`↪️ Removed ${name} from room ${roomId}`);
            // If it’s now empty, delete it entirely
            if (roomData.players.size === 0) {
              delete rooms[roomId];
              console.log(`❌ Room ${roomId} deleted (empty)`);
            }
            roomsChanged = true;
          }
        });

        // Broadcast updated user list & room list
        io.emit('lobby:userList', Object.values(userNames));
        if (roomsChanged) {
          io.emit('lobby:roomList', getRoomsArray());
        }
      });
    });

    console.log('✅ Socket.IO server initialized.');
  }

  // Always return 200. Clients connect over WS, not via normal fetch.
  res.status(200).end();
}

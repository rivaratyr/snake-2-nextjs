// File: src/app/(protected)/lobby/page.tsx
'use client';

import {
  useEffect,
  useRef,
  useState,
  FormEvent,
  KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/utils/socket';

interface ChatMessage {
  username: string;
  text: string;
  timestamp: string;
}

interface RoomInfo {
  roomId: string;
  playersCount: number;
}

export default function LobbyPage() {
  const router = useRouter();
  const socket = getSocket();

  // ——— Persisted username logic ———
  const [username, setUsername] = useState<string>('');
  const [hasJoined, setHasJoined] = useState<boolean>(false);

  // ——— Chat & room state ———
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  // Refs in case you want to use them for scroll locking later
  const connectedUsersRef = useRef<string[]>(connectedUsers);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const roomsRef = useRef<RoomInfo[]>(rooms);
  connectedUsersRef.current = connectedUsers;
  messagesRef.current = messages;
  roomsRef.current = rooms;

  // ——— On mount: check localStorage for “username” ———
  useEffect(() => {
    const stored = localStorage.getItem('snakeLobbyUsername');
    if (stored) {
      setUsername(stored);
      setHasJoined(true);
      socket.emit('lobby:setUsername', stored);
    }
  }, [socket]);

  // ——— Socket.IO event handlers ———
  useEffect(() => {
    // 1) Updated user list
    socket.on('lobby:userList', (list: string[]) => {
      setConnectedUsers(list);
    });

    // 2) New chat message
    socket.on('lobby:newMessage', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 3) Updated room list
    socket.on('lobby:roomList', (roomList: RoomInfo[]) => {
      setRooms(roomList);
    });

    // 4) Error on room join
    socket.on('lobby:roomError', (errMsg: string) => {
      alert(errMsg);
    });

    // 5) Successful room join
    socket.on('lobby:roomJoined', ({ roomId }: { roomId: string }) => {
      router.push(`/game/${roomId}`);
    });

    return () => {
      socket.off('lobby:userList');
      socket.off('lobby:newMessage');
      socket.off('lobby:roomList');
      socket.off('lobby:roomError');
      socket.off('lobby:roomJoined');
    };
  }, [router, socket]);

  // ——— Handle “Join Lobby” ———
  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const trimmed = username.trim();
    localStorage.setItem('snakeLobbyUsername', trimmed);
    socket.emit('lobby:setUsername', trimmed);
    setHasJoined(true);
  };

  // ——— Send chat ———
  const sendMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit('lobby:chat', chatInput.trim());
    setChatInput('');
  };

  const handleChatKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // ——— Create & Join rooms ———
  const createRoom = () => {
    socket.emit('lobby:createRoom');
  };

  const joinRoom = (roomId: string) => {
    socket.emit('lobby:joinRoom', { roomId });
    // Navigation happens in 'lobby:roomJoined'
  };

  // ——— Single-Player handler ———
  const handleSinglePlayer = () => {
    router.push('/game/single');
  };

  // ——— If not joined, show username form ———
  if (!hasJoined) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <form
          onSubmit={handleJoin}
          className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-sm"
        >
          <h2 className="text-2xl font-bold mb-4 text-center">
            Enter Your Name
          </h2>
          <input
            type="text"
            placeholder="Username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
          >
            Join Lobby
          </button>
        </form>
      </div>
    );
  }

  // ——— Once joined, show header with username + Single Player, then three cards ———
  return (
    <div className="min-h-screen bg-gray-100 p-4 space-y-4">
      {/* —————————— HEADER: Username + Single Player —————————— */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-md p-4">
        <span className="text-lg font-medium">Hello, {username}</span>
        <button
          onClick={handleSinglePlayer}
          className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition text-sm"
        >
          Single Player
        </button>
      </div>

      {/* —————————— CARD #1: Connected Users —————————— */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-2">
          Users ({connectedUsers.length})
        </h2>
        <ul className="space-y-1 max-h-36 overflow-y-auto">
          {connectedUsers.map((u, idx) => (
            <li key={idx} className="text-black">
              {u}
            </li>
          ))}
          {connectedUsers.length === 0 && (
            <li className="text-gray-500 italic">No users online.</li>
          )}
        </ul>
      </div>

      {/* —————————— CARD #2: Rooms —————————— */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            Rooms ({rooms.length})
          </h2>
          <button
            onClick={createRoom}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition text-sm"
          >
            + Create
          </button>
        </div>
        <ul className="space-y-2">
          {rooms.length === 0 && (
            <li className="text-gray-500 italic">No rooms available.</li>
          )}
          {rooms.map((r) => (
            <li
              key={r.roomId}
              className="flex items-center justify-between bg-gray-50 p-2 rounded"
            >
              <div>
                <span className="font-semibold text-black">{r.roomId}</span>
                <span className="text-sm text-gray-600 ml-2">
                  ({r.playersCount}/2)
                </span>
              </div>
              {r.playersCount < 2 ? (
                <button
                  onClick={() => joinRoom(r.roomId)}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition text-sm"
                >
                  Join
                </button>
              ) : (
                <span className="text-gray-500 italic text-sm">Full</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* —————————— CARD #3: Chat —————————— */}
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-2">Chat</h2>
        <div
          className="flex-1 overflow-y-auto border border-gray-200 rounded p-2 mb-2 max-h-48"
          id="chat-window"
        >
          {messages.length === 0 && (
            <p className="text-gray-500 italic">No messages yet.</p>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex space-x-1">
                <span className="font-semibold text-black">
                  {m.username}:
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-black">{m.text}</p>
            </div>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            className="flex-1 border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

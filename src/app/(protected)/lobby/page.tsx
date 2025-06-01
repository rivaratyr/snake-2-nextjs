// app/lobby/page.tsx
'use client';

import {
  useEffect,
  useRef,
  useState,
  FormEvent,
  KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '../../utils/socket';

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

  // Refs (not strictly needed for this example)
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
      // Immediately inform server of our username
      socket.emit('lobby:setUsername', stored);
    }
  }, [socket]);

  // ——— Socket.IO event handlers (once) ———
  useEffect(() => {
    // 1) Receive updated user list
    socket.on('lobby:userList', (list: string[]) => {
      setConnectedUsers(list);
    });

    // 2) Receive chat messages
    socket.on('lobby:newMessage', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 3) Receive updated room list
    socket.on('lobby:roomList', (roomList: RoomInfo[]) => {
      setRooms(roomList);
    });

    // 4) Error on room join
    socket.on('lobby:roomError', (errMsg: string) => {
      alert(errMsg);
    });

    // 5) When a room is joined, navigate to the game page
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

  // ——— Handle “Join Lobby” (store username + emit) ———
  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const trimmed = username.trim();
    // Save to localStorage
    localStorage.setItem('snakeLobbyUsername', trimmed);
    // Tell server
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

  // ——— Create & join rooms ———
  const createRoom = () => {
    socket.emit('lobby:createRoom');
  };

  const joinRoom = (roomId: string) => {
    socket.emit('lobby:joinRoom', { roomId });
    // The actual navigation happens in the 'lobby:roomJoined' listener
  };

  // ——— If not joined (no username), show login form ———
  if (!hasJoined) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <form
          onSubmit={handleJoin}
          className="bg-white p-6 rounded shadow-md w-80"
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

  // ——— Once joined, show chat + rooms ———
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-semibold">Lobby Chat</h1>
        <div>
          <span className="mr-2">Logged in as:</span>
          <span className="font-bold">{username}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Users & Rooms */}
        <div className="w-1/4 bg-gray-100 border-r border-gray-300 p-2 overflow-auto">
          {/* -- Users List -- */}
          <h2 className="text-md font-semibold mb-2">
            Users ({connectedUsers.length}):
          </h2>
          <ul>
            {connectedUsers.map((u, idx) => (
              <li key={idx} className="mb-1 text-black">
                {u}
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-gray-300"></div>

          {/* -- Create Game Button -- */}
          <button
            onClick={createRoom}
            className="w-full bg-green-500 text-white py-2 mb-4 rounded hover:bg-green-600 transition"
          >
            Create Game
          </button>

          {/* -- Rooms List -- */}
          <h2 className="text-md font-semibold mb-2">
            Rooms ({rooms.length}):
          </h2>
          {rooms.length === 0 ? (
            <p className="text-gray-500">No rooms yet.</p>
          ) : (
            <ul>
              {rooms.map((r) => (
                <li
                  key={r.roomId}
                  className="flex items-center justify-between bg-white p-2 mb-2 rounded shadow"
                >
                  <span className="font-semibold text-black">{r.roomId}</span>
                  <span className="text-black">{r.playersCount}/2</span>
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
          )}
        </div>

        {/* Right Column: Chat Window */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div
            className="flex-1 p-3 overflow-y-auto space-y-2 bg-white"
            id="chat-window"
          >
            {messages.map((m, idx) => (
              <div key={idx} className="flex flex-col">
                <div className="flex space-x-2">
                  <span className="font-semibold text-black">{m.username}</span>
                  <span className="text-xs text-black">
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-md text-black">{m.text}</div>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-2 border-t border-gray-300 flex">
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
    </div>
  );
}

// src/app/(protected)/lobby/page.tsx
"use client";

import { useEffect, useRef, useState, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/utils/socket";

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
  const [username, setUsername] = useState<string>("");
  const [hasJoined, setHasJoined] = useState<boolean>(false);

  // ——— Chat & room state ———
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  const isDevMode = process.env.NEXT_PUBLIC_USE_LOGIN === "false";
  // Refs (not strictly needed but kept in case you want scroll locking, etc.)
  const connectedUsersRef = useRef<string[]>(connectedUsers);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const roomsRef = useRef<RoomInfo[]>(rooms);
  connectedUsersRef.current = connectedUsers;
  messagesRef.current = messages;
  roomsRef.current = rooms;

  // ——— On mount: check localStorage for “username” ———
  useEffect(() => {
    const stored = localStorage.getItem("snakeLobbyUsername");
    if (stored) {
      setUsername(stored);
      setHasJoined(true);
      // Immediately inform server of our username
      socket.emit("lobby:setUsername", stored);
    }
  }, [socket]);

  // ——— Socket.IO event handlers ———
  useEffect(() => {
    // 1) Receive updated user list
    socket.on("lobby:userList", (list: string[]) => {
      setConnectedUsers(list);
    });

    // 2) Receive chat messages
    socket.on("lobby:newMessage", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 3) Receive updated room list
    socket.on("lobby:roomList", (roomList: RoomInfo[]) => {
      setRooms(roomList);
    });

    // 4) Error on room join
    socket.on("lobby:roomError", (errMsg: string) => {
      alert(errMsg);
    });

    // 5) When a room is joined, navigate to the game page
    socket.on("lobby:roomJoined", ({ roomId }: { roomId: string }) => {
      router.push(`/game/${roomId}`);
    });

    return () => {
      socket.off("lobby:userList");
      socket.off("lobby:newMessage");
      socket.off("lobby:roomList");
      socket.off("lobby:roomError");
      socket.off("lobby:roomJoined");
    };
  }, [router, socket]);

  // ——— Handle “Join Lobby” (store username + emit) ———
  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const trimmed = username.trim();
    // Save to localStorage
    localStorage.setItem("snakeLobbyUsername", trimmed);
    // Tell server
    socket.emit("lobby:setUsername", trimmed);
    setHasJoined(true);
  };

  // ——— Send chat ———
  const sendMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit("lobby:chat", chatInput.trim());
    setChatInput("");
  };

  const handleChatKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  // ——— Create & join rooms ———
  const createRoom = () => {
    socket.emit("lobby:createRoom");
  };

  const joinRoom = (roomId: string) => {
    socket.emit("lobby:joinRoom", { roomId });
    // Actual navigation happens via 'lobby:roomJoined'
  };

  // ——— If not joined (no username), show login form ———
  if (!hasJoined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <form
          onSubmit={handleJoin}
          className="panel p-6 rounded-lg shadow-lg w-11/12 max-w-sm space-y-4"
        >
          <h2 className="text-2xl font-bold text-center game-font-white">
            Enter Your Name
          </h2>
          <input
            type="text"
            placeholder="Username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full text-lg input-basic"
          />
          <button type="submit" className="w-full button-rounded button-purple">
            Join Lobby
          </button>
        </form>
      </div>
    );
  }

  // ——— Once joined, show three stacked cards: Users, Rooms, Chat ———
  return (
    <div className="flex flex-1 flex-col space-y-4">
      {/* Card #1: Connected Users */}
      <div className="panel rounded-lg shadow-md p-4">
        <h2 className="text-xl mb-2 game-font-white">
          Users ({connectedUsers.length})
        </h2>
        <ul className="space-y-1 max-h-36 overflow-y-auto">
          {connectedUsers.map((u, idx) => (
            <li key={idx} className="text-xl game-font-yellow">
              {u}
              {isDevMode && (
                <button
                  onClick={() => router.push("/game/single")}
                  className="ml-2 text-blue-500 hover:underline text-sm"
                  title="Start single player"
                >
                  [SP]
                </button>
              )}
            </li>
          ))}
          {connectedUsers.length === 0 && (
            <li className="text-xl game-font-white text-gray-500 italic">
              No users online.
            </li>
          )}
        </ul>
      </div>

      {/* Card #2: Rooms */}
      <div className="panel rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl game-font-white">Rooms ({rooms.length})</h2>
          <button onClick={createRoom} className="game-font-white text-xl">
            + Create
          </button>
        </div>
        <ul className="space-y-2">
          {rooms.length === 0 && (
            <li className="text-xl game-font-white text-gray-500 italic">
              No rooms available.
            </li>
          )}
          {rooms.map((r) => (
            <li
              key={r.roomId}
              className="flex items-center justify-between p-2 rounded"
            >
              <div>
                <span className="text-xl game-font-yellow">{r.roomId}</span>
                <span className="text-xl ml-2 game-font-white">
                  ({r.playersCount}/2)
                </span>
              </div>
              {r.playersCount < 2 ? (
                <button
                  onClick={() => joinRoom(r.roomId)}
                  className="text-xl game-font-white px-3 py-1"
                >
                  Join
                </button>
              ) : (
                <span className="game-font-white text-red italic text-xl">
                  Full
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Card #3: Chat */}
      <div className="panel rounded-lg shadow-md p-4 flex flex-col">
        <h2 className="text-xl game-font-white font-semibold mb-2">Chat</h2>
        <div
          className="flex-1 overflow-y-auto border border-gray-200 rounded mb-2 max-h-48"
          id="chat-window"
        >
          {messages.length === 0 && (
            <p className="text-xl game-font-white text-gray-500 italic">
              No messages yet.
            </p>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className="mb-2 flex flex-row space-x-1">
              <div className="flex flex-row space-x-1">
                <span className="text-xs font-semibold game-font-yellow">
                  {m.username}
                </span>
                <span className="text-xs">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <span className="text-xs">:</span>
              <span className="text-xs">{m.text}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between space-x-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            className="flex-1 input-basic text-xs"
          />
          <button onClick={sendMessage} className="game-font-white text-md">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

import { io } from "socket.io-client";

let socket;

export const initSocket = () => {
  if (socket) return socket;

  const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const socketUrl = rawUrl.replace(/\/api\/?$/, "");

  socket = io(socketUrl, {
    withCredentials: true,
  });

  return socket;
};

export const getSocket = () => socket;

import { io } from "socket.io-client";

let socket;

export const initSocket = () => {
  if (socket) return socket;

  socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", {
    withCredentials: true,
  });

  return socket;
};

export const getSocket = () => socket;

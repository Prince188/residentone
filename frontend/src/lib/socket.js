import { io } from "socket.io-client";
import { getAccessToken, getSocketUrl } from "./api";

let globalSocket = null;

export function getSocket(societyId) {
  const token = getAccessToken();
  if (!token) return null;

  const socketUrl = getSocketUrl();
  if (globalSocket && globalSocket.connected) {
    return globalSocket;
  }

  globalSocket = io(socketUrl, {
    auth: { token, societyId },
    transports: ["websocket"],
  });

  return globalSocket;
}

const socketHelper = {
  getSocket,
};

export default socketHelper;

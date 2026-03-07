import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { rooms } from "../database/schema.js";

type AliveWebSocket = WebSocket & {
  isAlive: boolean;
};

type Room = typeof rooms.$inferSelect;

function sendJSON(socket: WebSocket, payload: any) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function BroadCastToAll(wss: WebSocketServer, payload: any) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) {
      continue;
    }
    sendJSON(client, payload);
  }
}

export function attachWebsocket(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, // 1MB
  });

  wss.on("connection", (socket: AliveWebSocket) => {
    socket.isAlive = true;

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJSON(socket, { type: "Welcome" });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      const ws = socket as AliveWebSocket;
      if (!ws.isAlive) {
        socket.terminate();
        return;
      }
      ws.isAlive = false;

      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  function broadCastCreatedRoom(room: Room) {
    BroadCastToAll(wss, { type: "create_room", room });
  }

  return { broadCastCreatedRoom };
}

import { WebSocketServer, WebSocket } from "ws";
import http from "http";

type AliveWebSocket = WebSocket & {
  isAlive: boolean;
};

function sendJSON(socket: WebSocket, payload: any) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
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
}

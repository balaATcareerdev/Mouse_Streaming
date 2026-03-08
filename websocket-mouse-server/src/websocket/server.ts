import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { rooms } from "../database/schema.js";
import { send } from "process";

type AliveWebSocket = WebSocket & {
  isAlive: boolean;
  subscriptions: Set<number>;
};

type Room = typeof rooms.$inferSelect;

type subscribeMessageType = {
  type: "subscribe" | "unsubscribe";
  roomId: number;
};

type mouseEventMessageType = {
  type: "mouse_event";
  roomId: number;
  x: number;
  y: number;
};

const roomMembers = new Map<number, Set<AliveWebSocket>>();
/**
 *
 * {
 *  1 : {socket1, socke2}
 * 2 : {socket3}
 * }
 */

function subscribeToRoom(roomId: number, socket: AliveWebSocket) {
  if (!roomMembers.has(roomId)) {
    roomMembers.set(roomId, new Set());
  }
  roomMembers.get(roomId)?.add(socket);
}

function unsubscribeFromRoom(roomId: number, socket: AliveWebSocket) {
  const members = roomMembers.get(roomId);
  if (!members) return;

  members.delete(socket);

  if (members.size === 0) {
    roomMembers.delete(roomId);
  }
}

function cleanUp(socket: AliveWebSocket) {
  for (const roomId of socket.subscriptions) {
    unsubscribeFromRoom(roomId, socket);
  }
}

function handleTheSubscription(
  socket: AliveWebSocket,
  message: subscribeMessageType,
) {
  if (message.type === "subscribe" && Number.isInteger(message.roomId)) {
    subscribeToRoom(message.roomId, socket as AliveWebSocket);
    socket.subscriptions.add(message.roomId);
    sendJSON(socket, { type: "subscribed", roomId: message.roomId });
  } else if (
    message.type === "unsubscribe" &&
    Number.isInteger(message.roomId)
  ) {
    unsubscribeFromRoom(message.roomId, socket as AliveWebSocket);
    socket.subscriptions.delete(message.roomId);
    sendJSON(socket, { type: "unsubscribed", roomId: message.roomId });
  }
}

function handleMouseEvent(
  socket: AliveWebSocket,
  message: mouseEventMessageType,
) {
  if (
    message.type === "mouse_event" &&
    !Number.isNaN(message.x) &&
    !Number.isNaN(message.y)
  ) {
    broadCastToAllExceptSender(message.roomId, message, socket);
  } else {
    sendJSON(socket, { type: "error", error: "Invalid mouse event data" });
  }
}

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

function broadCastToRoom(roomId: number, payload: any) {
  const members = roomMembers.get(roomId);
  if (!members) return;

  for (const member of members) {
    sendJSON(member, payload);
  }
}

function broadCastToAllExceptSender(
  roomId: number,
  payload: any,
  sender: AliveWebSocket,
) {
  const members = roomMembers.get(roomId);
  if (!members) return;

  if (!members.has(sender)) {
    sendJSON(sender, {
      type: "error",
      error: "You are not subscribed to this room",
    });
    return;
  }

  for (const member of members) {
    if (member === sender) continue;

    sendJSON(member, payload);
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
    socket.subscriptions = new Set();

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJSON(socket, { type: "Welcome" });

    socket.on("error", console.error);

    socket.on("message", (data) => {
      let message;

      try {
        message = JSON.parse(data.toString());
      } catch (error) {
        sendJSON(socket, { type: "error", error: "Invalid JSON" });
        return;
      }

      switch (message.type) {
        case "subscribe":
        case "unsubscribe":
          handleTheSubscription(socket as AliveWebSocket, message);
          break;

        case "mouse_event":
          handleMouseEvent(socket as AliveWebSocket, message);
          break;

        default:
          sendJSON(socket, { type: "error", error: "Unknown message type" });
      }
    });

    socket.on("close", () => cleanUp(socket as AliveWebSocket));
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

  function broadCastToRoomMembers(roomId: number, payload: any) {
    broadCastToRoom(roomId, payload);
  }

  return { broadCastCreatedRoom, broadCastToRoomMembers };
}

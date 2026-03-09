import { WebSocket } from "ws";

const WS_URL = "ws://localhost:8002/ws";
const ROOM_ID = 8;

// number of simulated users
const USERS = 50;

// mouse events per user (ms)
const SEND_INTERVAL = 50;

let sentEvents = 0;

function createUser(userId) {
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log(`User ${userId} connected`);

    // subscribe to room
    ws.send(
      JSON.stringify({
        type: "subscribe",
        roomId: ROOM_ID,
      }),
    );

    let x = Math.floor(Math.random() * 500);
    let y = Math.floor(Math.random() * 500);

    setInterval(() => {
      x += Math.floor(Math.random() * 5);
      y += Math.floor(Math.random() * 5);

      const message = {
        type: "mouse_event",
        roomId: ROOM_ID,
        x,
        y,
        sentAt: Date.now(),
      };

      ws.send(JSON.stringify(message));

      sentEvents++;
    }, SEND_INTERVAL);
  });

  ws.on("message", (data) => {
    const msg = JSON.parse(data);

    if (msg.sentAt) {
      const latency = Date.now() - msg.sentAt;
      // uncomment if you want latency logs
      // console.log("latency:", latency, "ms");
    }
  });

  ws.on("error", (err) => {
    console.log(`User ${userId} error`, err.message);
  });

  ws.on("close", () => {
    console.log(`User ${userId} disconnected`);
  });
}

// create simulated users
for (let i = 1; i <= USERS; i++) {
  createUser(i);
}

// performance stats
setInterval(() => {
  console.log("Events sent per second:", sentEvents);
  sentEvents = 0;
}, 1000);

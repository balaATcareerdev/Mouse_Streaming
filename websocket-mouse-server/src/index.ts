import express from "express";
import http from "http";
import { attachWebsocket } from "./websocket/server.js";

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 8002;
const HOST = process.env.HOST || "0.0.0.0";

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello Welcome to Express Server!👌");
});

attachWebsocket(server);

server.listen(PORT, HOST, () => {
  const baseURL =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`The Server is Active in the PORT ${baseURL}`);
  console.log(`WebSocket Endpoint: ${baseURL.replace("http", "ws")}/ws`);
});

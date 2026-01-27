import http from "http";
// const http = require("http");

import express from "express";
import { startWS } from "./routes/ws.js";

const app = express();

app.use(express.json())

const server = http.createServer(app);

// app.use("/ws",);       WebSockets do not go through Express middleware





app.get("/", (req, res) => {
    res.send("Hello! WebSocket server is running.");
});

startWS(server);

server.listen(8080, () => {
    console.log("🚀 Server running at http://localhost:8080");
});

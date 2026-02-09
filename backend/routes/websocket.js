import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import crypto from "crypto";
// import { auditLog } from "../utils/auditlogger.js";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 15);

function generateSessionId() {
    return nanoid();
}
let today = new Date();

function getDailySalt(date = new Date()) {
    const day = date.toISOString().slice(0, 10); // YYYY-MM-DD
    return day;
}

function hashIp(ip, salt) {
    return crypto.createHash("sha256").update(ip + getDailySalt()).digest("hex");
}



const iphashmap = new Map();

function ratelimit(iphash) {    //rate limit
    const now = Date.now();
    const window = 2 * 60 * 1000;
    const MAX_REQUESTS = 10;

    let queue = iphashmap.get(iphash) || [];

    while (queue.length && now - queue[0] > window) {
        queue.shift();
    }
    queue.push(now);
    iphashmap.set(iphash, queue);

    if (queue.length > MAX_REQUESTS) {
        // auditLog({
        //     ip: iphash,
        //     socketid: socket.id,
        //     action: "RATE_LIMIT_EXCEEDED"
        // });
        return true;
    }
    return queue.length > MAX_REQUESTS;

}

setInterval(() => {   //memory cleanup
    const now = Date.now();
    const RATE_LIMIT_WINDOW = 10 * 60 * 1000;

    for (const [ip, timestamps] of iphashmap) {
        if (now - timestamps[timestamps.length - 1] > RATE_LIMIT_WINDOW) {
            iphashmap.delete(ip);
        }
    }
}, 60 * 60 * 1000);


export function startSocket(server) {
    const io = new Server(server, {
        path: "/ws",
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    const getRoomUserCount = (roomName) => {
        const room = io.sockets.adapter.rooms.get(roomName);
        return room ? room.size : 0;
    };

    io.on("connection", (socket) => {

        console.log("socket connected:", socket.id);

        socket.iphash = hashIp(socket.handshake.headers["x-forwarded-for"]?.split(",")[0] || socket.handshake.address)

        // auditLog({
        //     ip: socket.iphash,
        //     socketid: socket.id,
        //     action: "SOCKET_CONNECTED"
        // });

        if (ratelimit(socket.iphash)) {
            socket.emit("rate limited")
            socket.disconnect(true);
            return;
        }

        socket.on("createroom", (data) => {
            const roomid = generateSessionId();
            socket.join(roomid);
            socket.roomId = roomid;
            console.log(`room created: ${roomid}`);

            // auditLog({
            //     ip: socket.iphash,
            //     socketid: socket.id,
            //     action: `ROOM_CREATED:${roomid}`
            // });

            const Url = `http://localhost:5173/${roomid}`;
            socket.emit("connected&url", {
                url: Url,
                roomID: roomid,
            })

            socket.emit("msgg", {
                msg: "hellooo guysssss",
                roomsize: getRoomUserCount(socket.roomId),
                sessionid: socket.roomId
            });

        });

        socket.on("joinroom", ({ roomid }) => {
            if (!roomid) return;

            socket.join(roomid);
            socket.roomId = roomid;

            // auditLog({
            //     ip: socket.iphash,
            //     socketid: socket.id,
            //     action: `ROOM_JOINED:${roomid}`
            // });

            socket.to(roomid).emit("peerconnected", { peerId: socket.id })
            console.log(`room joined: ${roomid}`);

            socket.emit("msgg", {
                msg: "hellooo guysssss",
                roomsize: getRoomUserCount(socket.roomId),
                sessionid: socket.roomId
            });
        });

        socket.on("getready", ({ roomid }) => {

            // auditLog({
            //     ip: socket.iphash,
            //     socketid: socket.id,
            //     action: `GET_READY:${roomid}`
            // });

            socket.to(roomid).emit("getready");
        })

        socket.on("sdp-offer", ({ roomid, sdpoffer }) => {

            // auditLog({
            //     ip: socket.iphash,
            //     socketid: socket.id,
            //     action: `SDP_OFFER_SENT:${roomid}`
            // });

            socket.to(roomid).emit("sdp-offer", { sdpoffer });
            console.log("Relaying Offer for room:", roomid);
        });

        socket.on("sdp-answer", ({ roomid, sdpanswer }) => {

            // auditLog({
            //     ip: socket.iphash,
            //     socketid: socket.id,
            //     action: `SDP_ANSWER_SENT:${roomid}`
            // });

            socket.to(socket.roomId).emit("sdp-answer", { sdpanswer });
            console.log("Relaying Answer for room:", roomid);
        });

        // socket.on("ice-candidate", ({ roomid, candidate }) => {
        //     socket.to(roomid).emit("ice-candidate", { candidate });
        // });

        socket.on("disconnect", (reason) => {
            console.log("WS disconnected:", reason);

            // auditLog({
            //     ip: socket.iphash,
            //     socketid: socket.id,
            //     action: `SOCKET_DISCONNECTED:${reason}`
            // });

            socket.leave(socket.roomId);
        });
    })
}

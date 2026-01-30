import { Server } from "socket.io";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 15);

function generateSessionId() {
    return nanoid();
}

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

        socket.on("createroom", () => {
            const roomid = generateSessionId();
            socket.join(roomid);
            socket.roomId = roomid;
            console.log(`room created: ${roomid}`);
            const Url = `http://localhost:5173/${roomid}`;
            socket.emit("connected&url", {
                url: Url,
                message: "Room created successfully"
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

            socket.to(roomid).emit("msgg", { peerId: socket.id })
            console.log(`room joined: ${roomid}`);

            socket.emit("msgg", {
                msg: "hellooo guysssss",
                roomsize: getRoomUserCount(socket.roomId),
                sessionid: socket.roomId
            });
        });

        socket.on("disconnect", (reason) => {
            console.log("WS disconnected:", reason);
            socket.leave(socket.roomId);
        });
    })
}

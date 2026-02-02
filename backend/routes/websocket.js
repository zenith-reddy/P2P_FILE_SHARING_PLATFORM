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

        socket.on("createroom", (data) => {
            const roomid = generateSessionId();
            socket.join(roomid);
            socket.roomId = roomid;
            console.log(`room created: ${roomid}`);
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

            socket.to(roomid).emit("peerconnected", { peerId: socket.id })
            console.log(`room joined: ${roomid}`);

            socket.emit("msgg", {
                msg: "hellooo guysssss",
                roomsize: getRoomUserCount(socket.roomId),
                sessionid: socket.roomId
            });
        });

        socket.on("getready",({roomid})=>{
            socket.to(roomid).emit("getready");
        })

        socket.on("sdp-offer", ({ roomid, sdpoffer }) => {
            socket.to(roomid).emit("sdp-offer", { sdpoffer });
            console.log("Relaying Offer for room:", roomid);
        });
        
        socket.on("sdp-answer", ({ roomid,sdpanswer }) => {
            socket.to(socket.roomId).emit("sdp-answer", { sdpanswer });
            console.log("Relaying Answer for room:", roomid);
        });

        // socket.on("ice-candidate", ({ roomid, candidate }) => {
        //     socket.to(roomid).emit("ice-candidate", { candidate });
        // });

        socket.on("disconnect", (reason) => {
            console.log("WS disconnected:", reason);
            socket.leave(socket.roomId);
        });
    })
}

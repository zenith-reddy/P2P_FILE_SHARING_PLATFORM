import { Server } from "socket.io";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 15);

function generateSessionId() {
    return nanoid();
}

export function startSocket(server) {
    const io = new Server(server, {
        path: "/ws/create",
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

        // const sessionId = uuidv4();

        const Url = `https://securep2p.io/${generateSessionId()}`;

        socket.emit("connected&url", {
            url: Url,
            message: "WebSocket /ws/create is alive"
        })


        socket.on("msgg", (data) => {
            console.log("received:", data);
        });

        socket.on("disconnect", (reason) => {
            console.log("WS disconnected:", reason);
            socket.leave("mfc lauda");
        });

        socket.join("mfc lauda");

        io.to("mfc lauda").emit("msgg", {
            msg: "hellooo guysssss",
            roomsize:getRoomUserCount("mfc lauda")
        });;
        console.log(socket.rooms);
        console.log(socket.rooms.size);


    })

    



}






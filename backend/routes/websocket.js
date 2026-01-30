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

        // const sessionId = uuidv4();
        const saveid = generateSessionId();


        const Url = `https://securep2p.io/${saveid}`;

        socket.emit("connected&url", {
            url: Url,
            message: "WebSocket /ws/create is alive"
        })
      socket.on("create-room",()=> {
    const roomid =  generateSessionId();
     socket.join(roomid);
     socket.emit("room created",roomid);

    console.log(`room created: ${roomid}`);
   

      })

      socket.on("join-room",({roomid})=>{
if(!roomid) return ;
socket.join(roomid);
socket.to(roomid).emit("peer connected",{peerId: socket.id})
console.log(`room joined: ${roomid}`);



      });

        socket.on("msgg", (data) => {
            console.log("received:", data);
        });

        socket.on("disconnect", (reason) => {
            console.log("WS disconnected:", reason);
            socket.leave(saveid);
        });
        socket.join(saveid);

       socket.emit("msgg", {
            msg: "hellooo guysssss",
            roomsize:getRoomUserCount(saveid),
            sessionid:saveid
        });;
        console.log(socket.rooms);
        console.log(socket.rooms.size);


    })

    



}






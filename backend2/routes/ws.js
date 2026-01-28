import { WebSocketServer } from "ws";
// import { v4 as uuidv4 } from "uuid"; 
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);

function generateSessionId() {
    return nanoid(); 
}
export function startWS(server) {

    const wsscreate = new WebSocketServer({
        server,
        path: "/ws/create"
    });

    wsscreate.on("connection", (ws, req) => {
        console.log("WS connected:", req.url);


        // const sessionId = uuidv4();

        const Url = `https://securep2p.io/${generateSessionId()}`;

        ws.send(JSON.stringify({
            type: "connected",
            url:Url,
            message: "WebSocket /ws/create is alive"
        }));


        ws.on("message", (msg) => {
            console.log("received:", msg.toString());
        });


        ws.send()

        ws.on("close", () => {
            console.log("WS disconnected");
        });

    })
    console.log("✅ WebSocket endpoint /ws/create is ready");

};







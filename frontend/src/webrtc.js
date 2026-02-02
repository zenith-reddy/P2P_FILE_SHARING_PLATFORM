import { io } from "socket.io-client";

export const socket = io("http://localhost:8080", {
  path: "/ws",
});

export const pc = new RTCPeerConnection({
  iceServers: [],
});

export let dc = null;

export let roomCreated = false;

export function markRoomCreated() {
  roomCreated = true;
}

export function setDC(channel) {  //for creater
  dc = channel;

  dc.bufferedAmountLowThreshold = 4 * 1024 * 1024; //4MB

}

// let receiveBuffer = [];
// let receivedSize = 0;
// let currentFile = null;

// let onProgressUpdate = null;

// export function registerProgressHandler(callback) {
//   onProgressUpdate = callback;
// }


// receiver side  either keep it here or in the start of loading page so that it dosnet form a race condition
// pc.ondatachannel = (event) => {
//   dc = event.channel;

  // dc.onopen = () => {
  //   console.log("DataChannel OPEN (receiver)");
  // };

  // dc.onmessage = (e) => {
  //   // console.log("Received:", e.data);
  //   if (typeof e.data === "string") {
  //     const msg = JSON.parse(e.data);

  //     if (msg.type === "file-meta") {
  //       currentFile = msg;
  //       receiveBuffer = [];
  //       receivedSize = 0;
  //       console.log("Receiving:", msg.name);
  //       if (onProgressUpdate) {
  //         onProgressUpdate({
  //           type: "start",
  //           file: {
  //             id: msg.id,
  //             name: msg.name,
  //             size: `${Math.ceil(msg.size / 1024 / 1024)}MB`,
  //             progress: 0,
  //             type: "receiving"
  //           }
  //         });
  //       }
  //     }

  //     if (msg.type === "file-end") {
  //       const blob = new Blob(receiveBuffer, {
  //         type: currentFile.mime,
  //       });

  //       downloadBlob(blob, currentFile.name);
  //       console.log("File received:", currentFile.name);

  //       receiveBuffer = [];
  //       currentFile = null;
  //     }
  //     return;
  //   }

  //   receiveBuffer.push(e.data);
  //   receivedSize += e.data.byteLength;

  //   if (currentFile) {
  //     const progress = Math.floor(
  //       (receivedSize / currentFile.size) * 100
  //     );
  //     if (onProgressUpdate) {
  //       onProgressUpdate({
  //         id: currentFile.id,
  //         progress: progress,
  //         // add other data if needed
  //       });
  //     }


  //   }

  //   // receiveBuffer.push(e.data);
  //   // receivedSize += e.data.byteLength;
  // };

  // function downloadBlob(blob, filename) {
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = filename;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // }
// }


export function cleanupWebRTC() {
  try {
    if (dc) {
      dc.onopen = null;
      dc.onmessage = null;
      dc.onclose = null;
      dc.onerror = null;
      dc.close();
    }
  } catch {}

  try {
    if (pc) {
      pc.onicecandidate = null;
      pc.ondatachannel = null;
      // pc.close();
    }
  } catch {}

  dc = null;
}

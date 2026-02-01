import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import "./LoadingPage.css";
import { io } from "socket.io-client";

const LoadingPage = () => {
  const [statusText, setStatusText] = useState("Initializing handshake...");
  const STEPS = {
    ICE: "Resolving ICE candidates...",
    KEYS: "Verifying encryption keys...",
    TUNNEL: "Establishing secure tunnel...",
    SYNC: "Synchronizing state...",
    DONE: "Connection established",
  };
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  let dc;

  ////////////////////////////
  //**************************ws.current ===> oka socket*****************************
  //////////////////////
  const updateStatus = (step) => {
    setStatusText(STEPS[step]);
  };

  const { sessid } = useParams();
  const ws = useRef(null);

  // Simulation of connection steps
  useEffect(() => {
    if (!sessid) {
      return;
    }

    ws.current = io("http://localhost:8080", {
      path: "/ws",
    });

    ws.current.on("connect", () => {
      console.log("WS connected");

      ws.current.emit(
        "joinroom",
        {
          roomid: sessid,
        },
        console.log(sessid),
      );
    });

    ws.current.on("sdp-offer", async (data) => {
      const offer = data.sdpoffer;

      await pc.setRemoteDescription(offer);

      if (offer.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        // console.log("Answer created");
      }
      // else {
      //   log("Remote description set");
      // }
    });

    pc.onicecandidate = (e) => {
      if (e.candidate === null) {
        ws.current.to(roomid).emit("sdp-answer", {
          sdpanswer: pc.localDescription,
        });
      }
    };

    return () => {
      ws.current.disconnect();
    };
  }, []);

  return (
    <div className="loading-page-wrapper">
      <div className="loading-card">
        {/* Glow Effects */}
        <div className="glow-effect center-cyan"></div>
        <div className="glow-effect center-blue"></div>

        <div className="loader-content">
          <div className="radar-spinner">
            <div className="radar-ring ring-1"></div>
            <div className="radar-ring ring-2"></div>
            <div className="radar-ring ring-3"></div>
            <div className="core-dot"></div>
          </div>

          <h2 className="loading-title">Connecting</h2>
          <div className="status-container">
            <span className="status-text">{statusText}</span>
            <span className="typing-cursor">|</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;

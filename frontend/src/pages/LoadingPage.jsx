import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
// import "./LoadingPage.css";
// import { io } from "socket.io-client";
import { socket, pc, dc, setDC } from "../webrtc";
import "../Styles/LoadingPage.css";
// import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import {
  setpair,
  setPublicKey,
  setsharedpublicKey,
  setSessionKey,
} from "../Encryption.js";

const LoadingPage = () => {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState("Initializing handshake...");

  const { sessid } = useParams();
  // Simulation of connection steps
  useEffect(() => {
    if (!sessid) {
      return;
    }

    pc.ondatachannel = (event) => {
      // const dc = event.channel;
      setDC(event.channel);

      event.channel.onopen = async () => {
        await setpair();
        const localPublicKey = await setPublicKey();
        event.channel.send(
          JSON.stringify({
            type: "public-key",
            key: Array.from(localPublicKey),
          }),
        );

        //sec-> pk
        //keypair.publicKey()
        // await setsharedpublicKey();
        // await setSessionKey();
      };
      event.channel.onmessage = async (event) => {
        const message = event.data;
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.type === "public-key") {
          await setsharedpublicKey(new Uint8Array(parsedMessage.key));
          await setSessionKey();
          navigate(`/transfer`);
        }
      };
    };

    const handleconnect = () => {
      console.log("WS connected joining room:", sessid);
      socket.emit("joinroom", { roomid: sessid });
    };

    const handlesdpoffer = async (data) => {
      console.log("sdp offer:", data.sdpoffer);

      if (pc.signalingState !== "stable") {
        //  *** VERY IMP ***
        console.warn("Connection not stable, ignoring duplicate offer");
        return;
      }

      await pc.setRemoteDescription(data.sdpoffer);

      if (data.sdpoffer.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("Answer created and set local");
      }
    };

    const handlenavigate = () => {
      setStatusText("connected");

      setTimeout(() => {
        setStatusText("redirecting..");
      }, 1000);

      setTimeout(() => {
        navigate("/transfer");
      }, 2000);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate === null) {
        socket.emit("sdp-answer", {
          roomid: sessid,
          sdpanswer: pc.localDescription,
        });
        setStatusText("Sending handshake...");
      }
    };

    // socket.on("connect", () => {});
    if (socket.connected) {
      handleconnect();
    }

    socket.on("connect", handleconnect);

    socket.on("sdp-offer", handlesdpoffer);
    socket.on("getready", handlenavigate);

    return () => {
      // socket.disconnect();
      socket.off("connect", handleconnect);
      socket.off("sdp-offer", handlesdpoffer);
      socket.off("getready", handlenavigate);
      pc.onicecandidate = null;
    };
  }, [sessid]);

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

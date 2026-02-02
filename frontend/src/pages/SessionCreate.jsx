import React, { useState, useEffect, useRef } from "react";
import "../Styles/SessionCreate.css";
import dummyQR from "../assets/dummyqr200x200.png";
import { QRCodeSVG } from "qrcode.react";
// import { io } from "socket.io-client";
import { socket, pc, dc } from "../webrtc";
import { setDC } from "../webrtc";
import { useNavigate } from "react-router-dom";


const SessionCreate = () => {
  const navigate = useNavigate();
  const [sessionUrl, setSessionUrl] = useState(null);
  const [roomid, setroomid] = useState(null);

  useEffect(() => {
    const handleconnect = () => {
      console.log("WS connected");
      socket.emit("msgg", { message: "WebSocket connected" });
      socket.emit("createroom", { message: "room joined" });
    };

    const handleurl = (data) => {
      setSessionUrl(data.url);
      setroomid(data.roomID);
      console.log("url has been set");
    };

    const handlepeerconnected = async (data) => {
      console.log("Peer connected via socket");

      // Prevent creating duplicate channels if one already exists
      const channel = pc.createDataChannel("data");
      setDC(channel);
      channel.onopen = () => console.log("Datachannel opened");

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Offer created");
    };

    const handlesdpanswer = async (data) => {
      console.log("SDP Answer:", data.sdpanswer);
      await pc.setRemoteDescription(data.sdpanswer);
      console.log("remote description set  dc opened");

      socket.emit("getready",{roomid});

      navigate(`/transfer`);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate === null && roomid) {
        socket.emit("sdp-offer", {
          roomid,
          sdpoffer: pc.localDescription,
        });
      }
    };

    if (socket.connected && !roomid) {
      handleconnect();
    }

    socket.on("connected&url", handleurl);
    socket.on("peerconnected", handlepeerconnected);
    socket.on("sdp-answer", handlesdpanswer);

    socket.on("msgg", (data) => {
      console.log(data);
    });

    // socket.on("peerconnected", async (data) => {
    //   // dc = pc.createDataChannel("data");
    //   const channel = pc.createDataChannel("data");
    //   setDC(channel);

    //   const offer = await pc.createOffer();
    //   await pc.setLocalDescription(offer);

    //   dc.onopen = () => log("DataChannel OPEN"); //after the datachannell is opened

    //   // dc.onmessage = (e) => {
    //   //   log("Received file");

    //   //   const blob = new Blob([e.data]); //e.data => arraybuffer -> not readable -> need to be dpwnloaded
    //   //   const url = URL.createObjectURL(blob);
    //   //   const a = document.createElement("a");
    //   //   a.href = url;
    //   //   a.download = "received_filee";
    //   //   a.click();
    //   //   URL.revokeObjectURL(url);
    //   // };
    // });

    // ICE gathering finished → show SDP

    pc.onicecandidate = (e) => {
      if (e.candidate === null && roomid) {
        socket.emit("sdp-offer", {
          roomid,
          sdpoffer: pc.localDescription,
        });
      }
    };

    // socket.on("sdp-answer", async (data) => {
    //   await pc.setRemoteDescription(data.sdpanswer);
    // });

    return () => {
      //strick mode ki mk
      socket.off("connected&url", handleurl);
      socket.off("peerconnected", handlepeerconnected);
      socket.off("sdp-answer", handlesdpanswer);
      pc.onicecandidate = null;
    };
  }, [roomid]);

  const [isCopied, setIsCopied] = useState(false);
  const copyToClipboard = () => {
    navigator.clipboard.writeText(sessionUrl);
    setIsCopied(true);
  };

  useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => {
        setIsCopied(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isCopied]);

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent("Join my secure session: " + sessionUrl)}`,
      "_blank",
    );
  };

  const shareTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(sessionUrl)}&text=${encodeURIComponent("Join my secure session")}`,
      "_blank",
    );
  };

  const shareMail = () => {
    window.location.href = `mailto:?subject=Secure P2P Session&body=Join my secure session here: ${sessionUrl}`;
  };
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="session-page-wrapper">
      <div className="session-card">
        <div className="glow-effect left"></div>
        <div className="glow-effect right"></div>

        <div className="connection-visual"></div>

        <div className="card-content">
          <h2 className="title">VELOSYNC</h2>
          <p className="subtitle">Secure peer-to-peer session using WebRTC</p>

          <div className="input-group-wrapper">
            <div className="input-container">
              <LockIcon className="icon-lock" />
              <input
                type="text"
                value={sessionUrl ?? ""}
                readOnly
                className="link-input"
                placeholder="Generating link..."
              />
            </div>
            <div className="qr-container">
              <div
                className={`qr-code ${expanded ? "expanded" : ""}`}
                onClick={() => setExpanded(!expanded)}
              >
                <QRCodeSVG value={sessionUrl} width={48} height={48} />
              </div>
            </div>
          </div>

          <div className="center-action"></div>

          <div className="share-actions">
            <button className="share-btn" onClick={shareWhatsApp}>
              <WhatsAppIcon /> <span>Whatsapp</span>
            </button>
            <button className="share-btn" onClick={shareMail}>
              <MailIcon /> <span>Mail</span>
            </button>
            <button className="share-btn" onClick={copyToClipboard}>
              <CopyIcon /> <span>Copy</span>
            </button>
          </div>

          <div className="card-footer">
            <div className="footer-status">
              <LockIconSmall />
              <span>Speed. Secure. Decentralized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SVG ICON COMPONENTS ---
const UserIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    opacity="0.7"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LockIcon = ({ className }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const LockIconSmall = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6b7280"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: "6px" }}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const CopyIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const LinkIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const WhatsAppIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const TelegramIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const MailIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

export default SessionCreate;

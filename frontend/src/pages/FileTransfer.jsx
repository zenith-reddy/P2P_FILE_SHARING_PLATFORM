import React, { useState, useRef, useEffect } from "react";
import { socket, pc, dc, cleanupWebRTC } from "../webrtc";
import "../Styles/FileTransfer.css";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { sessionKey } from "../Encryption.js";

const FileTransfer = () => {
  const navigate = useNavigate();
  
  const [activeTransfers, setActiveTransfers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("connected");
  const [istransfering, setistransfering] = useState(false);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString("en-GB"), message: "Peer connected successfully." },
  ]);

  const fileInputRef = useRef(null);
  const logEndRef = useRef(null);
  const ActTransRef = useRef(null);

  const chunkSize = 16384;
  const MAX_BUFFERED_AMOUNT = 8 * 1024 * 1024;
  const receiveBufferRef = useRef([]);
  const receivedSizeRef = useRef(0);
  const currentFileRef = useRef(null);

  const getTime = () =>
    new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function encryptChunk(sessionKey, chunkBuffer) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sessionKey,
      chunkBuffer,
    );
    return { iv, data: encrypted };
  }

  async function decryptChunk(sessionKey, iv, encryptedData) {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      sessionKey,
      encryptedData,
    );
    return decrypted;
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    // Find the right index for the sizes array
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Calculate the size and round to 1 decimal place (e.g., 2.4 MB)
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  useEffect(() => {
    const handleUnload = () => cleanupWebRTC();
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  useEffect(() => {
    if (!dc) {
      navigate(`/`);
      return;
    }
    if (dc.readyState === "open") {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("retrying");
    }
  }, [dc, dc?.readyState, navigate]);

  // Autoscroll logic
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  useEffect(() => {
    ActTransRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTransfers.length]);


  useEffect(() => {
    if (istransfering) return;

    // Find the next waiting file
    const nextFile = activeTransfers.find(
      (t) => t.status === "waiting" && t.type === "sending"
    );

    if (nextFile) {
      setistransfering(true);
      sendFile(nextFile);
    }
  }, [activeTransfers, istransfering]);


  useEffect(() => {
    if (!dc) return;

    dc.onmessage = async (e) => {
      if (typeof e.data === "string") {
        const msg = JSON.parse(e.data);

        if (msg.type === "file-meta") {
          currentFileRef.current = msg;
          receiveBufferRef.current = [];
          receivedSizeRef.current = 0;

          setActiveTransfers((prev) => [
            ...prev,
            {
              id: msg.id,
              name: msg.name,
              size: formatBytes(msg.size),
              progress: 0,
              type: "receiving",
              status: "transferring", // Mark explicitly as transferring
            },
          ]);

          setLogs((prev) => [...prev, { time: getTime(), message: `Receiving ${msg.name}` }]);
          return;
        }

        if (msg.type === "file-end") {
          const file = currentFileRef.current;
          if (!file) return;

          const blob = new Blob(receiveBufferRef.current, { type: file.mime });
          downloadBlob(blob, file.name);

          // Mark as 100% and completed
          setActiveTransfers((prev) =>
            prev.map((t) => (t.id === file.id ? { ...t, progress: 100, status: "completed" } : t))
          );
          setLogs((prev) => [...prev, { time: getTime(), message: `Received ${file.name}` }]);

          receiveBufferRef.current = [];
          currentFileRef.current = null;
          receivedSizeRef.current = 0;
          return;
        }
      }

      const parsedData = JSON.parse(e.data);
      const iv = new Uint8Array(parsedData.iv);
      const encryptedData = new Uint8Array(parsedData.data).buffer;

      const decryptedData = await decryptChunk(sessionKey, iv, encryptedData);
      receiveBufferRef.current.push(decryptedData);
      receivedSizeRef.current += decryptedData.byteLength;

      const file = currentFileRef.current;
      if (!file) return;

      const progress = Math.floor((receivedSizeRef.current / file.size) * 100);
      setActiveTransfers((prev) =>
        prev.map((t) => (t.id === file.id ? { ...t, progress } : t))
      );
    };
  }, [dc]);


  const waitForBufferLow = () => {
    if (dc.bufferedAmount < MAX_BUFFERED_AMOUNT) return Promise.resolve();
    return new Promise((resolve) => {
      dc.onbufferedamountlow = () => {
        dc.onbufferedamountlow = null;
        resolve();
      };
    });
  };

  const sendFile = async (transferItem) => {
    const file = transferItem.fileObj;
    const fileId = transferItem.id;
    let offset = 0;

    // Update state from waiting to transferring
    setActiveTransfers((prev) =>
      prev.map((t) => (t.id === fileId ? { ...t, status: "transferring" } : t))
    );
    setLogs((prev) => [...prev, { time: getTime(), message: `Sending ${file.name}` }]);

    dc.send(
      JSON.stringify({
        type: "file-meta",
        id: fileId,
        name: file.name,
        size: file.size,
        mime: file.type,
        chunkSize: chunkSize,
      })
    );

    while (offset < file.size) {
      await waitForBufferLow();

      const slice = file.slice(offset, offset + chunkSize);
      const buffer = await slice.arrayBuffer();
      const { iv, data } = await encryptChunk(sessionKey, buffer);

      dc.send(
        JSON.stringify({
          type: "file-chunk",
          iv: Array.from(iv),
          data: Array.from(new Uint8Array(data)),
        })
      );

      offset += buffer.byteLength;
      const percent = Math.floor((offset / file.size) * 100);
      setActiveTransfers((prev) =>
        prev.map((t) => (t.id === fileId ? { ...t, progress: percent } : t))
      );
    }

    dc.send(JSON.stringify({ type: "file-end", id: fileId }));
    
    setActiveTransfers((prev) =>
      prev.map((t) => (t.id === fileId ? { ...t, progress: 100, status: "completed" } : t))
    );
    setLogs((prev) => [...prev, { time: getTime(), message: `Sent ${file.name}` }]);

    setistransfering(false); 
  };


  const enqueueFiles = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    if (dc && dc.readyState === "open") {
      const newTransfers = Array.from(filesList).map((f) => ({
        id: uuidv4(),
        name: f.name,
        size: formatBytes(f.size),
        progress: 0,
        type: "sending",
        status: "waiting", // ADD TO QUEUE AS WAITING
        fileObj: f,        // Keep a reference to the actual file object to read later
      }));

      setActiveTransfers((prev) => [...prev, ...newTransfers]);
    }
  };

  const handleFileSelect = (event) => {
    enqueueFiles(event.target.files);
    // Reset the input value so selecting the same file again works
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    enqueueFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };


  return (
    <div className="transfer-page-wrapper">
      <div className="transfer-card">
        <div className="card-header">
          <div className={`status-badge ${connectionStatus}`}>
            <div
              className={`status-dot ${connectionStatus === "connected" ? "pulse" : "pulse-warning"}`}
            ></div>
            <span>
              {connectionStatus === "connected"
                ? "Securely Connected"
                : "Connection Lost. Retrying..."}
            </span>
          </div>
          <button
            className="disconnect-btn"
            onClick={() => {
              cleanupWebRTC();
              setActiveTransfers([]);
              setLogs([]);
              setConnectionStatus("retrying");
              navigate("/");
            }}
          >
            Disconnect
          </button>
        </div>

        <div className="card-content-grid">
          {/* LEFT: DROP ZONE */}
          <div
            className="drop-zone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <div className="drop-content">
              <UploadCloudIcon />
              <h3>Send Files</h3>
              <p>Drag & drop or click to browse</p>
              <span className="sub-text">Transfer starts immediately</span>
            </div>
          </div>

          {/* RIGHT: TRANSFERS & LOGS */}
          <div className="info-panel">
            {/* SECTION: ACTIVE TRANSFERS */}
            <div className="panel-section">
              <h4 className="section-title">Active Transfers</h4>
              <div className="transfer-list">
                {activeTransfers.length === 0 ? (
                  <div className="empty-state">No active transfers</div>
                ) : (
                  activeTransfers.map((file) => {
                    const isCompleted = file.status === "completed";
                    const isWaiting = file.status === "waiting";

                    return (
                      <div key={file.id} className="transfer-item">
                        <div
                          className={`file-icon ${isCompleted ? "completed" : ""} ${isWaiting ? "waiting" : ""} ${file.type === "sending" ? "sending" : ""}`}
                        >
                          {/* 1. If Completed */}
                          {isCompleted ? (
                            file.type === "sending" ? (
                              <CheckIconsent />
                            ) : (
                              <CheckIconreceived />
                            )
                          ) : /* 2. If Waiting */
                          isWaiting ? (
                            <ClockIcon />
                          ) : /* 3. If Active (Sending/Receiving) */
                          file.type === "sending" ? (
                            <ArrowUpIcon />
                          ) : (
                            <ArrowDownIcon />
                          )}
                        </div>

                        <div className="file-details">
                          <div className="file-name-row">
                            <span className="name">{file.name}</span>
                            <span className="size">{file.size}</span>
                          </div>

                          <div className="progress-bar-container">
                            <div
                              className={`progress-bar-fill ${file.type} ${isWaiting ? "waiting" : ""}`}
                              style={{ width: isWaiting ? "100%" : `${file.progress}%` }}
                            ></div>
                          </div>

                          <div className="status-row">
                            <span>
                              {isCompleted
                                ? "Completed"
                                : isWaiting
                                  ? "Waiting in queue..."
                                  : file.type === "sending"
                                    ? "Sending..."
                                    : "Downloading..."}
                            </span>
                            <span>{isWaiting ? "0%" : `${file.progress}%`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={ActTransRef} />
              </div>
            </div>

            {/* SECTION: ACTIVITY LOG */}
            <div className="panel-section flex-grow">
              <h4 className="section-title">Activity Log</h4>
              <div className="log-container">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-time">[{log.time}]</span>
                    <span className="log-msg">{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ICONS (Simple SVG components) ---
const ClockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const UploadCloudIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.8, marginBottom: "12px" }}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#4ade80"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

const ArrowDownIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#60a5fa"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);

const CheckIconsent = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#4ade80"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CheckIconreceived = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#60a5fa"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default FileTransfer;
import React, { useState, useRef, useEffect } from "react";
import "./FileTransfer.css";
import { socket, pc, dc,cleanupWebRTC } from "../webrtc";
import { useNavigate } from "react-router-dom";

const FileTransfer = () => {
  const navigate = useNavigate();
  // --- STATE MANAGEMENT ---
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  const [activeTransfers, setActiveTransfers] = useState([
    // {
    //   id: 1,
    //   name: "project_v1.zip",
    //   type: "sending",
    //   progress: 45,
    //   size: "12MB",
    // },
    // {
    //   id: 2,
    //   name: "image_assets.png",
    //   type: "receiving",
    //   progress: 80,
    //   size: "4MB",
    // },
  ]);
  // State: 'connected' or 'retrying'
  const [connectionStatus, setConnectionStatus] = useState("connected");

  // useEffect(() => {
  //   registerProgressHandler((data) => {
  //     if (data.type === "start") {
  //       // Add the new file to the list
  //       setActiveTransfers((prev) => [...prev, data.file]);
  //     } else {
  //       // Update progress for existing file
  //       setActiveTransfers((prev) =>
  //         prev.map((t) =>
  //           t.id === data.id ? { ...t, progress: data.progress } : t,
  //         ),
  //       );
  //     }
  //   });

  //   // Cleanup: Remove handler when component dies
  //   return () => registerProgressHandler(null);
  // }, []);
  useEffect(() => {
    const handleUnload = () => {
      cleanupWebRTC();
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  useEffect(() => {
    if (!dc) {
      // setConnectionStatus("disconnected");
      navigate(`/`); // just for temporary later in app.jsx
      return;
    }

    if (dc.readyState === "open") {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("retrying");
    }
  }, [dc, dc?.readyState]);

  const [logs, setLogs] = useState([
    { time: "23:36:01", message: "Peer connected successfully." },
    { time: "23:36:10", message: "Started sending project_v1.zip" },
  ]);

  const fileInputRef = useRef(null);

  // --- HANDLERS ---
  const chunkSize = 16384;
  const MAX_BUFFERED_AMOUNT = 8 * 1024 * 1024;

  const receiveBufferRef = useRef([]);
  const receivedSizeRef = useRef(0);
  const currentFileRef = useRef(null);

  const waitForBufferLow = () => {
    if (dc.bufferedAmount < MAX_BUFFERED_AMOUNT) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      dc.onbufferedamountlow = () => {
        dc.onbufferedamountlow = null;
        resolve();
      };
    });
  };

  useEffect(() => {
    if (!dc) return;

    dc.onmessage = (e) => {
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
              size: `${Math.ceil(msg.size / 1024 / 1024)}MB`,
              progress: 0,
              type: "receiving",
            },
          ]);

          return;
        }

        if (msg.type === "file-end") {
          const file = currentFileRef.current;
          if (!file) return;

          const blob = new Blob(receiveBufferRef.current, {
            type: file.mime,
          });

          downloadBlob(blob, file.name);

          // mark as 100%
          setActiveTransfers((prev) =>
            prev.map((t) => (t.id === file.id ? { ...t, progress: 100 } : t)),
          );

          receiveBufferRef.current = [];
          currentFileRef.current = null;
          receivedSizeRef.current = 0;
          return;
        }
      }

      receiveBufferRef.current.push(e.data);
      receivedSizeRef.current += e.data.byteLength;

      const file = currentFileRef.current;
      if (!file) return;

      const progress = Math.floor((receivedSizeRef.current / file.size) * 100);

      setActiveTransfers((prev) =>
        prev.map((t) => (t.id === file.id ? { ...t, progress } : t)),
      );
    };

    return () => {
      // dc.onmessage = null;
    };
  }, [dc]);

  const sendFile = async (file) => {
    const fileId = crypto.randomUUID();
    let offset = 0;

    setActiveTransfers((prev) => [
      ...prev,
      {
        id: fileId,
        name: file.name,
        size: `${Math.ceil(file.size / 1024 / 1024)}MB`,
        progress: 0,
        type: "sending",
      },
    ]);

    dc.send(
      JSON.stringify({
        type: "file-meta",
        id: fileId,
        name: file.name,
        size: file.size,
        mime: file.type,
        chunkSize: chunkSize,
      }),
    );

    while (offset < file.size) {
      await waitForBufferLow();

      const slice = file.slice(offset, offset + chunkSize);
      const buffer = await slice.arrayBuffer();
      dc.send(buffer);
      offset += buffer.byteLength;
      const percent = Math.floor((offset / file.size) * 100);
      setActiveTransfers((prev) =>
        prev.map((t) => (t.id === fileId ? { ...t, progress: percent } : t)),
      );
    }

    dc.send(
      JSON.stringify({
        type: "file-end",
        id: fileId,
      }),
    );
  };

  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log("Files selected:", files);
      if (dc && dc.readyState === "open") {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          await sendFile(file);
          // const reader = new FileReader();
          // let offset = 0;
          // reader.addEventListener("load", (e) => {
          //   dc.send(e.target.result);
          //   offset += e.target.result.byteLength;
          //   if (offset < file.size) {
          //     readSlice(offset);
          //   }
          // });

          // const readSlice = (o) => {
          //   const slice = file.slice(offset, o + chunkSize);
          //   fileReader.readAsArrayBuffer(slice);
          // };

          // readSlice(0);
        }
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log("Files selected:", files);
      if (dc && dc.readyState === "open") {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();

          reader.onload = () => {
            dc.send(reader.result);
            console.log("File sent", file.name);
          };

          reader.readAsArrayBuffer(file);
        }
      }
    }
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
                  activeTransfers.map((file) => (
                    <div key={file.id} className="transfer-item">
                      <div className="file-icon">
                        {file.type === "sending" ? (
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
                            className={`progress-bar-fill ${file.type}`}
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                        <div className="status-row">
                          <span>
                            {file.type === "sending"
                              ? "Sending..."
                              : "Downloading..."}
                          </span>
                          <span>{file.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
                {/* LOGIC: Auto-scroll to bottom of logs */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ICONS (Simple SVG components) ---

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

export default FileTransfer;

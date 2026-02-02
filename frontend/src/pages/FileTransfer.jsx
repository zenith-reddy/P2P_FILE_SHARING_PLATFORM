import React, { useState, useRef, useEffect } from "react";
import "./FileTransfer.css";
import { socket, pc, dc } from "../webrtc";
import { useNavigate } from "react-router-dom";

const FileTransfer = () => {
  const navigate = useNavigate();
  // --- STATE MANAGEMENT ---
  const [activeTransfers, setActiveTransfers] = useState([
    {
      id: 1,
      name: "project_v1.zip",
      type: "sending",
      progress: 45,
      size: "12MB",
    },
    {
      id: 2,
      name: "image_assets.png",
      type: "receiving",
      progress: 80,
      size: "4MB",
    },
  ]);
  // State: 'connected' or 'retrying'
  const [connectionStatus, setConnectionStatus] = useState("connected");

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

  const handleFileSelect = (event) => {
    const files = event.target.files;
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
            onClick={() => /* LOGIC: Close connection */ {}}
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

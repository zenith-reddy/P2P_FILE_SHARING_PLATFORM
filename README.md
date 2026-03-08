# VELOSYNC – Speed. Secure. Decentralized.

## Brief Description
**VELOSYNC** is a fast, highly secure, and decentralized peer-to-peer (P2P) file-sharing application. It establishes a direct connection between users using **WebRTC**, ensuring that files are transferred directly from device to device without ever being stored on a central server. All transfers are protected with robust End-to-End Encryption.

## Thought Behind the Project
We built Velosync to simplify file sharing while addressing growing concerns around privacy and cloud dependency. Many traditional platforms require users to upload files to third-party servers, often introducing size limits, delays, and potential security risks. By leveraging WebRTC and end-to-end encryption, Velosync enables direct peer-to-peer transfers, allowing users to share files instantly while maintaining complete control and privacy over their data.

## Hosted Link
https://velosyncp2p.vercel.app/

## Screenshots
![Home Screen / Session Generation](readmescreenshots/Screenshot%202026-03-08%20215738.png)

*Generating a secure session ID and QR code.*

![File Transfer Interface](readmescreenshots/Screenshot%202026-03-08%20215914.png)

*Drag-and-drop secure file transfer.*

![Connection establishment](readmescreenshots/Screenshot%202026-03-08%20220017.png)

*Connection establishment.*


![How the project works](readmescreenshots/Screenshot%202026-03-08%20222449.png)

*How the project works*

![Privacy and Security](readmescreenshots/Screenshot%202026-03-08%20221501.png)

*Privacy and Security statements*

## Main Features Implemented

* **Direct P2P Transfer**: Uses WebRTC DataChannels for peer-to-peer file transfer. Data goes directly between users, bypassing any central servers.
* **End-to-End Encryption (E2EE)**: Secures file transfers using the Web Crypto API. Generates ECDH (P-256 curve) key pairs for secure key exchange and derives AES-GCM (256-bit) session keys to encrypt payloads.
* **Secure Signaling & Auditing**:
    * **Rate Limiting**: Custom IP-based sliding window rate limiter (max 20 requests/2 mins on development and max 50 requests/2 mins on production) on the signaling server to prevent abuse.
    * **IP Hashing**: User IP addresses are hashed securely using SHA-256 with a daily rotating salt for privacy.
    * **Audit Logging**: Comprehensive server-side logging that records socket events, room creation/joining, and rate limit violations. Logs are automatically rotated and purged every 6 hours to save disk space.
* **Easy Session Sharing**:
    * Generate a unique Session ID.
    * Share via **QR Code** or direct **URL Link**.
    * Integrated sharing buttons for WhatsApp and Email.
* **Modern UI**: Built with React and Vite for a fast, responsive experience, complete with new informational routes (About, Privacy, How It Works).

## Tech Stack and Concepts Used

### Frontend
* **Framework**: React (v19) with Vite
* **Routing**: React Router DOM (`react-router-dom`)
* **Security Concepts**: Web Crypto API (Native ECDH & AES-GCM implementation for E2EE)
* **Connectivity**: `socket.io-client`, native `RTCPeerConnection`
* **Utilities**: `qrcode.react` (for session QR codes), `uuid`

### Backend (Signaling Server)
* **Runtime**: Node.js
* **WebSocket**: `socket.io` (Custom implementation over native HTTP)
* **Security & Logging**: `crypto` (SHA-256 for IP hashing), `fs` & `path` (Audit logging), `nanoid` (Session ID generation)

## Technical Architecture

### Connection Flow
The file transfer process in Velosync follows a secure peer-to-peer connection flow:

1. **Session Creation**: The initiator starts a transfer by creating a session. The signaling server generates a unique Session ID and creates a temporary room associated with that ID.
2. **Session Sharing**: The initiator shares the session with the receiver using either a direct URL link or a QR code. This allows the receiver to quickly join the same session from another device.
3. **Receiver Joins the Session**: When the receiver opens the link or scans the QR code, their client connects to the signaling server and joins the room using the provided Session ID.
4. **Signaling and Key Exchange**: Both peers exchange SDP offers and answers through the signaling server to negotiate connection parameters. At the same time, they exchange ECDH public keys, which are later used to derive a shared encryption key.
5. **WebRTC Connection Establishment**: Using STUN servers, WebRTC performs NAT traversal to establish a direct peer-to-peer connection between the two devices.
6. **Secure File Transfer**: After the connection is established:
    * A shared AES-GCM session key is derived from the ECDH key exchange.
    * Files are encrypted on the sender’s device.
    * Encrypted data is transmitted directly over the WebRTC `RTCDataChannel`.

*Because the transfer occurs directly between devices, the server never stores or accesses the files being shared.*

## Instructions for Local Setup

### Prerequisites
* Node.js (v18 or higher recommended)
* npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/AkshithaMuttangi/P2P_FILE_SHARING_PLATFORM.git
cd P2P_FILE_SHARING_PLATFORM
```

### 2\. Backend Setup

Navigate to the backend folder and install dependencies:

```bash
cd backend
npm install
```

Start the Signaling Server:

```bash
npm start
# Server runs on http://localhost:8080
```

### 3\. Frontend Setup

Open a new terminal, navigate to the frontend folder, and install dependencies:

```bash
cd frontend
npm install
```

Start the Development Server:

```bash
npm run dev
# App runs on http://localhost:5173
```

## Team Members
* **Zenith Reddy Pathakota**
* **Akshitha Muttangi**

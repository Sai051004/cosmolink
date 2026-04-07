# 🌌 CosmoLink

**CosmoLink** is a modern, fully-responsive 2D virtual campus that bridges the gap between remote work and physical presence. Built meticulously with React, PixiJS, Socket.IO, and WebRTC, it enables users to seamlessly walk around a sprawling virtual map, instantly establish real-time **Peer-to-Peer Video, Audio, and Screen Sharing** connections by simply standing near others, and collaborate within dedicated structural rooms.

---

## ✨ Core Features

* **Real-time 2D Proximity Engine**: Employs a highly optimized 60FPS PixiJS v8 canvas rendering engine with smooth lerp physics. Your avatar moves naturally, and distances are computed instantly.
* **Dynamic WebRTC Multiplexing**: 
  * 🎙️ **Audio Chat**: Talk to users near you.
  * 📷 **Video Streaming**: See the avatars and webcams of people around you in sleek floating UI tiles.
  * 💻 **Screen Sharing**: Present your screen to anyone in your proximity or your dedicated room. Both camera and screen tracks are intelligently managed.
* **Smart Virtual Rooms**: The campus is divided into collaborative zones (`MERN STACK`, `Gaming Arena`, `Dev Club Stage`, etc.). Walking inside a room bypasses the strict proximity limit, connecting you instantly to *everyone* else in that room, allowing for seamless group lectures or team huddles.
* **Premium UI/UX System**: 
  * Glassmorphic, dark-mode inspired components (TailwindCSS v4) built directly over the canvas.
  * Interactive Emote sending, real-time presence Toasts, and floating chat boards.
  * Fully responsive mobile tap-to-move constraints and dynamic viewport zooming.

---

## 🛠️ Technology Stack

| Architecture Layer | Technologies Used |
| :--- | :--- |
| **Frontend Renderer** | **PixiJS (v8)** for WebGL 2D map generation, collision logic, and particle effects. |
| **User Interface** | **React 19**, **Vite**, **TailwindCSS**, and **Lucide Icons** for rendering the HUD and WebRTC floating media streams. |
| **Real-time Signaling** | **Socket.IO** (v4) orchestrates position broad-casting, chat relays, and the intricate SDP/ICE candidate handshakes for WebRTC. |
| **P2P Communication** | Pure **WebRTC** natively managing `RTCPeerConnection`, dynamically binding tracks, and distributing media chunks. |
| **Backend API** | **Node.js** and **Express**, with **MongoDB** logging connection events and room presence. |

---

## 🚀 Installation & Setup

### Prerequisites
1. **Node.js** (v20+ recommended)
2. **MongoDB** running locally on default port `27017` (Used by backend models).
3. A modern web browser supporting hardware acceleration and WebRTC.

### 1. Terminal A: Backend Setup
Open a terminal in the root directory and navigate to the backend:
```bash
cd backend
npm install
npm run start
# OR
node server.js
```
*The signaling server binds to port `5000` by default. Optional: create a `.env` file to mutate `MONGODB_URI`.*

### 2. Terminal B: Frontend Setup
Open a second terminal instance and spin up the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will compile and mount at `http://localhost:5173`.*

---

## 🕹️ User Guide

1. **Connect**: Open `http://localhost:5173`. Enter a unique username to spawn into the CosmoLink campus alongside other active sockets.
2. **Movement**: 
   * **Desktop**: Use `W A S D` or your `Arrow Keys` to glide fluidly across the canvas map. 
   * **Mobile**: Tap anywhere on the floor to initiate the auto-walk pathfinder.
3. **Interactive Areas**: 
   * **Ambient Walkways**: If you hover within `300` pixels of another user on the grass/sand, your WebRTC tunnels will automatically negotiate and establish connection panels.
   * **Structural Rooms**: Step over the barriers into pre-rendered rooms (e.g. "Dev Club Stage"). Your physical coordinates will sync everyone inside the room together as a single unified party, bypassing distance caps.
4. **Media Controls**: At the bottom of the screen, you will find hardware switches to toggle your Microphone, Webcam, and Screen Share. Click the Emote button to broadcast an animated reaction.
5. **Zoom Controls**: Use the floating `+` and `-` magnifiers on the top right to zoom the map out for a bird's-eye view, or zoom in for precision detail.

---

## 🧠 Architectural Deep-Dive

**How the Proximity Engine Works:**
When users move, `socket.volatile.emit('user_move')` pushes coordinates at a locked 60Hz tick rate to the Node backend. The server independently runs distance measurements (`Math.sqrt(distX + distY)`) between all players. If two unaffiliated players breach the proximity threshold, the server forcibly `joins` their sockets to a unique hyphenated hash room (`socketID1-socketID2`), simultaneously dispatching `webrtc_offer` signals to spin up the P2P connection logic locally inside React.

**WebRTC Lifecycle:**
CosmoLink avoids crushing the browser thread by dynamically allocating and destroying `RTCPeerConnection` arrays. When a user steps outside of proximity range or exits the application, the local client securely flushes the garbage collector mapped to that specific peer tracking index, pruning empty video stream objects smoothly.

---

*Authored and optimized for modern collaborative environments. Happy connecting!* 🔭

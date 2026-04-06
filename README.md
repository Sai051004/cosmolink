# Virtual Cosmos (CosmoLink)

A 2D proximity-based virtual environment where users can walk around and chat when they come close to each other. Built using React (Vite), PixiJS, Socket.IO, and Node/Express.

## Architecture

* **Frontend**: React handles the UI overlays and Chat state. PixiJS handles the raw 2D rendering and user physics interpolation.
* **Backend**: Express + Socket.IO server utilizing MongoDB to store user join logs (and last online state).
* **Proximity Logic**: Server calculates the Euclidean distance between players on position update. If `distance < 150`, it dynamically unites users into a socket room and enables their UI panel.

## Setup Instructions

### Prerequisites
1. Node.js (v20+)
2. MongoDB installed locally and running on port `27017`

### Running the Backend Server
```bash
cd backend
# Install dependencies
npm install 
# Run the backend
node server.js
```
*(Server will listen on http://localhost:5000. If you need to change the DB URI, create a `.env` in `backend/` with `MONGODB_URI=...`)*

### Running the Frontend
```bash
cd frontend
# Install dependencies
npm install
# Start Vite development server
npm run dev
```
*(Vite will serve the project, typically at http://localhost:5173)*

## Verification Flow
1. Open two separate web browser tabs mapped to the Vite Local UI Address.
2. Enter a unique username on both tabs and Join.
3. Use your `W A S D` or `Arrow Keys` to move toward the second player.
4. When inside the proximity ring range, look for the Active Session chat window to appear.
5. Move out of range to watch it detach.

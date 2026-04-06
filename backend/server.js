const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 5000;
const PROXIMITY_RADIUS = 150; 

// activeConnections: { socketId: { userId, x, y, username, currentRoom, isSeated } }
const activeConnections = {};

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cosmolink').then(() => {
    console.log("Connected to MongoDB for CosmoLink");
}).catch(console.error);

// Track ad-hoc proximity pairs
const connectedPairs = new Set();
function getPairId(id1, id2) { return [id1, id2].sort().join('-'); }

function getDistance(user1, user2) {
    if(!user1 || !user2 || user1.x === undefined || user2.x === undefined) return Infinity;
    return Math.sqrt(Math.pow(user1.x - user2.x, 2) + Math.pow(user1.y - user2.y, 2));
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // user_join
    socket.on('user_join', (data) => {
        const { userId, username, x, y } = data;
        activeConnections[socket.id] = { socketId: socket.id, userId, username, x, y, currentRoom: null, isSeated: false };

        socket.broadcast.emit('user-joined', activeConnections[socket.id]);
        socket.emit('active-users', Object.values(activeConnections));
    });

    // user_move
    socket.on('user_move', (data) => {
        const myState = activeConnections[socket.id];
        if (!myState) return;
        
        myState.x = data.x;
        myState.y = data.y;
        myState.isSeated = false; // Moving breaks seating

        socket.broadcast.emit('user-moved', { socketId: socket.id, x: data.x, y: data.y, isSeated: false });

        // Skip proximity logic if I am in a localized private room
        if (myState.currentRoom) return;

        // Proximity Logic
        Object.values(activeConnections).forEach(otherUser => {
            if (otherUser.socketId === socket.id) return;
            if (otherUser.currentRoom) return; // Don't interrupt others in private rooms
            
            const distance = getDistance(myState, otherUser);
            const pairId = getPairId(socket.id, otherUser.socketId);
            const isConnected = connectedPairs.has(pairId);
            
            if (distance < PROXIMITY_RADIUS) {
                if (!isConnected) {
                    connectedPairs.add(pairId);
                    socket.join(pairId);
                    const otherSocket = io.sockets.sockets.get(otherUser.socketId);
                    if (otherSocket) {
                        otherSocket.join(pairId);
                        socket.emit('proximity_connect', { connectedWith: otherUser.socketId, room: pairId });
                        otherSocket.emit('proximity_connect', { connectedWith: socket.id, room: pairId });
                    }
                }
            } else {
                if (isConnected) {
                    connectedPairs.delete(pairId);
                    socket.leave(pairId);
                    const otherSocket = io.sockets.sockets.get(otherUser.socketId);
                    if (otherSocket) {
                        otherSocket.leave(pairId);
                        socket.emit('proximity_disconnect', { disconnectedFrom: otherUser.socketId });
                        otherSocket.emit('proximity_disconnect', { disconnectedFrom: socket.id });
                    }
                }
            }
        });
    });

    // join_room
    socket.on('join_room', (data) => {
        const { roomName, isSeated } = data;
        const myState = activeConnections[socket.id];
        if (!myState) return;

        // Leave ambient proximity chats
        Array.from(connectedPairs).forEach(pairId => {
            if (pairId.includes(socket.id)) {
                connectedPairs.delete(pairId);
                socket.leave(pairId);
                const otherId = pairId.split('-').find(id => id !== socket.id);
                if (otherId) io.to(otherId).emit('proximity_disconnect', { disconnectedFrom: socket.id });
            }
        });

        // if already in a room, leave it
        if (myState.currentRoom && myState.currentRoom !== roomName) {
            socket.leave(myState.currentRoom);
        }

        myState.currentRoom = roomName;
        myState.isSeated = !!isSeated;
        socket.join(roomName);

        socket.broadcast.emit('user-moved', { socketId: socket.id, x: myState.x, y: myState.y, isSeated: myState.isSeated, currentRoom: roomName });
        socket.emit('join_room_success', { room: roomName });
    });

    // leave_room
    socket.on('leave_room', () => {
        const myState = activeConnections[socket.id];
        if (!myState || !myState.currentRoom) return;

        socket.leave(myState.currentRoom);
        myState.currentRoom = null;
        myState.isSeated = false;
        
        socket.broadcast.emit('user-moved', { socketId: socket.id, x: myState.x, y: myState.y, isSeated: false, currentRoom: null });
        socket.emit('leave_room_success');
    });

    // send_message
    socket.on('send_message', (data) => {
        const { room, message } = data;
        const myState = activeConnections[socket.id];
        const isZone = !!myState?.currentRoom;
        
        io.to(room).emit('receive_message', {
            senderId: socket.id,
            username: myState?.username || 'Unknown',
            message,
            timestamp: new Date(),
            isZone
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Clean up proximity pairs
        Array.from(connectedPairs).forEach(pairId => {
            if (pairId.includes(socket.id)) {
                connectedPairs.delete(pairId);
                const otherId = pairId.split('-').find(id => id !== socket.id);
                if (otherId) io.to(otherId).emit('proximity_disconnect', { disconnectedFrom: socket.id });
            }
        });

        if (activeConnections[socket.id]) {
            socket.broadcast.emit('user-left', socket.id);
            delete activeConnections[socket.id];
        }
    });
});

server.listen(PORT, () => {
  console.log(`CosmoLink API Server listening on port ${PORT}`);
});

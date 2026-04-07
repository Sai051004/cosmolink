const SpatialHashGrid = require('../services/SpatialHashGrid');
const PROXIMITY_RADIUS = 300;

// O(1) state stores replacing old array loops
const activeConnections = {};
const connectedPairs = new Set();
const grid = new SpatialHashGrid(300); // 300x300 pixel partition grid

const getDistance = (u1, u2) => {
    return Math.sqrt(Math.pow(u1.x - u2.x, 2) + Math.pow(u1.y - u2.y, 2));
};

const getPairId = (id1, id2) => {
    return [id1, id2].sort().join('-');
};

module.exports = (io, socket) => {
    socket.on('user_join', (data) => {
        const { userId, username, x, y } = data;
        const myState = { socketId: socket.id, userId, username, x, y, currentRoom: null, isSeated: false };
        
        activeConnections[socket.id] = myState;
        grid.insertClient(myState); // Hash instantly into the spatial grid

        socket.broadcast.emit('user-joined', myState);
        socket.emit('active-users', Object.values(activeConnections));
    });

    socket.on('user_move', (data) => {
        const myState = activeConnections[socket.id];
        if (!myState) return;
        
        myState.x = data.x;
        myState.y = data.y;
        myState.isSeated = false;
        
        // Let the spatial grid cleanly reposition them across server partitions
        grid.updateClient(myState);

        socket.broadcast.emit('user-moved', { socketId: socket.id, x: data.x, y: data.y, isSeated: false });

        if (myState.currentRoom) return;

        // O(1) Complexity - Only checks players dynamically in identical map sectors
        const nearbyUsers = grid.findNearby(myState, activeConnections);
        
        nearbyUsers.forEach(otherUser => {
            if (otherUser.currentRoom) return; 
            
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

    // Smart Room Handling
    socket.on('join_room', (data) => {
        const { roomName, isSeated } = data;
        const myState = activeConnections[socket.id];
        if (!myState) return;

        // Flush ambient proximity hashes to prevent lingering shadow streams
        Array.from(connectedPairs).forEach(pairId => {
            if (pairId.includes(socket.id)) {
                connectedPairs.delete(pairId);
                socket.leave(pairId);
                const otherId = pairId.split('-').find(id => id !== socket.id);
                if (otherId) io.to(otherId).emit('proximity_disconnect', { disconnectedFrom: socket.id });
            }
        });

        if (myState.currentRoom && myState.currentRoom !== roomName) {
            socket.leave(myState.currentRoom);
        }

        myState.currentRoom = roomName;
        myState.isSeated = !!isSeated;
        socket.join(roomName);

        socket.broadcast.emit('user-moved', { socketId: socket.id, x: myState.x, y: myState.y, isSeated: myState.isSeated, currentRoom: roomName });
        socket.emit('join_room_success', { room: roomName });
    });

    socket.on('leave_room', () => {
        const myState = activeConnections[socket.id];
        if (!myState || !myState.currentRoom) return;

        socket.leave(myState.currentRoom);
        myState.currentRoom = null;
        myState.isSeated = false;

        socket.broadcast.emit('user-moved', { socketId: socket.id, x: myState.x, y: myState.y, isSeated: false, currentRoom: null });
        socket.emit('leave_room_success');
    });

    socket.on('send_message', (data) => {
        const msg = { senderId: socket.id, username: data.username, message: data.message, isZone: data.isZone };
        io.to(data.room).emit('receive_message', msg);
    });

    socket.on('webrtc_offer', (data) => {
        io.to(data.targetId).emit('webrtc_offer', { senderId: socket.id, offer: data.offer });
    });

    socket.on('webrtc_answer', (data) => {
        io.to(data.targetId).emit('webrtc_answer', { senderId: socket.id, answer: data.answer });
    });

    socket.on('ice_candidate', (data) => {
        io.to(data.targetId).emit('ice_candidate', { senderId: socket.id, candidate: data.candidate });
    });

    socket.on('disconnect', () => {
        const myState = activeConnections[socket.id];
        if (myState) {
            grid.removeClient(myState);
            delete activeConnections[socket.id];
        }

        Array.from(connectedPairs).forEach(pairId => {
            if (pairId.includes(socket.id)) {
                connectedPairs.delete(pairId);
                const otherId = pairId.split('-').find(id => id !== socket.id);
                if (otherId) io.to(otherId).emit('proximity_disconnect', { disconnectedFrom: socket.id });
            }
        });

        socket.broadcast.emit('user-left', socket.id);
    });
};

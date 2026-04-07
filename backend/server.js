const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// MVC Imports
const socketHandlers = require('./src/sockets/socketHandlers');
const socketAuth = require('./src/middlewares/socketAuth');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Enterprise Socket Server with CORS configuration
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cosmolink', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Enterprise MongoDB Connected'))
  .catch(err => console.error('❌ Database error:', err));

const userSchema = new mongoose.Schema({
    username: String,
    lastOnline: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Apply Security Middlewares
io.use(socketAuth);

// Register highly decoupled Handlers
io.on('connection', (socket) => {
    socketHandlers(io, socket);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 CosmoLink Enterprise Cluster listening on port ${PORT}`);
});

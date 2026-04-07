const RateLimiter = require('../services/RateLimiter');

// 50 events per 1 second
const globalLimiter = new RateLimiter(50, 1000);

const socketAuth = (socket, next) => {
    // In a real enterprise app, check socket.handshake.auth.token with jsonwebtoken
    // const token = socket.handshake.auth?.token;
    // try { jwt.verify(token, process.env.JWT_SECRET); next(); } catch (e) { next(new Error('Authentication Error')); }
    
    // For this implementation, we will mock auth passes but enforce strict rate limiting!
    
    // Attach rate limiting interceptor to the socket
    socket.use((packet, next) => {
        const ip = socket.handshake.address;
        const isAllowed = globalLimiter.consume(ip);
        if (!isAllowed) {
            console.warn(`[RATE LIMIT] IP ${ip} is flooding the socket sever.`);
            return next(new Error('Rate Limit Exceeded. Slow down.'));
        }
        next();
    });

    next();
};

module.exports = socketAuth;

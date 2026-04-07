class RateLimiter {
    constructor(limit, windowMs) {
        this.limit = limit;
        this.windowMs = windowMs;
        this.clients = new Map();
    }
    
    consume(ip) {
        const now = Date.now();
        if (!this.clients.has(ip)) {
            this.clients.set(ip, { count: 1, resetTime: now + this.windowMs });
            return true;
        }
        
        const record = this.clients.get(ip);
        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + this.windowMs;
            return true;
        }
        
        if (record.count >= this.limit) {
            return false; // Rate limited
        }
        
        record.count++;
        return true;
    }
}

module.exports = RateLimiter;

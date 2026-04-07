class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map(); // "x,y" => Set(socketId)
    }

    _getKey(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }

    insertClient(client) {
        const key = this._getKey(client.x, client.y);
        if (!this.grid.has(key)) this.grid.set(key, new Set());
        this.grid.get(key).add(client.socketId);
        client.__gridKey = key;
    }

    updateClient(client) {
        const newKey = this._getKey(client.x, client.y);
        if (client.__gridKey !== newKey) {
            this.removeClient(client);
            this.insertClient(client);
        }
    }

    removeClient(client) {
        const key = client.__gridKey;
        if (key && this.grid.has(key)) {
            const cell = this.grid.get(key);
            cell.delete(client.socketId);
            if (cell.size === 0) this.grid.delete(key);
        }
    }

    findNearby(client, activeConnections) {
        const cx = Math.floor(client.x / this.cellSize);
        const cy = Math.floor(client.y / this.cellSize);
        
        const nearbyClients = [];
        // Check 3x3 grid
        for (let x = cx - 1; x <= cx + 1; x++) {
            for (let y = cy - 1; y <= cy + 1; y++) {
                const key = `${x},${y}`;
                if (this.grid.has(key)) {
                    for (const socketId of this.grid.get(key)) {
                       if (socketId !== client.socketId && activeConnections[socketId]) {
                          nearbyClients.push(activeConnections[socketId]);
                       }
                    }
                }
            }
        }
        return nearbyClients;
    }
}

module.exports = SpatialHashGrid;

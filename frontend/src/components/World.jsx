import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { socket } from '../utils/socket';

const MAP_WIDTH = 3200;
const MAP_HEIGHT = 3200;

const WALLS = [
    // Bounding Box
    { x: 0, y: 0, w: MAP_WIDTH, h: 20 },
    { x: 0, y: 0, w: 20, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 20, y: 0, w: 20, h: MAP_HEIGHT },
    { x: 0, y: MAP_HEIGHT - 20, w: MAP_WIDTH, h: 20 },

    // Left Side (Learning Rooms Corridor Wall)
    { x: 600, y: 0, w: 20, h: 600 },
    { x: 600, y: 800, w: 20, h: MAP_HEIGHT - 800 },

    // Room Dividers Left Side
    { x: 0, y: 300, w: 600, h: 10 },
    { x: 0, y: 600, w: 600, h: 10 },
    { x: 0, y: 900, w: 600, h: 10 },
    { x: 0, y: 1200, w: 600, h: 10 },
    { x: 0, y: 1500, w: 600, h: 10 },

    // Right Side (Event Hall Corridor Wall)
    { x: 1800, y: 0, w: 20, h: 1200 },
    { x: 1800, y: 1400, w: 20, h: MAP_HEIGHT - 1400 },
];

const ROOM_LABELS = [
    { text: "MERN STACK", x: 300, y: 150 },
    { text: "UI/UX", x: 300, y: 450 },
    { text: "Ethical Hacking", x: 300, y: 750 },
    { text: "DSA", x: 300, y: 1050 },
    { text: "Flutter", x: 300, y: 1350 },
    { text: "Data Analytics", x: 300, y: 1650 },
    { text: "Python", x: 300, y: 1850 },

    { text: "Event Hall", x: 2150, y: 150 },
    { text: "Dev Club Stage", x: 2150, y: 600 },
    { text: "Gaming Arena", x: 2150, y: 1100 },
    { text: "Task Desks", x: 2150, y: 1700 },

    { text: "Cafeteria", x: 1200, y: 2400 },
    { text: "Discussion Room 1", x: 2150, y: 2200 },
    { text: "Discussion Room 2", x: 2150, y: 2700 },
];

const INTERACTABLES = [
    { id: 1, x: 200, y: 150, radius: 40, room: "MERN Stack - Table A" },
    { id: 2, x: 400, y: 150, radius: 40, room: "MERN Stack - Table B" },
    { id: 3, x: 200, y: 450, radius: 40, room: "UI/UX - Design Pod" },
    { id: 4, x: 400, y: 450, radius: 40, room: "UI/UX - Research Pod" },
    { id: 5, x: 2000, y: 700, radius: 30, room: "Dev Club - Row 1" },
    { id: 6, x: 2100, y: 700, radius: 30, room: "Dev Club - Row 1" },
    { id: 7, x: 2200, y: 700, radius: 30, room: "Dev Club - Row 1" },
    { id: 8, x: 2300, y: 700, radius: 30, room: "Dev Club - Row 1" },
    { id: 9, x: 2000, y: 800, radius: 30, room: "Dev Club - Row 2" },
    { id: 10, x: 2100, y: 800, radius: 30, room: "Dev Club - Row 2" },
    { id: 11, x: 2200, y: 800, radius: 30, room: "Dev Club - Row 2" },
    { id: 12, x: 2300, y: 800, radius: 30, room: "Dev Club - Row 2" },
    { id: 13, x: 2000, y: 1600, radius: 30, room: "Task A1" },
    { id: 14, x: 2100, y: 1600, radius: 30, room: "Task A2" },
    { id: 15, x: 2200, y: 1600, radius: 30, room: "Task A3" },
    { id: 16, x: 1000, y: 2300, radius: 40, room: "Cafeteria - Table 1" },
    { id: 17, x: 1400, y: 2300, radius: 40, room: "Cafeteria - Table 2" },
    { id: 18, x: 1200, y: 2600, radius: 40, room: "Cafeteria - Table 3" },
    { id: 19, x: 2150, y: 2300, radius: 50, room: "Discussion Room 1" },
    { id: 20, x: 2150, y: 2800, radius: 50, room: "Discussion Room 2" },
];

export default function World({ myUser, activeUsers, onMyMovement, globalZoom }) {
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const containerRef = useRef(null);
    const avatarsRef = useRef({});
    
    const [nearbyInteractable, setNearbyInteractable] = useState(null);
    const [isSeated, setIsSeated] = useState(false);
    const [appReady, setAppReady] = useState(false);

    const PLAYER_RADIUS = 20;

    useEffect(() => {
        let app;
        let movementInterval;
        let isDestroyed = false;
        const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };

        const handleKeyDown = (e) => { 
            if (keys[e.key] !== undefined) keys[e.key] = true; 
            
            if ((e.key === 'x' || e.key === 'X') && !window.__isSeated) {
                if (window.__nearbySeat) {
                     setIsSeated(true);
                     avatarsRef.current['__internal_me__'].x = window.__nearbySeat.x;
                     avatarsRef.current['__internal_me__'].y = window.__nearbySeat.y;
                     onMyMovement(window.__nearbySeat.x, window.__nearbySeat.y);
                     socket.emit('join_room', { roomName: window.__nearbySeat.room, isSeated: true });
                }
            } else if ((keys.w || keys.a || keys.s || keys.d || keys.ArrowUp || keys.ArrowLeft || keys.ArrowDown || keys.ArrowRight) && window.__isSeated) {
                 window.__isSeated = false;
                 setIsSeated(false);
                 socket.emit('leave_room');
            }
        };
        const handleKeyUp = (e) => { if (keys[e.key] !== undefined) keys[e.key] = false; };
        
        window.__isSeated = isSeated;

        const initPixi = async () => {
            app = new PIXI.Application();
            await app.init({
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: 0x1a1a1a,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true
            });
            if (isDestroyed) {
                app.destroy(true);
                return;
            }
            appRef.current = app;

            if (canvasRef.current) {
                canvasRef.current.appendChild(app.canvas);
            }

            const worldContainer = new PIXI.Container();
            containerRef.current = worldContainer;
            worldContainer.scale.set(globalZoom);
            app.stage.addChild(worldContainer);

             const baseMap = new PIXI.Graphics();
             try {
                baseMap.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).fill(0x27ae60);
                worldContainer.addChild(baseMap);

                const floor = new PIXI.Graphics();
                floor.rect(50, 50, MAP_WIDTH - 100, MAP_HEIGHT - 100).fill(0xEEDCAE); 
                worldContainer.addChild(floor);

                const roomsFloor = new PIXI.Graphics();
                roomsFloor.rect(50, 50, 550, MAP_HEIGHT - 100).fill(0xC19A6B); // Left Rooms
                roomsFloor.rect(1800, 50, MAP_WIDTH - 1850, MAP_HEIGHT - 100).fill(0x8B5A2B); // Right Event Rooms
                worldContainer.addChild(roomsFloor);

                const wallGfx = new PIXI.Graphics();
                for (let w of WALLS) {
                    wallGfx.rect(w.x, w.y, w.w, w.h).fill(0x4A4A4A);
                }
                worldContainer.addChild(wallGfx);

                const treesGfx = new PIXI.Graphics();
                for (let i = 0; i < 400; i++) {
                    let tx = Math.random() * MAP_WIDTH;
                    let ty = Math.random() * MAP_HEIGHT;
                    if (Math.random() > 0.5) ty = Math.random() < 0.5 ? Math.random() * 50 : MAP_HEIGHT - 50 + Math.random() * 50;
                    else tx = Math.random() < 0.5 ? Math.random() * 50 : MAP_WIDTH - 50 + Math.random() * 50;
                    treesGfx.circle(tx, ty, 15 + Math.random() * 15).fill(0x1e8449);
                    treesGfx.circle(tx + 5, ty + 5, 8 + Math.random() * 8).fill(0x2ecc71);
                }
                worldContainer.addChild(treesGfx);

                const decGfx = new PIXI.Graphics();
                for(let r=0; r<6; r++){
                   for(let c=0; c<5; c++){
                       let dx = 800 + (c * 180);
                       let dy = 600 + (r * 300);
                       decGfx.roundRect(dx, dy, 120, 70, 10).fill(0xecf0f1);
                       decGfx.rect(dx + 15, dy - 20, 30, 20).fill(0x2c3e50);
                       decGfx.rect(dx + 75, dy - 20, 30, 20).fill(0x2c3e50);
                       decGfx.rect(dx + 15, dy + 70, 30, 20).fill(0x2c3e50);
                       decGfx.rect(dx + 75, dy + 70, 30, 20).fill(0x2c3e50);
                   }
                }
                
                decGfx.rect(2050, 100, 1000, 750).fill(0xD0E5D2); 
                decGfx.rect(2300, 150, 500, 100).fill(0xA0522D); 
                for(let row=0; row<8; row++) {
                    for(let col=0; col<16; col++) {
                        decGfx.rect(2150 + (col*50), 350 + (row*40), 40, 20).fill(0x7f8c8d); 
                    }
                }
                
                for (let tbl of INTERACTABLES) {
                    if (tbl.room.includes('Discussion') || tbl.room.includes('Cafeteria')) {
                        decGfx.rect(tbl.x - 80, tbl.y - 80, 160, 160).fill(0x1A252F);
                    }
                    decGfx.circle(tbl.x, tbl.y, tbl.radius).fill(0xF39C12); 
                    decGfx.circle(tbl.x, tbl.y, tbl.radius).stroke({ width: 4, color: 0xD68910, alpha: 1 });
                    
                    decGfx.circle(tbl.x - tbl.radius - 15, tbl.y, 12).fill(0x2C3E50);
                    decGfx.circle(tbl.x + tbl.radius + 15, tbl.y, 12).fill(0x2C3E50);
                    decGfx.circle(tbl.x, tbl.y - tbl.radius - 15, 12).fill(0x2C3E50);
                    decGfx.circle(tbl.x, tbl.y + tbl.radius + 15, 12).fill(0x2C3E50);
                }
                worldContainer.addChild(decGfx);
             } catch (e) {
                 console.error("Map creation error:", e);
             }

            ROOM_LABELS.forEach(label => {
                try {
                const text = new PIXI.Text({
                    text: label.text,
                    style: { fontFamily: 'ui-sans-serif, sans-serif', fontSize: 24, fill: label.text.includes('Discussion') ? 0xffffff : 0x000000, fontWeight: '900', letterSpacing: 1 }
                });
                text.alpha = 0.6;
                if (text.anchor) text.anchor.set(0.5, 0.5);
                text.x = label.x;
                text.y = label.y;
                worldContainer.addChild(text);
                } catch(err) {}
            });

            const onResize = () => { app.renderer.resize(window.innerWidth, window.innerHeight); };
            window.addEventListener('resize', onResize);
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);

            function checkWorldCollision(newX, newY) {
                for (let w of WALLS) {
                    const testX = Math.max(w.x, Math.min(newX, w.x + w.w));
                    const testY = Math.max(w.y, Math.min(newY, w.y + w.h));
                    const distX = newX - testX;
                    const distY = newY - testY;
                    if ((distX*distX + distY*distY) < (PLAYER_RADIUS * PLAYER_RADIUS)) {
                        return true; 
                    }
                }
                return false;
            }

            movementInterval = setInterval(() => {
                if (!avatarsRef.current['__internal_me__']) return;
                const myState = avatarsRef.current['__internal_me__'];
                
                const wScale = worldContainer.scale.x;
                worldContainer.x = (window.innerWidth / 2) - (myState.x * wScale);
                worldContainer.y = (window.innerHeight / 2) - (myState.y * wScale);

                let closestSeat = null;
                for (let tbl of INTERACTABLES) {
                    const dist = Math.sqrt(Math.pow(myState.x - tbl.x, 2) + Math.pow(myState.y - tbl.y, 2));
                    if (dist < tbl.radius + 30) {
                        closestSeat = tbl;
                        break;
                    }
                }
                
                if (closestSeat) {
                    if (window.__nearbySeat?.id !== closestSeat.id) {
                        window.__nearbySeat = closestSeat;
                        setNearbyInteractable(closestSeat);
                    }
                } else {
                    if (window.__nearbySeat) {
                        window.__nearbySeat = null;
                        setNearbyInteractable(null);
                    }
                }

                if (window.__isSeated) return;

                let dx = 0; let dy = 0;
                let speed = 6;
                
                if (keys.w || keys.ArrowUp) dy -= speed;
                if (keys.s || keys.ArrowDown) dy += speed;
                if (keys.a || keys.ArrowLeft) dx -= speed;
                if (keys.d || keys.ArrowRight) dx += speed;

                if (dx !== 0 || dy !== 0) {
                    if (dx !== 0 && dy !== 0) {
                        const length = Math.sqrt(dx * dx + dy * dy);
                        dx = (dx / length) * speed;
                        dy = (dy / length) * speed;
                    }

                    const newX = myState.x + dx;
                    const newY = myState.y + dy;

                    if (!checkWorldCollision(newX, myState.y)) myState.x = newX;
                    if (!checkWorldCollision(myState.x, newY)) myState.y = newY;

                    if (myState.x !== newX || myState.y !== newY) {
                         onMyMovement(myState.x, myState.y);
                    } else if (dx !== 0 || dy !== 0) {
                         onMyMovement(myState.x, myState.y);
                    }
                }
            }, 1000 / 60);

            setAppReady(true);
        };

        initPixi();

        return () => {
            isDestroyed = true;
            clearInterval(movementInterval);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (app) {
                try {
                    if (app.canvas && app.canvas.parentNode) {
                       app.canvas.parentNode.removeChild(app.canvas);
                    }
                    app.destroy(true);
                } catch(err) {}
            }
        };
    }, []);

    useEffect(() => {
         if (containerRef.current) {
             containerRef.current.scale.set(globalZoom);
         }
    }, [globalZoom]);

    useEffect(() => {
        window.__isSeated = isSeated;
    }, [isSeated]);

    useEffect(() => {
        if (!appReady || !appRef.current || !containerRef.current) return;
        const worldContainer = containerRef.current;
        const currentAvatars = avatarsRef.current;
        
        if (myUser && myUser.x !== undefined) {
             if(currentAvatars['__internal_me__'] === undefined) {
                 currentAvatars['__internal_me__'] = { x: myUser.x, y: myUser.y };
             }
        }

        const newActiveSocketIds = activeUsers.map(u => u.socketId);

        Object.keys(currentAvatars).forEach(id => {
            if (id === '__internal_me__') return;
            if (!newActiveSocketIds.includes(id)) {
                worldContainer.removeChild(currentAvatars[id]);
                currentAvatars[id].destroy({ children: true });
                delete currentAvatars[id];
            }
        });

        activeUsers.forEach(user => {
            const isMe = myUser && user.socketId === myUser.socketId;
            let container = currentAvatars[user.socketId];

            if (!container) {
                container = new PIXI.Container();
                
                try {
                    const circle = new PIXI.Graphics();
                    const color = isMe ? 0x3B82F6 : 0xEF4444; 
                    circle.circle(0, 0, PLAYER_RADIUS).fill(color);
                    circle.circle(0, 0, PLAYER_RADIUS).stroke({ width: 3, color: 0xffffff, alpha: 0.5 });
                    
                    if (isMe) {
                        const ring = new PIXI.Graphics();
                        ring.circle(0, 0, 100).fill({ color: 0x3B82F6, alpha: 0.08 });
                        ring.circle(0, 0, 100).stroke({ width: 1, color: 0x3B82F6, alpha: 0.3 });
                        container.addChild(ring);
                    }

                    const nameText = new PIXI.Text({
                        text: user.username,
                        style: { fontFamily: 'ui-sans-serif, sans-serif', fontSize: 14, fill: 0xffffff, fontWeight: 'bold' }
                    });
                    if (nameText.anchor) nameText.anchor.set(0.5, 0.5);
                    nameText.y = -35;

                    container.addChild(circle);
                    container.addChild(nameText);
                } catch (e) {
                    console.error("Avatar error", e);
                }
                
                worldContainer.addChild(container);
                currentAvatars[user.socketId] = container;
            }

            if (!isMe) {
               const speed = 0.15;
               container.x += (user.x - container.x) * speed;
               container.y += (user.y - container.y) * speed;
               
               if (Math.abs(user.x - container.x) > 100) container.x = user.x;
               if (Math.abs(user.y - container.y) > 100) container.y = user.y;
               
               if (user.isSeated) {
                   container.x = user.x;
                   container.y = user.y;
               }
            } else {
               if (currentAvatars['__internal_me__']) {
                    container.x = currentAvatars['__internal_me__'].x;
                    container.y = currentAvatars['__internal_me__'].y;
               }
            }
        });

    }, [activeUsers, myUser, appReady]);

    return (
        <div className="relative w-full h-full">
            <div ref={canvasRef} className="absolute inset-0 outline-none border-none pointer-events-auto" />
            
            {nearbyInteractable && !isSeated && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-indigo-600 border border-indigo-400 px-6 py-3 rounded-full text-white font-bold shadow-2xl animate-bounce z-50 transition-all select-none">
                    Press <kbd className="bg-white/20 px-2 py-0.5 rounded mx-1 font-mono shadow-sm">X</kbd> to sit at {nearbyInteractable.room}
                </div>
            )}
            {isSeated && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 px-6 py-3 rounded-full text-white font-medium shadow-2xl z-50 transition-all flex items-center gap-2 select-none">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-green-500 shadow-sm"></span>
                    Joined <strong>{nearbyInteractable?.room}</strong>. Use movement keys to stand up.
                </div>
            )}
        </div>
    );
}

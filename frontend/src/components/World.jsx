import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { socket } from '../utils/socket';

const MAP_WIDTH = 3200;
const MAP_HEIGHT = 3200;

export const STRUCTURAL_ROOMS = [
    { name: 'MERN STACK', x: 200, y: 100, w: 400, h: 300, color: 0x3b82f6 },
    { name: 'UI/UX', x: 200, y: 450, w: 400, h: 300, color: 0x8b5cf6 },
    { name: 'Ethical Hacking', x: 200, y: 800, w: 400, h: 300, color: 0xef4444 },
    { name: 'DSA', x: 200, y: 1150, w: 400, h: 300, color: 0x10b981 },
    { name: 'Flutter', x: 200, y: 1500, w: 400, h: 300, color: 0xf59e0b },
    { name: 'Data Analytics', x: 200, y: 1850, w: 400, h: 300, color: 0x3b82f6 },
    { name: 'Python', x: 200, y: 2200, w: 400, h: 300, color: 0x8b5cf6 },
    { name: 'Dev Club Stage', x: 2000, y: 200, w: 900, h: 700, color: 0xf59e0b },
    { name: 'Gaming Arena', x: 2000, y: 1000, w: 900, h: 500, color: 0xec4899 },
    { name: 'Task Desks', x: 2000, y: 1600, w: 900, h: 400, color: 0x10b981 },
    { name: 'Cafeteria', x: 1000, y: 2400, w: 800, h: 600, color: 0x6366f1 },
    { name: 'Discussion Room 1', x: 2200, y: 2200, w: 600, h: 300, color: 0xef4444 },
    { name: 'Discussion Room 2', x: 2200, y: 2600, w: 600, h: 300, color: 0x8b5cf6 },
];

let WALLS = [
    { x: 0, y: 0, w: MAP_WIDTH, h: 20 },
    { x: 0, y: 0, w: 20, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 20, y: 0, w: 20, h: MAP_HEIGHT },
    { x: 0, y: MAP_HEIGHT - 20, w: MAP_WIDTH, h: 20 },
];

export default function World({ myUser, activeUsers, onMyMovement, globalZoom }) {
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const containerRef = useRef(null);
    const avatarsRef = useRef({});
    const camRef = useRef({ x: 850, y: 400 });
    
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
        };
        const handleKeyUp = (e) => { if (keys[e.key] !== undefined) keys[e.key] = false; };

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

            if (canvasRef.current && !canvasRef.current.hasChildNodes()) {
                canvasRef.current.appendChild(app.canvas);
            }

            const worldContainer = new PIXI.Container();
            worldContainer.sortableChildren = true;
            containerRef.current = worldContainer;
            worldContainer.scale.set(globalZoom);
            app.stage.addChild(worldContainer);

             const baseMap = new PIXI.Graphics();
             const starLayer = new PIXI.Container();
             const roomGraphics = {};
             let stars = [];

             try {
                baseMap.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).fill(0x27ae60); // Original Vibrant Green
                
                // Keep the grid but make it subtle dark green
                const gridSpacing = 100;
                for(let i=0; i<=MAP_WIDTH; i+=gridSpacing) {
                     baseMap.moveTo(i, 0).lineTo(i, MAP_HEIGHT).stroke({color: 0x1e8449, alpha: 0.3, width: 1});
                }
                for(let i=0; i<=MAP_HEIGHT; i+=gridSpacing) {
                     baseMap.moveTo(0, i).lineTo(MAP_WIDTH, i).stroke({color: 0x1e8449, alpha: 0.3, width: 1});
                }
                
                baseMap.zIndex = 0;
                baseMap.eventMode = 'static';
                worldContainer.addChild(baseMap);

                // Optional: Remove stars for daylight academic campus
                starLayer.zIndex = 0;
                worldContainer.addChild(starLayer); // Empty now

                const floor = new PIXI.Graphics();
                floor.rect(50, 50, MAP_WIDTH - 100, MAP_HEIGHT - 100).fill(0xEEDCAE); // Original Light Sand/Beige Floor
                floor.zIndex = 0;
                floor.eventMode = 'static';
                worldContainer.addChild(floor);

                const handleMapClick = (e) => {
                    const localPt = worldContainer.worldTransform.applyInverse(e.global);
                    window.__autoWalkTarget = { x: localPt.x, y: localPt.y };
                };
                
                baseMap.on('pointerdown', handleMapClick);
                floor.on('pointerdown', handleMapClick);

                const roomGfx = new PIXI.Graphics();
                const roomContainer = new PIXI.Container();
                roomContainer.zIndex = 1;
                worldContainer.addChild(roomContainer);
                
                const wallThick = 40;
                const doorSize = 140;

                WALLS.length = 4;

                const textContainer = new PIXI.Container();

                STRUCTURAL_ROOMS.forEach(rm => {
                    const g = new PIXI.Graphics();
                    g.rect(rm.x, rm.y, rm.w, rm.h)
                     .fill({ color: rm.color, alpha: 0.15 })
                     .stroke({ color: rm.color, alpha: 0.5, width: 3 });
                    g.alpha = 0.8; // Nice visible room overlays
                    roomGraphics[rm.name] = g;
                    roomContainer.addChild(g);
                    
                    let doorSide = rm.x < 1000 ? 'right' : 'left';
                    /* Top Wall */  WALLS.push({ x: rm.x, y: rm.y, w: rm.w, h: wallThick }); 
                    /* Bot Wall */  WALLS.push({ x: rm.x, y: rm.y + rm.h - wallThick, w: rm.w, h: wallThick }); 

                    if (doorSide === 'right') {
                         WALLS.push({ x: rm.x, y: rm.y, w: wallThick, h: rm.h }); 
                         WALLS.push({ x: rm.x + rm.w - wallThick, y: rm.y, w: wallThick, h: rm.h/2 - doorSize/2 }); 
                         WALLS.push({ x: rm.x + rm.w - wallThick, y: rm.y + rm.h/2 + doorSize/2, w: wallThick, h: rm.h/2 - doorSize/2 }); 
                    } else {
                         WALLS.push({ x: rm.x + rm.w - wallThick, y: rm.y, w: wallThick, h: rm.h }); 
                         WALLS.push({ x: rm.x, y: rm.y, w: wallThick, h: rm.h/2 - doorSize/2 }); 
                         WALLS.push({ x: rm.x, y: rm.y + rm.h/2 + doorSize/2, w: wallThick, h: rm.h/2 - doorSize/2 }); 
                    }
                    
                    const text = new PIXI.Text({
                        text: rm.name,
                        style: { fontFamily: 'ui-sans-serif, sans-serif', fontSize: 20, fill: 0xffffff, fontWeight: '900', letterSpacing: 2 }
                    });
                    if (text.anchor) text.anchor.set(0.5, 0.5); 
                    text.x = rm.x + rm.w/2;
                    text.y = rm.y + 20; 
                    textContainer.addChild(text);
                });

                for (let w of WALLS) {
                    roomGfx.rect(w.x, w.y, w.w, w.h).fill(0x2D3748); // Original Dark Slate Walls
                }

                roomContainer.addChild(roomGfx);
                roomContainer.addChild(textContainer);

                const furnitureGfx = new PIXI.Graphics();
                furnitureGfx.zIndex = 2;
                
                const drawChair = (cx, cy, dir) => {
                    const color = 0x2A2A2A;
                    furnitureGfx.roundRect(cx - 15, cy - 15, 30, 30, 5).fill(color);
                    furnitureGfx.roundRect(
                        dir === 'up' || dir === 'down' ? cx - 12 : (dir === 'left' ? cx - 18 : cx + 12),
                        dir === 'left' || dir === 'right' ? cy - 12 : (dir === 'up' ? cy - 18 : cy + 12),
                        dir === 'up' || dir === 'down' ? 24 : 6,
                        dir === 'left' || dir === 'right' ? 24 : 6,
                        2
                    ).fill(0x111111);
                };

                const drawTable = (tx, ty, tw, th, isRound = false) => {
                    const shadowAlpha = 0.3;
                    if (isRound) {
                        furnitureGfx.circle(tx, ty + 6, tw/2).fill({ color: 0x000000, alpha: shadowAlpha });
                        furnitureGfx.circle(tx, ty, tw/2 + 2).fill(0x5C3A21); 
                        furnitureGfx.circle(tx, ty, tw/2).fill(0xC19A6B); // Original Wood 
                        WALLS.push({x: tx - tw/2, y: ty - tw/2, w: tw, h: tw});
                    } else {
                        furnitureGfx.roundRect(tx, ty + 6, tw, th, 8).fill({ color: 0x000000, alpha: shadowAlpha });
                        furnitureGfx.roundRect(tx, ty, tw, th, 8).fill(0x5C3A21);
                        furnitureGfx.roundRect(tx+2, ty+2, tw-4, th-4, 6).fill(0xC19A6B); // Original Wood
                        WALLS.push({x: tx, y: ty, w: tw, h: th});
                    }
                };

                STRUCTURAL_ROOMS.forEach(rm => {
                    const cx = rm.x + rm.w/2;
                    const cy = rm.y + rm.h/2;
                    
                    if (rm.name.includes('Dev Club Stage')) {
                        drawTable(rm.x + 100, rm.y + 40, rm.w - 200, 100, false);
                        for (let row = 0; row < 4; row++) {
                            for (let col = 0; col < 8; col++) {
                                drawChair(rm.x + 170 + (col * 80), rm.y + 260 + (row * 90), 'up');
                            }
                        }
                    } 
                    else if (rm.name.includes('Gaming Arena')) {
                        for (let r = 0; r < 2; r++) {
                            for (let c = 0; c < 2; c++) {
                                let dx = rm.x + 100 + (c * 350);
                                let dy = rm.y + 90 + (r * 180);
                                drawTable(dx, dy, 250, 70, false);
                                furnitureGfx.rect(dx + 20, dy + 10, 50, 10).fill(0x222222);
                                furnitureGfx.rect(dx + 180, dy + 10, 50, 10).fill(0x222222);
                                drawChair(dx + 45, dy + 100, 'up');
                                drawChair(dx + 205, dy + 100, 'up');
                            }
                        }
                    }
                    else if (rm.name.includes('Task Desks')) {
                        for (let row = 0; row < 3; row++) {
                            for (let col = 0; col < 5; col++) {
                                let dx = rm.x + 80 + (col * 150);
                                let dy = rm.y + 60 + (row * 100);
                                drawTable(dx, dy, 90, 50, false);
                                drawChair(dx + 20, dy + 80, 'up');
                                drawChair(dx + 70, dy + 80, 'up');
                            }
                        }
                    }
                    else if (rm.name.includes('Cafeteria')) {
                        const cafeCenters = [
                            {x: rm.x + 200, y: rm.y + 180}, {x: rm.x + 600, y: rm.y + 180},
                            {x: rm.x + 400, y: rm.y + 360}, {x: rm.x + 200, y: rm.y + 470},
                            {x: rm.x + 600, y: rm.y + 470}
                        ];
                        cafeCenters.forEach(pos => {
                             drawTable(pos.x, pos.y, 140, 140, true);
                             drawChair(pos.x, pos.y - 100, 'down');
                             drawChair(pos.x, pos.y + 100, 'up');
                             drawChair(pos.x - 100, pos.y, 'right');
                             drawChair(pos.x + 100, pos.y, 'left');
                        });
                    }
                    else if (rm.name.includes('Discussion Room')) {
                        drawTable(cx, cy, 120, 120, true);
                        drawChair(cx, cy - 90, 'down');
                        drawChair(cx, cy + 90, 'up');
                        drawChair(cx - 90, cy, 'right');
                        drawChair(cx + 90, cy, 'left');
                    }
                    else {
                        const leftTableX = rm.x + 120;
                        const rightTableX = rm.x + rm.w - 120;
                        const roomCy = cy - 5;
                        
                        drawTable(leftTableX - 30, roomCy - 40, 60, 80, false);
                        drawChair(leftTableX - 55, roomCy, 'right');
                        drawChair(leftTableX + 55, roomCy, 'left');
                        drawChair(leftTableX, roomCy - 65, 'down');
                        drawChair(leftTableX, roomCy + 65, 'up');

                        drawTable(rightTableX - 30, roomCy - 40, 60, 80, false);
                        drawChair(rightTableX - 55, roomCy, 'right');
                        drawChair(rightTableX + 55, roomCy, 'left');
                        drawChair(rightTableX, roomCy - 65, 'down');
                        drawChair(rightTableX, roomCy + 65, 'up');
                    }
                });

                worldContainer.addChild(furnitureGfx);

             } catch (e) {
                 console.error("Map creation error:", e);
             }

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

            let startTick = Date.now();
            movementInterval = setInterval(() => {
                const tick = (Date.now() - startTick) / 1000;
                
                stars.forEach(s => {
                    s.x += s.speedX;
                    s.y += s.speedY;
                    if (s.x < 0) s.x = MAP_WIDTH;
                    if (s.x > MAP_WIDTH) s.x = 0;
                    if (s.y < 0) s.y = MAP_HEIGHT;
                    if (s.y > MAP_HEIGHT) s.y = 0;
                });

                if (!avatarsRef.current['__internal_me__']) return;
                const myState = avatarsRef.current['__internal_me__'];
                
                const cam = camRef.current;
                const LERP_SPEED = 0.12;
                cam.x += (myState.x - cam.x) * LERP_SPEED;
                cam.y += (myState.y - cam.y) * LERP_SPEED;

                const wScale = worldContainer.scale.x;
                worldContainer.x = (window.innerWidth / 2) - (cam.x * wScale);
                worldContainer.y = (window.innerHeight / 2) - (cam.y * wScale);

                let currentRoomCheck = null;
                for (let rm of STRUCTURAL_ROOMS) {
                    if (myState.x >= rm.x && myState.x <= rm.x + rm.w &&
                        myState.y >= rm.y && myState.y <= rm.y + rm.h) {
                        currentRoomCheck = rm.name;
                        break;
                    }
                }
                
                for (let rName in roomGraphics) {
                    const g = roomGraphics[rName];
                    const targetAlpha = rName === currentRoomCheck ? 1.0 : 0.4;
                    g.alpha += (targetAlpha - g.alpha) * 0.1;
                }

                Object.values(avatarsRef.current).forEach(avatar => {
                    if(avatar && avatar.scale) avatar.scale.y = 1.0 + Math.sin(tick * 4) * 0.03;
                });

                if (currentRoomCheck !== window.__currentRoom) {
                    if (currentRoomCheck) {
                        socket.emit('join_room', { roomName: currentRoomCheck, isSeated: false });
                    } else {
                        socket.emit('leave_room');
                    }
                    window.__currentRoom = currentRoomCheck;
                }

                let dx = 0; let dy = 0;
                let speed = 6;
                
                if (keys.w || keys.ArrowUp) { dy -= speed; window.__autoWalkTarget = null; }
                if (keys.s || keys.ArrowDown) { dy += speed; window.__autoWalkTarget = null; }
                if (keys.a || keys.ArrowLeft) { dx -= speed; window.__autoWalkTarget = null; }
                if (keys.d || keys.ArrowRight) { dx += speed; window.__autoWalkTarget = null; }

                if (window.__autoWalkTarget) {
                    const tx = window.__autoWalkTarget.x;
                    const ty = window.__autoWalkTarget.y;
                    const dist = Math.sqrt(Math.pow(tx - myState.x, 2) + Math.pow(ty - myState.y, 2));
                    if (dist < speed) {
                        myState.x = tx; myState.y = ty;
                        window.__autoWalkTarget = null;
                        dx = 0; dy = 0;
                    } else {
                        dx = ((tx - myState.x) / dist) * speed;
                        dy = ((ty - myState.y) / dist) * speed;
                    }
                }

                if (dx !== 0 || dy !== 0) {
                    if (window.__autoWalkTarget) {
                        myState.x += dx;
                        myState.y += dy;
                    } else {
                        if (dx !== 0 && dy !== 0) {
                            const length = Math.sqrt(dx * dx + dy * dy);
                            dx = (dx / length) * speed;
                            dy = (dy / length) * speed;
                        }
                        const newX = myState.x + dx;
                        const newY = myState.y + dy;
                        if (!checkWorldCollision(newX, myState.y)) myState.x = newX;
                        if (!checkWorldCollision(myState.x, newY)) myState.y = newY;
                    }

                    if (myState.x !== myState.x - dx || myState.y !== myState.y - dy) {
                         onMyMovement(myState.x, myState.y);
                    }
                }
                
                const myCont = avatarsRef.current[myUser?.socketId];
                if (myCont && myCont.avatarSprite) {
                    if (dx !== 0 || dy !== 0) {
                        const tick = Date.now() / 150;
                        myCont.avatarSprite.rotation = Math.sin(tick) * 0.15;
                        myCont.avatarSprite.y = Math.abs(Math.cos(tick)) * -4;
                        if (dx < 0) myCont.avatarSprite.scale.x = -1;
                        if (dx > 0) myCont.avatarSprite.scale.x = 1;
                    } else {
                        myCont.avatarSprite.rotation = 0;
                        myCont.avatarSprite.y = 0;
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
                    const color = isMe ? 0x3B82F6 : 0xEF4444; 
                    
                    const avatarGrp = new PIXI.Container();
                    
                    const shadow = new PIXI.Graphics();
                    shadow.ellipse(0, 16, 12, 5).fill({ color: 0x000000, alpha: 0.3 });
                    avatarGrp.addChild(shadow);

                    const body = new PIXI.Graphics();
                    body.roundRect(-10, -5, 20, 22, 6).fill(color);
                    avatarGrp.addChild(body);

                    const head = new PIXI.Graphics();
                    head.circle(0, -15, 11).fill(0xFFE0BD);
                    avatarGrp.addChild(head);

                    const hair = new PIXI.Graphics();
                    const mod = (user.socketId ? user.socketId.charCodeAt(0) : 0) % 3;
                    if (mod === 0) hair.roundRect(-12, -26, 24, 12, 6).fill(0x2C3E50);
                    else if (mod === 1) hair.circle(0, -20, 12).fill(0xE67E22);
                    else hair.rect(-10, -24, 20, 10).fill(0x8E44AD);
                    avatarGrp.addChild(hair);
                    
                    container.addChild(avatarGrp);
                    container.avatarSprite = avatarGrp;
                    container.zIndex = 3;
                    
                    if (isMe) {
                        const ring = new PIXI.Graphics();
                        ring.circle(0, 0, 100).fill({ color: 0x3B82F6, alpha: 0.08 });
                        ring.circle(0, 0, 100).stroke({ width: 1, color: 0x3B82F6, alpha: 0.3 });
                        container.addChild(ring);
                    }

                    const nameText = new PIXI.Text({
                        text: user.username,
                        style: { fontFamily: 'ui-sans-serif, sans-serif', fontSize: 13, fill: 0xffffff, fontWeight: 'bold', dropShadow: true, dropShadowAlpha: 0.8, dropShadowDistance: 2 }
                    });
                    if (nameText.anchor) nameText.anchor.set(0.5, 0.5);
                    nameText.y = -35;

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
            
        </div>
    );
}

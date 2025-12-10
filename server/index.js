/**
 * Club Penguin Multiplayer WebSocket Server
 * Simple agar.io-style server for real-time player sync
 */

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3001;

// Game state
const players = new Map(); // odisconnectedplayerId -> { id, name, room, position, rotation, appearance, puffle }
const rooms = new Map(); // roomId -> Set of playerIds

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

console.log(`🐧 Club Penguin Server running on port ${PORT}`);

// Generate unique player ID
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

// Broadcast to all players in a room except sender
function broadcastToRoom(roomId, message, excludeId = null) {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return;
    
    const data = JSON.stringify(message);
    
    for (const playerId of roomPlayers) {
        if (playerId === excludeId) continue;
        
        const player = players.get(playerId);
        if (player && player.ws && player.ws.readyState === 1) {
            player.ws.send(data);
        }
    }
}

// Broadcast to ALL players in a room (including sender for confirmations)
function broadcastToRoomAll(roomId, message) {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return;
    
    const data = JSON.stringify(message);
    
    for (const playerId of roomPlayers) {
        const player = players.get(playerId);
        if (player && player.ws && player.ws.readyState === 1) {
            player.ws.send(data);
        }
    }
}

// Send to specific player
function sendToPlayer(playerId, message) {
    const player = players.get(playerId);
    if (player && player.ws && player.ws.readyState === 1) {
        player.ws.send(JSON.stringify(message));
    }
}

// Add player to room
function joinRoom(playerId, roomId) {
    // Remove from old room first
    const player = players.get(playerId);
    if (player && player.room) {
        const oldRoom = rooms.get(player.room);
        if (oldRoom) {
            oldRoom.delete(playerId);
            // Notify old room that player left
            broadcastToRoom(player.room, {
                type: 'player_left',
                playerId: playerId
            });
        }
    }
    
    // Add to new room
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(playerId);
    
    if (player) {
        player.room = roomId;
    }
}

// Get all players in a room (for sending current state to new players)
function getPlayersInRoom(roomId, excludeId = null) {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return [];
    
    const result = [];
    for (const playerId of roomPlayers) {
        if (playerId === excludeId) continue;
        
        const player = players.get(playerId);
        if (player) {
            result.push({
                id: player.id,
                name: player.name,
                position: player.position,
                rotation: player.rotation,
                appearance: player.appearance,
                puffle: player.puffle,
                emote: player.emote
            });
        }
    }
    return result;
}

// Handle new connection
wss.on('connection', (ws) => {
    const playerId = generateId();
    console.log(`Player connected: ${playerId}`);
    
    // Initialize player data
    players.set(playerId, {
        id: playerId,
        ws: ws,
        name: `Penguin${Math.floor(Math.random() * 1000)}`,
        room: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        appearance: {},
        puffle: null,
        emote: null
    });
    
    // Send player their ID
    ws.send(JSON.stringify({
        type: 'connected',
        playerId: playerId
    }));
    
    // Handle messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(playerId, message);
        } catch (e) {
            console.error('Invalid message:', e);
        }
    });
    
    // Handle disconnect
    ws.on('close', () => {
        console.log(`Player disconnected: ${playerId}`);
        
        const player = players.get(playerId);
        if (player && player.room) {
            // Notify room
            broadcastToRoom(player.room, {
                type: 'player_left',
                playerId: playerId
            });
            
            // Remove from room
            const room = rooms.get(player.room);
            if (room) {
                room.delete(playerId);
            }
        }
        
        players.delete(playerId);
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error for ${playerId}:`, error);
    });
});

// Message handler
function handleMessage(playerId, message) {
    const player = players.get(playerId);
    if (!player) return;
    
    switch (message.type) {
        case 'join': {
            // Player joining with their data
            player.name = message.name || player.name;
            player.appearance = message.appearance || {};
            player.puffle = message.puffle || null;
            
            const roomId = message.room || 'town';
            joinRoom(playerId, roomId);
            
            // Set initial position based on room
            if (roomId === 'town') {
                player.position = { x: 80, y: 0, z: 90 }; // Town center spawn
            } else if (roomId === 'dojo') {
                player.position = { x: 0, y: 0, z: 14 }; // Dojo entrance
            }
            
            // Send current players in room to the new player
            const existingPlayers = getPlayersInRoom(roomId, playerId);
            sendToPlayer(playerId, {
                type: 'room_state',
                room: roomId,
                players: existingPlayers
            });
            
            // Notify others in room about new player
            broadcastToRoom(roomId, {
                type: 'player_joined',
                player: {
                    id: player.id,
                    name: player.name,
                    position: player.position,
                    rotation: player.rotation,
                    appearance: player.appearance,
                    puffle: player.puffle
                }
            }, playerId);
            
            console.log(`${player.name} joined ${roomId}`);
            break;
        }
        
        case 'move': {
            // Player position update (sent frequently)
            player.position = message.position;
            player.rotation = message.rotation;
            
            // Update puffle position if present
            if (message.pufflePosition && player.puffle) {
                player.puffle.position = message.pufflePosition;
            }
            
            // Broadcast to room
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_moved',
                    playerId: playerId,
                    position: player.position,
                    rotation: player.rotation,
                    pufflePosition: message.pufflePosition
                }, playerId);
            }
            break;
        }
        
        case 'chat': {
            // Chat message
            if (player.room && message.text) {
                broadcastToRoomAll(player.room, {
                    type: 'chat',
                    playerId: playerId,
                    name: player.name,
                    text: message.text.substring(0, 200) // Limit message length
                });
            }
            break;
        }
        
        case 'emote': {
            // Emote triggered
            player.emote = message.emote;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_emote',
                    playerId: playerId,
                    emote: message.emote
                }, playerId);
            }
            
            // Clear emote after duration (except Sit)
            if (message.emote !== 'Sit') {
                setTimeout(() => {
                    player.emote = null;
                }, 3000);
            }
            break;
        }
        
        case 'stop_emote': {
            player.emote = null;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_emote',
                    playerId: playerId,
                    emote: null
                }, playerId);
            }
            break;
        }
        
        case 'change_room': {
            // Player changing rooms
            const newRoom = message.room;
            const oldRoom = player.room;
            
            if (newRoom && newRoom !== oldRoom) {
                joinRoom(playerId, newRoom);
                
                // Set spawn position for new room
                if (newRoom === 'town') {
                    player.position = { x: 80, y: 0, z: 70 }; // Near dojo exit
                } else if (newRoom === 'dojo') {
                    player.position = { x: 0, y: 0, z: 14 }; // Near entrance
                }
                
                // Send current players in new room
                const existingPlayers = getPlayersInRoom(newRoom, playerId);
                sendToPlayer(playerId, {
                    type: 'room_state',
                    room: newRoom,
                    players: existingPlayers
                });
                
                // Notify new room about player
                broadcastToRoom(newRoom, {
                    type: 'player_joined',
                    player: {
                        id: player.id,
                        name: player.name,
                        position: player.position,
                        rotation: player.rotation,
                        appearance: player.appearance,
                        puffle: player.puffle
                    }
                }, playerId);
                
                console.log(`${player.name} moved from ${oldRoom} to ${newRoom}`);
            }
            break;
        }
        
        case 'update_appearance': {
            // Player changed their appearance
            player.appearance = message.appearance || player.appearance;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_appearance',
                    playerId: playerId,
                    appearance: player.appearance
                }, playerId);
            }
            break;
        }
        
        case 'update_puffle': {
            // Player equipped/unequipped puffle
            player.puffle = message.puffle;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_puffle',
                    playerId: playerId,
                    puffle: player.puffle
                }, playerId);
            }
            break;
        }
        
        case 'ping': {
            // Keep-alive ping
            sendToPlayer(playerId, { type: 'pong' });
            break;
        }
    }
}

// Periodic cleanup of stale connections
setInterval(() => {
    for (const [playerId, player] of players) {
        if (player.ws.readyState !== 1) {
            console.log(`Cleaning up stale player: ${playerId}`);
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_left',
                    playerId: playerId
                });
                
                const room = rooms.get(player.room);
                if (room) room.delete(playerId);
            }
            
            players.delete(playerId);
        }
    }
}, 30000);

// Log server stats periodically
setInterval(() => {
    console.log(`📊 Players: ${players.size} | Rooms: ${Array.from(rooms.entries()).map(([id, set]) => `${id}:${set.size}`).join(', ') || 'none'}`);
}, 60000);


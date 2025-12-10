/**
 * Multiplayer Context - WebSocket connection and state management
 * Provides real-time player sync across the game
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const MultiplayerContext = createContext(null);

// Server URL - change this when deploying
const getServerUrl = () => {
    // Check for environment variable first
    if (import.meta.env.VITE_WS_SERVER) {
        return import.meta.env.VITE_WS_SERVER;
    }
    
    // Development default
    if (import.meta.env.DEV) {
        return 'ws://localhost:3001';
    }
    
    // Production - you'll set this to your Render.com URL
    // Example: 'wss://clubpenguin-server.onrender.com'
    return 'ws://localhost:3001';
};

export function MultiplayerProvider({ children }) {
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pingIntervalRef = useRef(null);
    
    // Connection state
    const [connected, setConnected] = useState(false);
    const [playerId, setPlayerId] = useState(null);
    const [playerName, setPlayerName] = useState(() => {
        return localStorage.getItem('penguin_name') || `Penguin${Math.floor(Math.random() * 1000)}`;
    });
    
    // Other players in current room
    const [otherPlayers, setOtherPlayers] = useState(new Map());
    
    // Chat messages (recent)
    const [chatMessages, setChatMessages] = useState([]);
    
    // Current room synced with server
    const [serverRoom, setServerRoom] = useState(null);
    
    // Callbacks for game integration
    const callbacksRef = useRef({
        onPlayerJoined: null,
        onPlayerLeft: null,
        onPlayerMoved: null,
        onPlayerEmote: null,
        onChatMessage: null
    });
    
    // Connect to server
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        
        const serverUrl = getServerUrl();
        console.log(`🔌 Connecting to ${serverUrl}...`);
        
        try {
            const ws = new WebSocket(serverUrl);
            wsRef.current = ws;
            
            ws.onopen = () => {
                console.log('✅ Connected to multiplayer server');
                setConnected(true);
                
                // Start ping interval to keep connection alive
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 25000);
            };
            
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleMessage(message);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };
            
            ws.onclose = () => {
                console.log('❌ Disconnected from server');
                setConnected(false);
                setPlayerId(null);
                clearInterval(pingIntervalRef.current);
                
                // Attempt reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('🔄 Attempting reconnect...');
                    connect();
                }, 3000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (e) {
            console.error('Failed to connect:', e);
            // Retry connection
            reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
    }, []);
    
    // Handle incoming messages
    const handleMessage = useCallback((message) => {
        switch (message.type) {
            case 'connected':
                setPlayerId(message.playerId);
                console.log(`🐧 Assigned player ID: ${message.playerId}`);
                break;
                
            case 'room_state':
                // Received current state of room (other players)
                console.log(`📍 Entered ${message.room} with ${message.players.length} other players`);
                setServerRoom(message.room);
                
                const newPlayers = new Map();
                message.players.forEach(p => {
                    newPlayers.set(p.id, p);
                });
                setOtherPlayers(newPlayers);
                break;
                
            case 'player_joined':
                console.log(`👋 ${message.player.name} joined`);
                setOtherPlayers(prev => {
                    const updated = new Map(prev);
                    updated.set(message.player.id, message.player);
                    return updated;
                });
                callbacksRef.current.onPlayerJoined?.(message.player);
                break;
                
            case 'player_left':
                console.log(`👋 Player ${message.playerId} left`);
                setOtherPlayers(prev => {
                    const updated = new Map(prev);
                    updated.delete(message.playerId);
                    return updated;
                });
                callbacksRef.current.onPlayerLeft?.(message.playerId);
                break;
                
            case 'player_moved':
                setOtherPlayers(prev => {
                    const updated = new Map(prev);
                    const player = updated.get(message.playerId);
                    if (player) {
                        updated.set(message.playerId, {
                            ...player,
                            position: message.position,
                            rotation: message.rotation,
                            pufflePosition: message.pufflePosition
                        });
                    }
                    return updated;
                });
                callbacksRef.current.onPlayerMoved?.(message.playerId, message.position, message.rotation);
                break;
                
            case 'player_emote':
                setOtherPlayers(prev => {
                    const updated = new Map(prev);
                    const player = updated.get(message.playerId);
                    if (player) {
                        updated.set(message.playerId, {
                            ...player,
                            emote: message.emote,
                            emoteStartTime: Date.now()
                        });
                    }
                    return updated;
                });
                callbacksRef.current.onPlayerEmote?.(message.playerId, message.emote);
                break;
                
            case 'player_appearance':
                setOtherPlayers(prev => {
                    const updated = new Map(prev);
                    const player = updated.get(message.playerId);
                    if (player) {
                        updated.set(message.playerId, {
                            ...player,
                            appearance: message.appearance
                        });
                    }
                    return updated;
                });
                break;
                
            case 'player_puffle':
                setOtherPlayers(prev => {
                    const updated = new Map(prev);
                    const player = updated.get(message.playerId);
                    if (player) {
                        updated.set(message.playerId, {
                            ...player,
                            puffle: message.puffle
                        });
                    }
                    return updated;
                });
                break;
                
            case 'chat':
                const chatMsg = {
                    id: Date.now(),
                    playerId: message.playerId,
                    name: message.name,
                    text: message.text,
                    timestamp: Date.now()
                };
                setChatMessages(prev => [...prev.slice(-50), chatMsg]); // Keep last 50 messages
                callbacksRef.current.onChatMessage?.(chatMsg);
                break;
                
            case 'pong':
                // Keep-alive response, no action needed
                break;
        }
    }, []);
    
    // Send message to server
    const send = useCallback((message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);
    
    // Join a room with player data
    const joinRoom = useCallback((room, appearance, puffle = null) => {
        send({
            type: 'join',
            room,
            name: playerName,
            appearance,
            puffle
        });
    }, [send, playerName]);
    
    // Send position update (called frequently during movement)
    const sendPosition = useCallback((position, rotation, pufflePosition = null) => {
        send({
            type: 'move',
            position,
            rotation,
            pufflePosition
        });
    }, [send]);
    
    // Send chat message
    const sendChat = useCallback((text) => {
        send({
            type: 'chat',
            text
        });
    }, [send]);
    
    // Send emote
    const sendEmote = useCallback((emote) => {
        send({
            type: 'emote',
            emote
        });
    }, [send]);
    
    // Stop emote
    const stopEmote = useCallback(() => {
        send({
            type: 'stop_emote'
        });
    }, [send]);
    
    // Change room
    const changeRoom = useCallback((newRoom) => {
        send({
            type: 'change_room',
            room: newRoom
        });
    }, [send]);
    
    // Update appearance
    const updateAppearance = useCallback((appearance) => {
        send({
            type: 'update_appearance',
            appearance
        });
    }, [send]);
    
    // Update puffle
    const updatePuffle = useCallback((puffle) => {
        send({
            type: 'update_puffle',
            puffle
        });
    }, [send]);
    
    // Set player name
    const setName = useCallback((name) => {
        setPlayerName(name);
        localStorage.setItem('penguin_name', name);
    }, []);
    
    // Register callbacks for game events
    const registerCallbacks = useCallback((callbacks) => {
        callbacksRef.current = { ...callbacksRef.current, ...callbacks };
    }, []);
    
    // Connect on mount
    useEffect(() => {
        connect();
        
        return () => {
            clearTimeout(reconnectTimeoutRef.current);
            clearInterval(pingIntervalRef.current);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);
    
    const value = {
        // State
        connected,
        playerId,
        playerName,
        otherPlayers,
        chatMessages,
        serverRoom,
        
        // Actions
        setName,
        joinRoom,
        sendPosition,
        sendChat,
        sendEmote,
        stopEmote,
        changeRoom,
        updateAppearance,
        updatePuffle,
        registerCallbacks
    };
    
    return (
        <MultiplayerContext.Provider value={value}>
            {children}
        </MultiplayerContext.Provider>
    );
}

export function useMultiplayer() {
    const context = useContext(MultiplayerContext);
    if (!context) {
        throw new Error('useMultiplayer must be used within a MultiplayerProvider');
    }
    return context;
}

export default MultiplayerContext;


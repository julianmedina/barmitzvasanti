import { io, Socket } from 'socket.io-client';
import { auth } from './firebaseConfig';

const BACKEND_URL = __DEV__
    ? 'http://localhost:3000'
    : 'https://santiagomedina.com.ar';

class PacmanSocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();
    private inputSequenceNumber: number = 0;
    private lastPingTime: number = 0;
    public ping: number = 0;
    /** Cache of game_state from join_game so the game screen can use it when navigating from lobby */
    private lastGameState: any = null;

    connect() {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        this.socket = io(BACKEND_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to Pacman backend:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from Pacman backend');
        });

        this.socket.on('pong', (data: any) => {
            const { clientTimestamp } = data;
            this.ping = Date.now() - clientTimestamp;
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
        }
    }

    async joinGame(role: 'pacman' | 'ghost', profileData?: { name: string, avatar?: string }) {
        if (!this.socket) {
            throw new Error('Socket not connected');
        }

        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Join game timeout'));
            }, 5000);

            // Use passed profile data, or fall back to Firebase auth
            let playerName = profileData?.name || user.displayName || user.email?.split('@')[0] || 'Jugador';
            let avatarUrl = profileData?.avatar || user.photoURL || '';

            // If no profile data passed, try one quick fetch (optional optimization)
            if (!profileData?.name) {
                try {
                    const { subscribeToUserProfile } = require('./database');
                    // Try to get profile (will be async but may not resolve in time)
                    subscribeToUserProfile(user.uid, (profile: any) => {
                        if (profile?.name) {
                            playerName = profile.name;
                            avatarUrl = profile.avatar || avatarUrl;
                        }
                    });
                } catch (e) {
                    console.log('Could not fetch profile from Firestore, using Firebase auth name');
                }
            }

            // Send join request with basic user info
            // Backend will handle everything in memory
            this.socket!.emit('join_game', {
                uid: user.uid,
                role,
                name: playerName,
                avatarUrl: avatarUrl,
                firebaseToken: '' // Optional: add token verification if needed
            });

            // Wait for game_state response (cache so game screen gets it when navigating from lobby)
            this.socket!.once('game_state', (state) => {
                clearTimeout(timeout);
                this.lastGameState = state;
                resolve(state);
            });

            // Handle errors
            this.socket!.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    // Production move with server validation
    moveInput(targetX: number, targetY: number, direction: string) {
        if (!this.socket) return;
        this.socket.emit('move_input', {
            targetX,
            targetY,
            direction,
            sequenceNumber: ++this.inputSequenceNumber,
            timestamp: Date.now()
        });
    }

    // Request viewport (optimized state)
    requestViewport(x: number, y: number, width: number, height: number) {
        if (!this.socket) return;
        this.socket.emit('request_viewport', { x, y, width, height });
    }

    // Ping measurement
    measurePing() {
        if (!this.socket) return;
        this.lastPingTime = Date.now();
        this.socket.emit('ping', { timestamp: this.lastPingTime });
    }

    eatDot(dotKey: string) {
        if (!this.socket) return;
        this.socket.emit('eat_dot', { dotKey });
    }

    eatPowerPellet(pelletKey: string) {
        if (!this.socket) return;
        this.socket.emit('eat_power_pellet', { pelletKey });
    }

    captureAttempt(pacmanUid: string) {
        if (!this.socket) return;
        this.socket.emit('capture_attempt', { pacmanUid });
    }

    requestRespawn(videoId: string) {
        if (!this.socket) return;

        return new Promise((resolve) => {
            this.socket!.emit('request_respawn', { videoId });
            this.socket!.once('respawn_granted', (data) => {
                resolve(data);
            });
        });
    }

    on(event: string, callback: Function) {
        if (!this.socket) return;

        this.socket.on(event, callback as any);

        // Store listener for cleanup
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback?: Function) {
        if (!this.socket) return;

        if (callback) {
            this.socket.off(event, callback as any);

            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                const index = eventListeners.indexOf(callback);
                if (index > -1) {
                    eventListeners.splice(index, 1);
                }
            }
        } else {
            this.socket.off(event);
            this.listeners.delete(event);
        }
    }

    isConnected() {
        return this.socket?.connected || false;
    }

    getLastGameState() {
        return this.lastGameState;
    }

    clearLastGameState() {
        this.lastGameState = null;
    }
}

export const pacmanSocket = new PacmanSocketService();

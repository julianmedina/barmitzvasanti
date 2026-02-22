import Joystick from '@/components/Joystick';
import { pacmanSocket } from '@/services/pacmanSocket';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Assets
const PACMAN_IMG = require('@/assets/images/pacman.png');
const GHOST_IMG = require('@/assets/images/ghost.png');

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PacmanGameScreen() {
    const router = useRouter();

    const [gameState, setGameState] = useState<any>(null);
    const [myUid, setMyUid] = useState<string | null>(null);
    const [isDead, setIsDead] = useState(false);
    const [events, setEvents] = useState<string[]>([]);
    const [powerPelletTime, setPowerPelletTime] = useState(0);
    const [myProfile, setMyProfile] = useState<{ name: string, avatar: string } | null>(null);
    const [mouthOpen, setMouthOpen] = useState(true);

    // Mouth Animation Loop (Only when moving)
    useEffect(() => {
        const interval = setInterval(() => {
            const isMoving = moveDirection.current.x !== 0 || moveDirection.current.y !== 0;
            if (isMoving) {
                setMouthOpen(prev => !prev);
            } else {
                setMouthOpen(false); // Closed when stationary
            }
        }, 150);
        return () => clearInterval(interval);
    }, []);

    // Movement state
    const moveDirection = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const myPos = useRef({ x: 0, y: 0 });
    const lastUpdateTime = useRef(Date.now());

    useEffect(() => {
        if (Platform.OS !== 'web') {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        }

        if (!pacmanSocket.isConnected()) {
            pacmanSocket.connect();
        }

        // Monitor Auth State
        const { auth } = require('@/services/firebaseConfig');
        const { onAuthStateChanged } = require('firebase/auth');

        const unsubscribeAuth = onAuthStateChanged(auth, (user: any) => {
            if (user) {
                setMyUid(user.uid);
            } else {
                router.replace('/games/pacman-lobby');
            }
        });

        // --- Socket Listeners ---

        pacmanSocket.on('game_state', (state: any) => {
            console.log('🎮 Game state received:', state);
            console.log('🗺️ Maze exists:', !!state?.maze);
            console.log('🗺️ Maze details:', state?.maze ? {
                width: state.maze.width,
                height: state.maze.height,
                dotsCount: state.maze.dots?.length,
                pelletsCount: state.maze.powerPellets?.length
            } : 'NO MAZE');

            setGameState(state);

            // Find my player and set initial position
            if (myUid) {
                const me = state.players.find((p: any) => p.uid === myUid);
                if (me) {
                    myPos.current = { x: me.x, y: me.y };
                    console.log('👤 My position:', myPos.current);
                }
            }
        });

        pacmanSocket.on('players_update', (data: any) => {
            setGameState((prev: any) => {
                if (!prev) return prev;

                const updatedPlayers = prev.players.map((p: any) => {
                    const update = data.players.find((up: any) => up.uid === p.uid);
                    return update ? { ...p, ...update } : p;
                });

                return { ...prev, players: updatedPlayers };
            });
        });

        pacmanSocket.on('player_joined', (p: any) => {
            setGameState((prev: any) => {
                if (!prev) return prev;
                return { ...prev, players: [...prev.players, p] };
            });
            addEvent(`${p.name} se unió`);
        });

        pacmanSocket.on('player_disconnected', ({ uid }: any) => {
            setGameState((prev: any) => {
                if (!prev) return prev;
                return { ...prev, players: prev.players.filter((p: any) => p.uid !== uid) };
            });
        });

        pacmanSocket.on('dot_eaten', (data: any) => {
            setGameState((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    eatenDots: [...prev.eatenDots, data.dotKey]
                };
            });
        });

        pacmanSocket.on('power_pellet_eaten', (data: any) => {
            setGameState((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    eatenPowerPellets: [...prev.eatenPowerPellets, data.pelletKey],
                    powerPelletActive: true,
                    powerPelletTimeRemaining: data.powerPelletTimeRemaining
                };
            });
            addEvent(`⚡ ${data.playerName} activó poder!`);
        });

        pacmanSocket.on('player_captured', (data: any) => {
            const { auth } = require('@/services/firebaseConfig');
            if (auth.currentUser && data.pacmanUid === auth.currentUser.uid) {
                setIsDead(true);
            }
            addEvent(data.eventText);
        });

        pacmanSocket.on('ghost_eaten', (data: any) => {
            const { auth } = require('@/services/firebaseConfig');
            if (auth.currentUser && data.ghostUid === auth.currentUser.uid) {
                setIsDead(true);
            }
            addEvent(data.eventText);
        });

        pacmanSocket.on('respawn_granted', (data: any) => {
            setIsDead(false);
            myPos.current = { x: data.x, y: data.y };
        });

        // Web Keyboard Controls
        if (Platform.OS === 'web') {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
        }

        // Helper to check if a position is valid (not a wall)
        const isWalkable = (x: number, y: number) => {
            if (!gameState?.maze) return false;

            const tileSize = gameState.maze.tileSize;
            const row = Math.floor(y / tileSize);
            const col = Math.floor(x / tileSize);

            // Bounds check for rows only (cols wrap around)
            if (row < 0 || row >= gameState.maze.height) return false;

            // Handle wrapping for columns check
            let checkCol = col;
            if (col < 0) checkCol = gameState.maze.width - 1;
            if (col >= gameState.maze.width) checkCol = 0;

            const tile = gameState.maze.template[row]?.[checkCol];
            return tile !== 0; // 0 is wall
        };

        // Game loop for client-side prediction
        const gameLoop = setInterval(() => {
            if (!myUid || isDead || !gameState?.maze) return;

            if (moveDirection.current.x !== 0 || moveDirection.current.y !== 0) {
                const SPEED = 6;
                let newX = myPos.current.x + moveDirection.current.x * SPEED;
                let newY = myPos.current.y + moveDirection.current.y * SPEED;

                const tileSize = gameState.maze.tileSize;
                const worldWidth = gameState.maze.worldWidth;

                // Screen Wrapping (Tunnel Effect)
                if (newX < 0) {
                    newX = worldWidth - 5;
                } else if (newX > worldWidth) {
                    newX = 5;
                }

                // Wall Collision Detection
                // Check center point + margin to avoid clipping
                // Simple prediction: is the target tile walkable?
                // We check the "leading edge" of the movement
                const margin = 10; // offset from center
                let checkX = newX;
                let checkY = newY;

                if (moveDirection.current.x > 0) checkX += margin;
                if (moveDirection.current.x < 0) checkX -= margin;
                if (moveDirection.current.y > 0) checkY += margin;
                if (moveDirection.current.y < 0) checkY -= margin;

                if (isWalkable(checkX, checkY)) {
                    myPos.current.x = newX;
                    myPos.current.y = newY;
                } else {
                    // Hit a wall - maybe try to align to grid?
                    // For now, just stop moving in that direction implies we hit wall
                    // But we keep the loop running so we can turn
                }

                // Force re-render
                setGameState((prev: any) => ({ ...prev }));

                // Send to server less frequently
                const now = Date.now();
                if (now - lastUpdateTime.current > 150) {
                    pacmanSocket.moveInput(
                        myPos.current.x,
                        myPos.current.y,
                        getDirString(moveDirection.current)
                    );
                    lastUpdateTime.current = now;
                }

                checkDotCollision();
            }
        }, 16);

        return () => {
            clearInterval(gameLoop);
            if (Platform.OS === 'web') {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
            }
            pacmanSocket.off('game_state');
            pacmanSocket.off('players_update');
            pacmanSocket.off('player_joined');
            pacmanSocket.off('player_disconnected');
            pacmanSocket.off('dot_eaten');
            pacmanSocket.off('power_pellet_eaten');
            pacmanSocket.off('player_captured');
            pacmanSocket.off('ghost_eaten');
            pacmanSocket.off('respawn_granted');
            unsubscribeAuth();
        };
    }, [myUid, isDead, gameState?.maze]);

    // Profile Fetching
    useEffect(() => {
        if (!myUid) return;
        try {
            const { subscribeToUserProfile } = require('@/services/database');
            const unsub = subscribeToUserProfile(myUid, (data: any) => {
                if (data) setMyProfile(data);
            });
            return unsub;
        } catch (e) { }
    }, [myUid]);

    // Auto-join if arriving without going through lobby
    useEffect(() => {
        if (!myUid || !pacmanSocket.isConnected()) return;

        // Wait a bit to see if we receive game_state from lobby flow or if profile loads
        const autoJoinTimer = setTimeout(() => {
            if (!gameState) {
                console.log('🔄 Auto-joining game (no state received from lobby)');
                // Default to pacman role for auto-join, passing profile data
                pacmanSocket.joinGame('pacman', myProfile || undefined)
                    .then(() => console.log('✅ Auto-joined successfully'))
                    .catch(e => {
                        console.error('❌ Auto-join failed:', e);
                        // Redirect to lobby if auto-join fails
                        router.replace('/games/pacman-lobby');
                    });
            }
        }, 1500); // Wait 1.5 seconds

        return () => clearTimeout(autoJoinTimer);
    }, [myUid, gameState, myProfile]);

    const checkDotCollision = () => {
        if (!gameState?.maze) return;

        const COLLISION_DISTANCE = 20; // Increased for easier collection

        // Check regular dots
        for (const dot of gameState.maze.dots) {
            if (gameState.eatenDots?.includes(dot.key)) continue;

            const dx = dot.x - myPos.current.x;
            const dy = dot.y - myPos.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < COLLISION_DISTANCE) {
                pacmanSocket.eatDot(dot.key);
                break; // Only eat one per frame
            }
        }

        // Check power pellets
        for (const pellet of gameState.maze.powerPellets) {
            if (gameState.eatenPowerPellets?.includes(pellet.key)) continue;

            const dx = pellet.x - myPos.current.x;
            const dy = pellet.y - myPos.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < COLLISION_DISTANCE) {
                pacmanSocket.eatPowerPellet(pellet.key);
                break;
            }
        }
    };

    const addEvent = (msg: string) => {
        setEvents(prev => [msg, ...prev].slice(0, 5));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowUp': moveDirection.current = { x: 0, y: -1 }; break;
            case 'ArrowDown': moveDirection.current = { x: 0, y: 1 }; break;
            case 'ArrowLeft': moveDirection.current = { x: -1, y: 0 }; break;
            case 'ArrowRight': moveDirection.current = { x: 1, y: 0 }; break;
        }
    };

    const handleKeyUp = () => {
        moveDirection.current = { x: 0, y: 0 };
    };

    const handleJoystickMove = (data: { x: number, y: number }) => {
        if (isDead) return;
        if (Math.abs(data.x) > Math.abs(data.y)) {
            moveDirection.current = { x: data.x > 0 ? 1 : -1, y: 0 };
        } else {
            moveDirection.current = { x: 0, y: data.y > 0 ? 1 : -1 };
        }
    };

    const handleJoystickStop = () => {
        moveDirection.current = { x: 0, y: 0 };
    };

    const handleRespawn = async () => {
        try {
            await pacmanSocket.requestRespawn('dummy_video');
        } catch (e) {
            console.error('Respawn error:', e);
        }
    };

    const getDirString = (dir: { x: number, y: number }) => {
        if (dir.x > 0) return 'right';
        if (dir.x < 0) return 'left';
        if (dir.y > 0) return 'down';
        if (dir.y < 0) return 'up';
        return 'right';
    };

    // Sound effects
    useEffect(() => {
        let sound: any = null;
        let isCancelled = false;

        async function loadSound() {
            try {
                const { Audio } = require('expo-av');
                const { sound: s } = await Audio.Sound.createAsync(
                    { uri: 'https://archive.org/download/pacman-waka-waka-sound-effect/Pacman%20Waka%20Waka%20Sound%20Effect.mp3' },
                    { isLooping: true, shouldPlay: false, volume: 0.5 }
                );

                if (isCancelled) {
                    await s.unloadAsync();
                    return;
                }
                sound = s;
            } catch (e) {
                console.log('Error loading sound:', e);
            }
        }
        loadSound();

        // Sync sound with movement
        const soundInterval = setInterval(async () => {
            if (!sound || isCancelled) return;

            try {
                const status = await sound.getStatusAsync();
                if (!status.isLoaded) return;

                const isMoving = moveDirection.current.x !== 0 || moveDirection.current.y !== 0;
                if (isMoving && !status.isPlaying && !isDead) {
                    await sound.playAsync();
                } else if ((!isMoving || isDead) && status.isPlaying) {
                    await sound.pauseAsync();
                }
            } catch (e) {
                // Silently handle status check errors during transitions
            }
        }, 150);

        return () => {
            isCancelled = true;
            clearInterval(soundInterval);
            if (sound) {
                sound.unloadAsync().catch(() => { });
            }
        };
    }, [isDead]);

    if (!gameState || !gameState.maze) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={styles.loadingText}>Conectando al juego...</Text>
            </View>
        );
    }

    const maze = gameState.maze;
    const eatenDots = gameState.eatenDots || [];
    const eatenPowerPellets = gameState.eatenPowerPellets || [];

    // Scale Logic: Fit HEIGHT to screen, let WIDTH overflow/scroll
    const scale = SCREEN_HEIGHT / maze.worldHeight;

    // Each "screen" is one repetition of the maze template (1/3 of total width)
    const templateWorldWidth = maze.worldWidth / 3;
    const currentScreenIndex = Math.floor(myPos.current.x / templateWorldWidth);

    // Calculate cameraX to center the current template on screen
    const templateRenderedWidth = templateWorldWidth * scale;
    const centeringOffset = (SCREEN_WIDTH - templateRenderedWidth) / 2;
    const cameraX = (-currentScreenIndex * templateRenderedWidth) + centeringOffset;


    // Debugging Black Screen
    // console.log('Camera Debug:', { cameraX, currentScreenIndex, screenWidth: SCREEN_WIDTH, scale, viewWorldWidth, myX: myPos.current.x });



    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* Maze Container (Viewport) */}
                <View style={styles.mazeContainer}>
                    {/* Camera Wrapper - Moves the world */}
                    <View style={{ flex: 1, transform: [{ translateX: cameraX }] }}>
                        {/* Scaled World content */}
                        <View style={[styles.mazeView, {
                            width: maze.worldWidth,
                            height: maze.worldHeight,
                            transform: [{ scale }],
                            // Important: scale origin to top-left so coordinates match
                            transformOrigin: 'top left', // This works on Web. Native needs manual offset.
                            // borderWidth: 2, borderColor: 'lime' // Debug border removed
                        }]}>
                            {/* Render Maze Walls */}
                            <MazeWalls template={maze.template} tileSize={maze.tileSize} />

                            {/* Render Dots */}
                            {maze.dots.map((dot: any) => {
                                if (eatenDots.includes(dot.key)) return null;
                                return (
                                    <View
                                        key={dot.key}
                                        style={[styles.dot, { left: dot.x - 3, top: dot.y - 3 }]}
                                    />
                                );
                            })}

                            {/* Render Power Pellets */}
                            {maze.powerPellets.map((pellet: any) => {
                                if (eatenPowerPellets.includes(pellet.key)) return null;
                                return (
                                    <View
                                        key={pellet.key}
                                        style={[styles.powerPellet, { left: pellet.x - 8, top: pellet.y - 8 }]}
                                    />
                                );
                            })}

                            {/* Render Players with CSS Shapes */}
                            {gameState.players?.map((player: any) => {
                                if (!player.alive) return null;

                                const isMe = player.uid === myUid;
                                const x = isMe ? myPos.current.x : player.x;
                                const y = isMe ? myPos.current.y : player.y;
                                const isPacman = player.role === 'pacman';
                                const PLAYER_SIZE = 30;

                                // Calculate rotation
                                let rotation = '0deg';
                                if (isMe) {
                                    if (moveDirection.current.x > 0) rotation = '0deg';
                                    if (moveDirection.current.x < 0) rotation = '180deg';
                                    if (moveDirection.current.y > 0) rotation = '90deg';
                                    if (moveDirection.current.y < 0) rotation = '-90deg';
                                } else if (player.direction) {
                                    if (player.direction === 'right') rotation = '0deg';
                                    if (player.direction === 'left') rotation = '180deg';
                                    if (player.direction === 'down') rotation = '90deg';
                                    if (player.direction === 'up') rotation = '-90deg';
                                }

                                return (
                                    <View
                                        key={player.uid}
                                        style={[
                                            styles.player,
                                            {
                                                left: x - PLAYER_SIZE / 2,
                                                top: y - PLAYER_SIZE / 2,
                                            }
                                        ]}
                                    >
                                        {isPacman ? (
                                            // CSS PACMAN
                                            <View style={{
                                                width: PLAYER_SIZE,
                                                height: PLAYER_SIZE,
                                                borderRadius: PLAYER_SIZE / 2,
                                                backgroundColor: '#FFD700',
                                                transform: [{ rotate: rotation }],
                                                overflow: 'hidden'
                                            }}>
                                                {/* Mouth */}
                                                {mouthOpen && (
                                                    <View style={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: PLAYER_SIZE / 4,
                                                        width: PLAYER_SIZE / 2,
                                                        height: PLAYER_SIZE / 2,
                                                        backgroundColor: 'transparent',
                                                        borderRightWidth: PLAYER_SIZE / 2,
                                                        borderTopWidth: PLAYER_SIZE / 4,
                                                        borderBottomWidth: PLAYER_SIZE / 4,
                                                        borderRightColor: 'black', // Assuming black background
                                                        borderTopColor: 'transparent',
                                                        borderBottomColor: 'transparent',
                                                    }} />
                                                )}
                                            </View>
                                        ) : (
                                            // CSS GHOST (Simple Tombstone)
                                            <View style={{
                                                width: PLAYER_SIZE,
                                                height: PLAYER_SIZE,
                                                backgroundColor: player.vulnerable ? '#4444FF' : '#FF0000',
                                                borderTopLeftRadius: PLAYER_SIZE / 2,
                                                borderTopRightRadius: PLAYER_SIZE / 2,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}>
                                                {/* Eyes */}
                                                <View style={{ flexDirection: 'row', gap: 4, marginTop: -4 }}>
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' }} />
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' }} />
                                                </View>
                                            </View>
                                        )}

                                        <Text style={[styles.playerName, {
                                            position: 'absolute',
                                            top: -15,
                                            width: 100,
                                            textAlign: 'center',
                                            color: 'white',
                                            textShadowColor: 'black',
                                            textShadowRadius: 2
                                        }]}>
                                            {player.name}
                                        </Text>
                                        {isMe && <View style={styles.meIndicator} />}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* HUD Layer */}
                <View style={styles.hud}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
                        <FontAwesome name="close" size={20} color="white" />
                    </TouchableOpacity>

                    {gameState.powerPelletActive && (
                        <View style={styles.powerIndicator}>
                            <Text style={styles.powerText}>⚡ PODER ACTIVO</Text>
                        </View>
                    )}

                    <View style={styles.eventLog}>
                        {events.map((e, i) => (
                            <Text key={i} style={styles.eventText}>{e}</Text>
                        ))}
                    </View>
                </View>

                {/* Mobile Controls */}
                {Platform.OS !== 'web' && (
                    <View style={styles.controls}>
                        <Joystick
                            onMove={handleJoystickMove}
                            onStop={handleJoystickStop}
                        />
                    </View>
                )}

                {/* Death Screen Overlay */}
                {isDead && (
                    <View style={styles.deathOverlay}>
                        <Text style={styles.deathTitle}>¡TE ATRAPARON!</Text>
                        <TouchableOpacity style={styles.respawnBtn} onPress={handleRespawn}>
                            <Text style={styles.respawnBtnText}>REVIVIR</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </GestureHandlerRootView>
    );
}

// Component to render maze walls - memoized for performance
const MazeWalls = React.memo(({ template, tileSize }: { template: number[][], tileSize: number }) => {
    const walls = [];

    for (let row = 0; row < template.length; row++) {
        for (let col = 0; col < template[row].length; col++) {
            if (template[row][col] === 0) { // 0 = wall
                walls.push(
                    <View
                        key={`wall_${row}_${col}`}
                        style={[
                            styles.wall,
                            {
                                left: col * tileSize,
                                top: row * tileSize,
                                width: tileSize,
                                height: tileSize
                            }
                        ]}
                    />
                );
            }
        }
    }

    return <>{walls}</>;
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    mazeContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    mazeView: {
        position: 'relative',
        backgroundColor: '#000',
        // @ts-ignore - transformOrigin is valid for RN Web
        transformOrigin: 'top left',
    },
    wall: {
        position: 'absolute',
        backgroundColor: '#1E40AF', // Blue walls like classic Pacman
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    dot: {
        position: 'absolute',
        width: 6,
        height: 6,
        backgroundColor: '#FFB8AE',
        borderRadius: 3,
    },
    powerPellet: {
        position: 'absolute',
        width: 16,
        height: 16,
        backgroundColor: '#FFD700',
        borderRadius: 8,
    },
    player: {
        position: 'absolute',
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playerName: {
        position: 'absolute',
        top: -12,
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 3,
        borderRadius: 2,
    },
    meIndicator: {
        position: 'absolute',
        bottom: -8,
        width: 4,
        height: 4,
        backgroundColor: '#FFD700',
        borderRadius: 2,
    },
    hud: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    exitBtn: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 15,
    },
    powerIndicator: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    powerText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 12,
    },
    eventLog: {
        width: 150,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 6,
        borderRadius: 5,
    },
    eventText: {
        color: '#ccc',
        fontSize: 9,
    },
    controls: {
        position: 'absolute',
        bottom: 30,
        left: 30,
    },
    deathOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deathTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FF0000',
        marginBottom: 20,
    },
    respawnBtn: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
    },
    respawnBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black',
    },
    loadingText: {
        color: 'white',
        fontSize: 16,
    },
    debugInfo: {
        color: '#888',
        fontSize: 12,
        marginTop: 10,
    },
});

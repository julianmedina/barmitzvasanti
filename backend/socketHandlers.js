const gameState = require('./gameState');

/**
 * Socket.IO Event Handlers
 */
function setupSocketHandlers(io, firestore) {
    io.on('connection', (socket) => {
        console.log(`✅ Client connected: ${socket.id}`);

        let currentUid = null;

        // Join game
        socket.on('join_game', async (data) => {
            try {
                const { uid, role, firebaseToken, name, avatarUrl } = data;

                // TODO: Verify Firebase token (optional for MVP)
                // const decodedToken = await admin.auth().verifyIdToken(firebaseToken);

                currentUid = uid;

                // Add player to game state
                gameState.addPlayer(uid, {
                    name,
                    avatarUrl,
                    role,
                    socketId: socket.id,
                    x: role === 'pacman' ? 100 : 500,
                    y: role === 'pacman' ? 100 : 500
                });

                // Join Socket.IO room
                socket.join('game');

                // Send current game state to new player
                const state = gameState.getGameState();
                socket.emit('game_state', state);

                // Notify others
                socket.to('game').emit('player_joined', {
                    uid,
                    name,
                    role
                });

                gameState.addEvent('join', `${name} se unió como ${role === 'pacman' ? 'Pacman' : 'Fantasma'}`);

                console.log(`🎮 Player joined: ${name} (${role})`);
            } catch (error) {
                console.error('Error in join_game:', error);
                socket.emit('error', { message: 'Failed to join game' });
            }
        });

        // Move player (with server validation)
        socket.on('move_input', (data) => {
            if (!currentUid) return;

            const { targetX, targetY, direction, sequenceNumber } = data;
            const player = gameState.players.get(currentUid);

            if (!player) return;

            // Validate sequence number (prevent replay attacks)
            if (sequenceNumber && sequenceNumber <= player.sequenceNumber) {
                return; // Ignore old input
            }

            if (sequenceNumber) {
                player.sequenceNumber = sequenceNumber;
            }

            // Calculate velocity towards target
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const MOVE_SPEED = 5; // pixels per tick
                player.vx = (dx / distance) * MOVE_SPEED;
                player.vy = (dy / distance) * MOVE_SPEED;
                player.targetX = targetX;
                player.targetY = targetY;
            } else {
                player.vx = 0;
                player.vy = 0;
            }

            player.direction = direction;

            // Position updates are broadcast by game loop
        });

        // Request viewport (optimized state for visible area)
        socket.on('request_viewport', (data) => {
            if (!currentUid) return;

            const { x, y, width, height } = data;

            // Update player's viewport tracking
            gameState.playerViewports.set(currentUid, { x, y, width, height });

            // Get viewport-specific state
            const viewportData = gameState.getViewportState(x, y, width, height);

            socket.emit('viewport_update', viewportData);
        });

        // Ping measurement
        socket.on('ping', (data) => {
            const { timestamp } = data;
            socket.emit('pong', {
                clientTimestamp: timestamp,
                serverTimestamp: Date.now()
            });
        });

        // Eat dot
        socket.on('eat_dot', (data) => {
            if (!currentUid) return;

            const { dotKey } = data;
            const success = gameState.eatDot(dotKey, currentUid);

            if (success) {
                const player = gameState.players.get(currentUid);

                // Broadcast to all players
                io.to('game').emit('dot_eaten', {
                    dotKey,
                    eatenBy: currentUid,
                    playerName: player.name,
                    newScore: player.scoreMatch,
                    remainingDots: gameState.TOTAL_DOTS - gameState.eatenDots.size
                });
            } else {
                socket.emit('dot_invalid', { dotKey });
            }
        });

        // Eat power pellet
        socket.on('eat_power_pellet', (data) => {
            if (!currentUid) return;

            const { pelletKey } = data;
            const success = gameState.eatPowerPellet(pelletKey, currentUid);

            if (success) {
                const player = gameState.players.get(currentUid);

                // Broadcast to all players
                io.to('game').emit('power_pellet_eaten', {
                    pelletKey,
                    eatenBy: currentUid,
                    playerName: player.name,
                    newScore: player.scoreMatch,
                    powerPelletTimeRemaining: gameState.getPowerPelletTimeRemaining()
                });

                gameState.addEvent('power', `${player.name} activó poder! 🔥`);
                console.log(`⚡ Power pellet activated by ${player.name}`);
            }
        });

        // Capture (server validates collision)
        socket.on('capture_attempt', (data) => {
            if (!currentUid) return;

            const { pacmanUid } = data;
            const result = gameState.capturePlayer(currentUid, pacmanUid);

            if (result) {
                if (result.type === 'ghost_eaten') {
                    const eventText = `Pacman ${result.pacmanName} comió al fantasma ${result.ghostName}! +200`;
                    gameState.addEvent('ghost_eaten', eventText);

                    // Broadcast ghost eaten event
                    io.to('game').emit('ghost_eaten', {
                        pacmanUid,
                        ghostUid: currentUid,
                        pacmanScore: result.pacmanScore,
                        ghostScore: result.ghostScore,
                        eventText
                    });

                    console.log(`👻💀 ${eventText}`);
                } else {
                    // pacman_captured
                    const eventText = `Fantasma ${result.ghostName} atrapó a Pacman ${result.pacmanName} +50`;
                    gameState.addEvent('capture', eventText);

                    // Broadcast capture event
                    io.to('game').emit('player_captured', {
                        ghostUid: currentUid,
                        pacmanUid,
                        ghostScore: result.ghostScore,
                        pacmanScore: result.pacmanScore,
                        eventText
                    });

                    console.log(`💀 ${eventText}`);
                }
            }
        });

        // Request respawn
        socket.on('request_respawn', (data) => {
            if (!currentUid) return;

            const { videoId } = data;
            const player = gameState.players.get(currentUid);

            if (!player) return;

            // Respawn at random position
            const x = 100 + Math.random() * 400;
            const y = 100 + Math.random() * 300;

            gameState.respawnPlayer(currentUid, x, y);

            socket.emit('respawn_granted', { x, y });

            gameState.addEvent('respawn', `${player.name} volvió al juego`);

            console.log(`🔄 Player respawned: ${player.name}`);
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (currentUid) {
                const player = gameState.players.get(currentUid);
                if (player) {
                    // Mark as potentially disconnected (give 30s reconnection window)
                    player.lastSyncTimestamp = Date.now();

                    gameState.addEvent('disconnect', `${player.name} se desconectó`);
                    console.log(`❌ Player disconnected: ${player.name} (${currentUid})`);

                    // Note: Player not immediately removed - memory manager will clean up after 30s if not reconnected
                }

                // Notify others
                io.to('game').emit('player_disconnected', { uid: currentUid });
            }

            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });
}

module.exports = { setupSocketHandlers };

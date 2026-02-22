const admin = require('firebase-admin');
const gameState = require('./gameState');
const config = require('./config');
const { firebaseSyncManager } = require('./firebaseSyncManager');

/**
 * Production Game Loop with Fixed Timestep
 * Server runs at 20 TPS (50ms tick) for deterministic physics
 * Broadcasts snapshots at 10/sec (100ms) to reduce bandwidth
 */

let lastTickTime = Date.now();
let accumulatedTime = 0;

function startGameLoop(io) {
    // High-precision interval (runs every 1ms to accumulate time)
    setInterval(() => {
        const now = Date.now();
        const deltaTime = now - lastTickTime;
        lastTickTime = now;

        accumulatedTime += deltaTime;

        // Fixed timestep: consume accumulated time in SERVER_TICK_RATE chunks
        while (accumulatedTime >= config.SERVER_TICK_RATE) {
            tick(io);
            accumulatedTime -= config.SERVER_TICK_RATE;
            gameState.gameSession.tickCount++;
        }
    }, 1);

    console.log(`🔄 Game loop started (${config.SERVER_TICK_RATE}ms tick = ${1000 / config.SERVER_TICK_RATE} TPS)`);
}

/**
 * Single game tick (runs every 50ms)
 */
function tick(io) {
    if (gameState.gameSession.status !== 'running') return;

    // 1. Update power pellet state
    gameState.updatePowerPelletState();

    // 2. Update player physics (server-authoritative)
    updatePlayerPhysics();

    // 3. Server-side collision detection
    detectCollisions(io);

    // 4. Broadcast snapshots every 100ms (every 2 ticks)
    if (gameState.gameSession.tickCount % 2 === 0) {
        broadcastGameSnapshots(io);
    }
}

/**
 * Server-authoritative physics update
 */
function updatePlayerPhysics() {
    for (const [uid, player] of gameState.players) {
        if (!player.alive) continue;

        // Apply velocity (simple linear movement)
        if (player.vx !== 0 || player.vy !== 0) {
            const newX = player.x + player.vx;
            const newY = player.y + player.vy;

            // Validate movement (wall collision)
            const { row, col } = gameState.mazeData.worldToTile ?
                gameState.mazeData.worldToTile(newX, newY) :
                { row: Math.floor(newY / 30), col: Math.floor(newX / 30) };

            const { isWalkable } = require('./mazeGenerator');

            if (isWalkable(row, col)) {
                // Clamp to world bounds
                player.x = Math.max(0, Math.min(newX, gameState.mazeData.worldWidth));
                player.y = Math.max(0, Math.min(newY, gameState.mazeData.worldHeight));

                // Update spatial grid
                gameState.spatialGrid.update(uid, player.x, player.y);

                // Record position history
                const history = gameState.positionHistory.get(uid);
                if (history) {
                    history.push({
                        x: player.x,
                        y: player.y,
                        tick: gameState.gameSession.tickCount,
                        timestamp: Date.now()
                    });
                }
            } else {
                // Hit wall - stop movement
                player.vx = 0;
                player.vy = 0;
            }
        }

        // Update invincibility
        if (player.invincible && Date.now() > player.invincibleUntil) {
            player.invincible = false;
        }
    }
}

/**
 * Server-side collision detection
 */
function detectCollisions(io) {
    const players = Array.from(gameState.players.values());

    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const p1 = players[i];
            const p2 = players[j];

            if (!p1.alive || !p2.alive) continue;
            if (p1.invincible || p2.invincible) continue;

            // Distance check
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < config.COLLISION_RADIUS) {
                // Collision detected
                if (p1.role === 'pacman' && p2.role === 'ghost') {
                    handlePacmanGhostCollision(p1, p2, io);
                } else if (p1.role === 'ghost' && p2.role === 'pacman') {
                    handlePacmanGhostCollision(p2, p1, io);
                }
            }
        }
    }
}

/**
 * Handle Pacman-Ghost collision
 */
function handlePacmanGhostCollision(pacman, ghost, io) {
    if (ghost.vulnerable) {
        // Pacman eats ghost
        const scoreGain = config.SCORE_GHOST_EATEN;
        pacman.scoreMatch += scoreGain;
        pacman.ghostsEaten += 1;
        ghost.alive = false;

        // Queue for Firebase sync
        firebaseSyncManager.queueScoreUpdate(pacman.uid, scoreGain);

        const eventText = `${pacman.name} comió al fantasma ${ghost.name}! +${scoreGain}`;
        gameState.addEvent('ghost_eaten', eventText);

        // Broadcast event
        io.to('game').emit('ghost_eaten', {
            pacmanUid: pacman.uid,
            ghostUid: ghost.uid,
            pacmanScore: pacman.scoreMatch,
            ghostScore: ghost.scoreMatch,
            eventText
        });

        // Respawn ghost immediately
        const { getRandomSpawn } = require('./mazeGenerator');
        const spawn = getRandomSpawn('ghost', gameState.mazeData.spawnPoints);
        ghost.x = spawn.x;
        ghost.y = spawn.y;
        ghost.alive = true;
        ghost.vulnerable = false;

        gameState.spatialGrid.update(ghost.uid, ghost.x, ghost.y);

        console.log(`👻💀 ${eventText}`);
    } else {
        // Ghost catches Pacman
        const ghostGain = config.SCORE_CAPTURE_BONUS;
        const pacmanLoss = config.SCORE_CAPTURE_PENALTY;

        ghost.scoreMatch += ghostGain;
        pacman.scoreMatch = Math.max(0, pacman.scoreMatch + pacmanLoss);
        pacman.alive = false;

        // Queue for Firebase sync
        firebaseSyncManager.queueScoreUpdate(ghost.uid, ghostGain);
        firebaseSyncManager.queueScoreUpdate(pacman.uid, pacmanLoss);

        const eventText = `Fantasma ${ghost.name} atrapó a ${pacman.name} +${ghostGain}`;
        gameState.addEvent('capture', eventText);

        // Broadcast event
        io.to('game').emit('player_captured', {
            ghostUid: ghost.uid,
            pacmanUid: pacman.uid,
            ghostScore: ghost.scoreMatch,
            pacmanScore: pacman.scoreMatch,
            eventText
        });

        console.log(`💀 ${eventText}`);
    }
}

/**
 * Broadcast game snapshots to all players
 */
function broadcastGameSnapshots(io) {
    // Get all player positions for broadcast
    const playerData = Array.from(gameState.players.values()).map(p => ({
        uid: p.uid,
        x: p.x,
        y: p.y,
        direction: p.direction,
        alive: p.alive,
        vulnerable: p.vulnerable,
        invincible: p.invincible,
        scoreMatch: p.scoreMatch
    }));

    // Broadcast to all clients
    io.to('game').emit('game_snapshot', {
        tick: gameState.gameSession.tickCount,
        players: playerData,
        powerMode: {
            active: gameState.powerPelletActive,
            endsAt: gameState.powerPelletEndTime
        },
        timestamp: Date.now()
    });
}

module.exports = { startGameLoop };

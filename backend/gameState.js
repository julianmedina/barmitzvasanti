/**
 * In-Memory Game State Management
 * Production version with spatial partitioning and lag compensation
 */

const { generateMaze, getRandomSpawn, isWalkable, worldToTile } = require('./mazeGenerator');
const { SpatialGrid } = require('./spatialGrid');
const { CircularBuffer } = require('./circularBuffer');
const config = require('./config');

// Generate the maze
const mazeData = generateMaze();

// Initialize spatial grid for viewport culling
const spatialGrid = new SpatialGrid(mazeData.worldWidth, mazeData.worldHeight);

// Game session (single object)
const gameSession = {
    id: `game_${Date.now()}`,
    status: 'waiting', // 'lobby' | 'starting' | 'running' | 'paused' | 'ended'
    worldSeed: Math.floor(Math.random() * 10000),
    startedAt: null,
    endedAt: null,
    tickCount: 0,
    gameVisible: true,
    maze: mazeData // Full maze (never sent to clients directly)
};

// Players (Map: uid → player object)
const players = new Map();

// Food state (Set of eaten dot keys)
const eatenDots = new Set();
const eatenPowerPellets = new Set();
const TOTAL_DOTS = mazeData.totalDots;
const TOTAL_POWER_PELLETS = mazeData.totalPowerPellets;

// Power pellet state
let powerPelletActive = false;
let powerPelletEndTime = null;
const POWER_PELLET_DURATION = 10000; // 10 seconds

// Game events (Array, max 20 recent events)
const gameEvents = [];
const MAX_EVENTS = 20;

// Position history for lag compensation
const positionHistory = new Map(); // uid -> CircularBuffer

// Player viewport tracking
const playerViewports = new Map(); // uid -> {x, y, width, height}

// Helper functions
function addPlayer(uid, playerData) {
    // Get spawn position based on role
    const spawn = getRandomSpawn(playerData.role, mazeData.spawnPoints);

    const now = Date.now();
    const player = {
        uid,
        socketId: playerData.socketId,
        name: playerData.name,
        avatarUrl: playerData.avatarUrl,
        role: playerData.role,

        // Position (server-authoritative)
        x: playerData.x || spawn.x,
        y: playerData.y || spawn.y,
        vx: 0, // Velocity for smooth interpolation
        vy: 0,
        targetX: playerData.x || spawn.x,
        targetY: playerData.y || spawn.y,
        direction: 'right',

        // State
        alive: true,
        vulnerable: false, // For ghosts during power pellet
        invincible: false, // Temporary after respawn
        invincibleUntil: null,

        // Scoring
        scoreMatch: 0,
        scoreLifetime: playerData.scoreLifetime || 0,
        dotsEaten: 0,
        ghostsEaten: 0,

        // Timing
        lastInputTimestamp: now,
        lastSyncTimestamp: now,
        joinedAt: now,

        // Network
        ping: 0,
        sequenceNumber: 0
    };

    players.set(uid, player);

    // Add to spatial grid
    spatialGrid.insert(uid, player.x, player.y, 'player');

    // Initialize position history
    positionHistory.set(uid, new CircularBuffer(config.MAX_POSITION_HISTORY));

    console.log(`✅ Player added: ${player.name} (${player.role}) at (${player.x}, ${player.y})`);
}

function removePlayer(uid) {
    spatialGrid.remove(uid);
    positionHistory.delete(uid);
    playerViewports.delete(uid);
    players.delete(uid);
    console.log(`❌ Player removed: ${uid}`);
}

function updatePlayerPosition(uid, x, y, direction) {
    const player = players.get(uid);
    if (!player) return false;

    // Update spatial grid
    spatialGrid.update(uid, x, y);

    // Record position history for lag compensation
    const history = positionHistory.get(uid);
    if (history) {
        history.push({ x, y, tick: gameSession.tickCount, timestamp: Date.now() });
    }

    player.x = x;
    player.y = y;
    player.direction = direction;
    player.lastSyncTimestamp = Date.now();

    return true;
}

function eatDot(dotKey, uid) {
    if (eatenDots.has(dotKey)) {
        return false; // Already eaten
    }

    eatenDots.add(dotKey);
    const player = players.get(uid);
    if (player && player.role === 'pacman') {
        player.scoreMatch += 1;
    }
    return true;
}

function eatPowerPellet(pelletKey, uid) {
    if (eatenPowerPellets.has(pelletKey)) {
        return false; // Already eaten
    }

    eatenPowerPellets.add(pelletKey);
    const player = players.get(uid);
    if (player && player.role === 'pacman') {
        player.scoreMatch += 10; // Power pellets worth more
        activatePowerPellet();
    }
    return true;
}

function activatePowerPellet() {
    powerPelletActive = true;
    powerPelletEndTime = Date.now() + POWER_PELLET_DURATION;

    // Make all ghosts vulnerable
    for (const player of players.values()) {
        if (player.role === 'ghost') {
            player.vulnerable = true;
        }
    }
}

function updatePowerPelletState() {
    if (powerPelletActive && Date.now() >= powerPelletEndTime) {
        powerPelletActive = false;
        powerPelletEndTime = null;

        // Make all ghosts invulnerable again
        for (const player of players.values()) {
            if (player.role === 'ghost') {
                player.vulnerable = false;
            }
        }
    }
}

function getPowerPelletTimeRemaining() {
    if (!powerPelletActive) return 0;
    return Math.max(0, powerPelletEndTime - Date.now());
}

function capturePlayer(ghostUid, pacmanUid) {
    const ghost = players.get(ghostUid);
    const pacman = players.get(pacmanUid);

    if (!ghost || !pacman || pacman.role !== 'pacman' || ghost.role !== 'ghost') {
        return null;
    }

    // Check if ghost is vulnerable (power pellet active)
    if (ghost.vulnerable) {
        // Pacman eats the ghost!
        pacman.scoreMatch += 200; // Big bonus for eating ghost
        ghost.alive = false; // Ghost dies temporarily

        return {
            type: 'ghost_eaten',
            pacmanScore: pacman.scoreMatch,
            ghostScore: ghost.scoreMatch,
            pacmanName: pacman.name,
            ghostName: ghost.name
        };
    }

    // Normal capture: ghost catches pacman
    ghost.scoreMatch += 50;
    pacman.scoreMatch = Math.max(0, pacman.scoreMatch - 20);
    pacman.alive = false;

    return {
        type: 'pacman_captured',
        ghostScore: ghost.scoreMatch,
        pacmanScore: pacman.scoreMatch,
        ghostName: ghost.name,
        pacmanName: pacman.name
    };
}

function respawnPlayer(uid, x, y) {
    const player = players.get(uid);
    if (player) {
        player.alive = true;
        player.x = x;
        player.y = y;
    }
}

function addEvent(type, text) {
    gameEvents.unshift({
        type,
        text,
        timestamp: Date.now()
    });

    // Keep only last 20 events
    if (gameEvents.length > MAX_EVENTS) {
        gameEvents.pop();
    }
}

function resetGame() {
    players.clear();
    eatenDots.clear();
    eatenPowerPellets.clear();
    gameEvents.length = 0;
    spatialGrid.clear();
    positionHistory.clear();
    playerViewports.clear();
    gameSession.status = 'waiting';
    gameSession.worldSeed = Math.floor(Math.random() * 10000);
    gameSession.startedAt = null;
    gameSession.endedAt = null;
    gameSession.tickCount = 0;
    powerPelletActive = false;
    powerPelletEndTime = null;

    // Re-populate spatial grid with dots and pellets
    populateSpatialGrid();

    console.log('🔄 Game reset complete');
}

function startGame() {
    gameSession.status = 'running';
    gameSession.startedAt = Date.now();
    gameSession.tickCount = 0;
    eatenDots.clear();
    eatenPowerPellets.clear();
    powerPelletActive = false;
    powerPelletEndTime = null;

    // Reset all player scores
    for (const player of players.values()) {
        player.scoreMatch = 0;
        player.dotsEaten = 0;
        player.ghostsEaten = 0;
        player.alive = true;
        player.vulnerable = false;
        player.invincible = false;
    }

    console.log('🎮 Game started - Session ID:', gameSession.id);
}

// Populate spatial grid with dots and pellets (call on init/reset)
function populateSpatialGrid() {
    for (const dot of mazeData.dots) {
        spatialGrid.insert(dot.key, dot.x, dot.y, 'dot');
    }
    for (const pellet of mazeData.powerPellets) {
        spatialGrid.insert(pellet.key, pellet.x, pellet.y, 'powerPellet');
    }
    console.log('📍 Spatial grid populated with', mazeData.dots.length, 'dots and', mazeData.powerPellets.length, 'pellets');
}

// Initial population
populateSpatialGrid();

function getGameState() {
    updatePowerPelletState(); // Update power pellet state before returning

    return {
        session: {
            id: gameSession.id,
            status: gameSession.status,
            worldSeed: gameSession.worldSeed,
            startedAt: gameSession.startedAt,
            tickCount: gameSession.tickCount
        },
        players: Array.from(players.values()),
        eatenDots: Array.from(eatenDots),
        eatenPowerPellets: Array.from(eatenPowerPellets),
        remainingDots: TOTAL_DOTS - eatenDots.size,
        powerPelletActive,
        powerPelletTimeRemaining: getPowerPelletTimeRemaining(),
        maze: mazeData, // Full maze for initial sync
        events: gameEvents.slice(0, 10)
    };
}

// Get viewport-specific state (optimized for bandwidth)
function getViewportState(viewX, viewY, viewWidth, viewHeight) {
    const visibleEntities = spatialGrid.queryViewport(viewX, viewY, viewWidth, viewHeight);

    const visiblePlayers = [];
    const visibleDots = [];
    const visiblePellets = [];

    for (const entity of visibleEntities) {
        if (entity.type === 'player') {
            const p = players.get(entity.id);
            if (p && p.alive) {
                visiblePlayers.push({
                    uid: p.uid,
                    name: p.name,
                    role: p.role,
                    x: p.x,
                    y: p.y,
                    direction: p.direction,
                    vulnerable: p.vulnerable,
                    invincible: p.invincible,
                    scoreMatch: p.scoreMatch
                });
            }
        } else if (entity.type === 'dot' && !eatenDots.has(entity.id)) {
            visibleDots.push({ key: entity.id, x: entity.x, y: entity.y });
        } else if (entity.type === 'powerPellet' && !eatenPowerPellets.has(entity.id)) {
            visiblePellets.push({ key: entity.id, x: entity.x, y: entity.y });
        }
    }

    return {
        players: visiblePlayers,
        dots: visibleDots,
        powerPellets: visiblePellets,
        timestamp: Date.now()
    };
}

function getPlayerCount() {
    let pacmanCount = 0;
    let ghostCount = 0;

    for (const player of players.values()) {
        if (player.role === 'pacman') pacmanCount++;
        else if (player.role === 'ghost') ghostCount++;
    }

    return { pacmanCount, ghostCount, total: players.size };
}

module.exports = {
    // Session
    gameSession,

    // Core state
    players,
    eatenDots,
    eatenPowerPellets,
    TOTAL_DOTS,
    TOTAL_POWER_PELLETS,
    gameEvents,
    mazeData,

    // Spatial systems
    spatialGrid,
    positionHistory,
    playerViewports,

    // Player management
    addPlayer,
    removePlayer,
    updatePlayerPosition,
    getPlayerCount,

    // Game actions
    eatDot,
    eatPowerPellet,
    capturePlayer,
    respawnPlayer,
    addEvent,

    // Session control
    resetGame,
    startGame,
    getGameState,
    getViewportState,

    // Power pellet
    updatePowerPelletState,
    getPowerPelletTimeRemaining
};

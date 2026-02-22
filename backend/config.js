/**
 * Centralized Game Configuration
 */

module.exports = {
    // Server Tick Rates
    SERVER_TICK_RATE: 50,          // 20 TPS (milliseconds)
    SNAPSHOT_BROADCAST_RATE: 100,  // 10 snapshots/sec

    // Firebase Sync
    FIREBASE_SYNC_INTERVAL: 60000, // 60 seconds

    // Memory Management
    MEMORY_CHECK_INTERVAL: 30000,  // 30 seconds
    SESSION_TIMEOUT: 3600000,      // 1 hour
    MAX_EVENTS: 100,
    MAX_POSITION_HISTORY: 20,      // ticks

    // Game Rules
    POWER_PELLET_DURATION: 10000,  // 10 seconds
    INVINCIBILITY_DURATION: 3000,  // 3 seconds after respawn

    // Physics
    MAX_PLAYER_SPEED: 10,          // pixels per tick
    COLLISION_RADIUS: 15,          // pixels

    // Spatial Partitioning
    GRID_CELL_SIZE: 256,           // pixels (8x8 tiles)
    VIEWPORT_BUFFER: 128,          // extra pixels around viewport

    // Network
    MAX_PLAYERS: 50,
    INPUT_THROTTLE: 50,            // ms between input sends

    // Scoring
    SCORE_DOT: 1,
    SCORE_POWER_PELLET: 10,
    SCORE_GHOST_EATEN: 200,
    SCORE_CAPTURE_BONUS: 50,
    SCORE_CAPTURE_PENALTY: -20
};

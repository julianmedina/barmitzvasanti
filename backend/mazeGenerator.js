/**
 * Maze Generation for Pacman Multiplayer
 * Creates a classic Pacman-style maze with walls, paths, dots, and power pellets
 */

// Tile types
const TILE = {
    EMPTY: 0,      // Wall
    PATH: 1,       // Walkable path with dot
    POWER: 2,      // Power pellet location
    SPAWN_PACMAN: 3,  // Pacman spawn point (no dot)
    SPAWN_GHOST: 4    // Ghost spawn point (no dot)
};

// Landscape maze - Base template (28x16)
const BASE_TEMPLATE = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0],
    [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 4, 4, 3, 3, 4, 4, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1], // Center spawn area
    [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

// Create a 3-screen wide maze by concatenating the template
const MAZE_TEMPLATE = BASE_TEMPLATE.map(row => [...row, ...row, ...row]);

const MAZE_WIDTH = MAZE_TEMPLATE[0].length;
const MAZE_HEIGHT = MAZE_TEMPLATE.length;
const TILE_SIZE = 30; // pixels

/**
 * Generate maze data
 * @param {number} seed - World seed (not used for static maze, but kept for consistency)
 * @returns {Object} Maze data with tiles, dots, power pellets, and spawn points
 */
function generateMaze(seed = 0) {
    const dots = [];
    const powerPellets = [];
    const spawnPoints = {
        pacman: [],
        ghost: []
    };

    // Parse the maze template
    for (let row = 0; row < MAZE_HEIGHT; row++) {
        for (let col = 0; col < MAZE_WIDTH; col++) {
            const tile = MAZE_TEMPLATE[row][col];
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;

            switch (tile) {
                case TILE.PATH:
                    // Add regular dot
                    dots.push({
                        key: `dot_${row}_${col}`,
                        x: x + TILE_SIZE / 2,
                        y: y + TILE_SIZE / 2,
                        row,
                        col
                    });
                    break;

                case TILE.POWER:
                    // Add power pellet
                    powerPellets.push({
                        key: `power_${row}_${col}`,
                        x: x + TILE_SIZE / 2,
                        y: y + TILE_SIZE / 2,
                        row,
                        col
                    });
                    break;

                case TILE.SPAWN_PACMAN:
                    spawnPoints.pacman.push({ x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2, row, col });
                    break;

                case TILE.SPAWN_GHOST:
                    spawnPoints.ghost.push({ x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2, row, col });
                    break;
            }
        }
    }

    return {
        template: MAZE_TEMPLATE,
        width: MAZE_WIDTH,
        height: MAZE_HEIGHT,
        tileSize: TILE_SIZE,
        worldWidth: MAZE_WIDTH * TILE_SIZE,
        worldHeight: MAZE_HEIGHT * TILE_SIZE,
        dots,
        powerPellets,
        spawnPoints,
        totalDots: dots.length,
        totalPowerPellets: powerPellets.length
    };
}

/**
 * Check if a tile is walkable
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
function isWalkable(row, col) {
    if (row < 0 || row >= MAZE_HEIGHT || col < 0 || col >= MAZE_WIDTH) {
        return false;
    }
    const tile = MAZE_TEMPLATE[row][col];
    return tile !== TILE.EMPTY; // Everything except walls is walkable
}

/**
 * Convert world coordinates to tile coordinates
 * @param {number} x
 * @param {number} y
 * @returns {Object} {row, col}
 */
function worldToTile(x, y) {
    return {
        row: Math.floor(y / TILE_SIZE),
        col: Math.floor(x / TILE_SIZE)
    };
}

/**
 * Convert tile coordinates to world coordinates (center of tile)
 * @param {number} row
 * @param {number} col
 * @returns {Object} {x, y}
 */
function tileToWorld(row, col) {
    return {
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2
    };
}

/**
 * Get random spawn point for a role
 * @param {string} role - 'pacman' or 'ghost'
 * @param {Object} spawnPoints - Spawn points from maze data
 * @returns {Object} {x, y}
 */
function getRandomSpawn(role, spawnPoints) {
    const points = spawnPoints[role];
    if (!points || points.length === 0) {
        // Fallback to center
        return { x: MAZE_WIDTH * TILE_SIZE / 2, y: MAZE_HEIGHT * TILE_SIZE / 2 };
    }
    const spawn = points[Math.floor(Math.random() * points.length)];
    return { x: spawn.x, y: spawn.y };
}

module.exports = {
    TILE,
    MAZE_TEMPLATE,
    TILE_SIZE,
    generateMaze,
    isWalkable,
    worldToTile,
    tileToWorld,
    getRandomSpawn
};

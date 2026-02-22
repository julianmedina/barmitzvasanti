/**
 * Spatial Partitioning System for Viewport Culling
 * Divides the world into grid cells for efficient entity queries
 */

const config = require('./config');

class SpatialGrid {
    constructor(worldWidth, worldHeight, cellSize = config.GRID_CELL_SIZE) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.cellSize = cellSize;
        this.grid = new Map(); // key: 'x_y', value: Set<entityId>
        this.entities = new Map(); // entityId -> {x, y, type, gridKey}
    }

    /**
     * Get grid key from world position
     */
    getKey(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx}_${cy}`;
    }

    /**
     * Insert entity into spatial grid
     */
    insert(entityId, x, y, type) {
        const key = this.getKey(x, y);

        if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
        }

        this.grid.get(key).add(entityId);
        this.entities.set(entityId, { x, y, type, gridKey: key });
    }

    /**
     * Update entity position (moves between grid cells if needed)
     */
    update(entityId, newX, newY) {
        const entity = this.entities.get(entityId);
        if (!entity) return false;

        const oldKey = entity.gridKey;
        const newKey = this.getKey(newX, newY);

        if (oldKey !== newKey) {
            // Remove from old cell
            const oldCell = this.grid.get(oldKey);
            if (oldCell) {
                oldCell.delete(entityId);
                if (oldCell.size === 0) {
                    this.grid.delete(oldKey); // Cleanup empty cells
                }
            }

            // Add to new cell
            if (!this.grid.has(newKey)) {
                this.grid.set(newKey, new Set());
            }
            this.grid.get(newKey).add(entityId);

            entity.gridKey = newKey;
        }

        entity.x = newX;
        entity.y = newY;
        return true;
    }

    /**
     * Remove entity from grid
     */
    remove(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) return false;

        const cell = this.grid.get(entity.gridKey);
        if (cell) {
            cell.delete(entityId);
            if (cell.size === 0) {
                this.grid.delete(entity.gridKey);
            }
        }

        this.entities.delete(entityId);
        return true;
    }

    /**
     * Query entities within viewport bounds
     * @param {number} viewX - Viewport X position
     * @param {number} viewY - Viewport Y position
     * @param {number} viewWidth - Viewport width
     * @param {number} viewHeight - Viewport height
     * @param {number} buffer - Extra padding around viewport
     * @returns {Array} Array of entities with {id, x, y, type}
     */
    queryViewport(viewX, viewY, viewWidth, viewHeight, buffer = config.VIEWPORT_BUFFER) {
        const minX = Math.max(0, viewX - buffer);
        const minY = Math.max(0, viewY - buffer);
        const maxX = Math.min(this.worldWidth, viewX + viewWidth + buffer);
        const maxY = Math.min(this.worldHeight, viewY + viewHeight + buffer);

        const minCellX = Math.floor(minX / this.cellSize);
        const minCellY = Math.floor(minY / this.cellSize);
        const maxCellX = Math.floor(maxX / this.cellSize);
        const maxCellY = Math.floor(maxY / this.cellSize);

        const results = [];
        const seen = new Set(); // Prevent duplicates

        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cy = minCellY; cy <= maxCellY; cy++) {
                const key = `${cx}_${cy}`;
                const cell = this.grid.get(key);

                if (cell) {
                    for (const entityId of cell) {
                        if (seen.has(entityId)) continue;

                        const entity = this.entities.get(entityId);
                        if (entity && entity.x >= minX && entity.x <= maxX &&
                            entity.y >= minY && entity.y <= maxY) {
                            results.push({ id: entityId, ...entity });
                            seen.add(entityId);
                        }
                    }
                }
            }
        }

        return results;
    }

    /**
     * Query entities near a point (radius search)
     */
    queryRadius(centerX, centerY, radius) {
        const minX = centerX - radius;
        const minY = centerY - radius;
        const maxX = centerX + radius;
        const maxY = centerY + radius;

        const minCellX = Math.floor(minX / this.cellSize);
        const minCellY = Math.floor(minY / this.cellSize);
        const maxCellX = Math.floor(maxX / this.cellSize);
        const maxCellY = Math.floor(maxY / this.cellSize);

        const results = [];
        const radiusSq = radius * radius;

        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cy = minCellY; cy <= maxCellY; cy++) {
                const key = `${cx}_${cy}`;
                const cell = this.grid.get(key);

                if (cell) {
                    for (const entityId of cell) {
                        const entity = this.entities.get(entityId);
                        if (entity) {
                            const dx = entity.x - centerX;
                            const dy = entity.y - centerY;
                            const distSq = dx * dx + dy * dy;

                            if (distSq <= radiusSq) {
                                results.push({
                                    id: entityId,
                                    ...entity,
                                    distance: Math.sqrt(distSq)
                                });
                            }
                        }
                    }
                }
            }
        }

        return results;
    }

    /**
     * Get all entities of a specific type
     */
    getByType(type) {
        const results = [];
        for (const [entityId, entity] of this.entities) {
            if (entity.type === type) {
                results.push({ id: entityId, ...entity });
            }
        }
        return results;
    }

    /**
     * Clear all entities
     */
    clear() {
        this.grid.clear();
        this.entities.clear();
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalCells: this.grid.size,
            totalEntities: this.entities.size,
            averageEntitiesPerCell: this.entities.size / Math.max(1, this.grid.size)
        };
    }
}

module.exports = { SpatialGrid };

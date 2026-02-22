/**
 * Memory Management and Cleanup
 * Prevents memory leaks and handles session lifecycle
 */

const config = require('./config');
const gameState = require('./gameState');

class MemoryManager {
    constructor() {
        this.sessionStartTime = Date.now();
        this.lastMemoryCheck = Date.now();
    }

    /**
     * Check current memory usage
     */
    checkMemoryUsage() {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const rss = Math.round(usage.rss / 1024 / 1024);

        console.log(`📊 Memory: Heap ${heapUsedMB}MB / ${heapTotalMB}MB | RSS ${rss}MB`);

        // Alert if memory usage is high
        if (heapUsedMB > 512) {
            console.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);
            this.triggerGarbageCollection();
        }

        return { heapUsedMB, heapTotalMB, rss };
    }

    /**
     * Force garbage collection (requires --expose-gc flag)
     */
    triggerGarbageCollection() {
        if (global.gc) {
            console.log('🗑️ Forcing garbage collection...');
            global.gc();
            const afterGC = process.memoryUsage();
            console.log(`✅ GC complete: ${Math.round(afterGC.heapUsed / 1024 / 1024)}MB`);
        } else {
            console.log('💡 GC not available (run with --expose-gc flag)');
        }
    }

    /**
     * Cleanup old events
     */
    cleanupEvents() {
        const MAX_AGE = 300000; // 5 minutes
        const now = Date.now();
        let removed = 0;

        while (gameState.gameEvents.length > config.MAX_EVENTS) {
            gameState.gameEvents.pop();
            removed++;
        }

        // Remove events older than 5 minutes
        while (gameState.gameEvents.length > 0) {
            const oldest = gameState.gameEvents[gameState.gameEvents.length - 1];
            if (now - oldest.timestamp > MAX_AGE) {
                gameState.gameEvents.pop();
                removed++;
            } else {
                break;
            }
        }

        if (removed > 0) {
            console.log(`🧹 Cleaned up ${removed} old events`);
        }
    }

    /**
     * Cleanup disconnected players
     */
    cleanupDisconnectedPlayers() {
        const now = Date.now();
        const DISCONNECT_TIMEOUT = 30000; // 30 seconds
        let removed = 0;

        for (const [uid, player] of gameState.players) {
            if (now - player.lastSyncTimestamp > DISCONNECT_TIMEOUT) {
                console.log(`⏱️ Removing inactive player: ${player.name} (${uid})`);
                gameState.removePlayer(uid);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`🧹 Cleaned up ${removed} disconnected players`);
        }

        return removed;
    }

    /**
     * Cleanup position history for removed players
     */
    cleanupPositionHistory() {
        let removed = 0;

        for (const uid of gameState.positionHistory.keys()) {
            if (!gameState.players.has(uid)) {
                gameState.positionHistory.delete(uid);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`🧹 Cleaned up ${removed} orphaned position histories`);
        }
    }

    /**
     * Reset entire game session
     */
    resetSession() {
        console.log('🔄 Resetting game session...');

        gameState.resetGame();

        this.sessionStartTime = Date.now();
        this.triggerGarbageCollection();

        console.log('✅ Session reset complete');
    }

    /**
     * Check if session should auto-reset (no players for 1 hour)
     */
    checkSessionTimeout() {
        const sessionAge = Date.now() - this.sessionStartTime;

        if (sessionAge > config.SESSION_TIMEOUT && gameState.players.size === 0) {
            console.log(`⏰ Session timeout (${Math.round(sessionAge / 60000)} minutes), auto-resetting...`);
            this.resetSession();
            return true;
        }

        return false;
    }

    /**
     * Get memory statistics
     */
    getStats() {
        const usage = process.memoryUsage();
        return {
            heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
            rssMB: Math.round(usage.rss / 1024 / 1024),
            players: gameState.players.size,
            events: gameState.gameEvents.length,
            positionHistories: gameState.positionHistory.size,
            sessionUptimeMinutes: Math.round((Date.now() - this.sessionStartTime) / 60000),
            spatialGridStats: gameState.spatialGrid.getStats()
        };
    }

    /**
     * Run all cleanup tasks
     */
    runCleanup() {
        console.log('🧹 Running memory cleanup...');

        this.checkMemoryUsage();
        this.cleanupEvents();
        this.cleanupDisconnectedPlayers();
        this.cleanupPositionHistory();
        this.checkSessionTimeout();

        console.log('✅ Cleanup complete');
    }

    /**
     * Start automatic cleanup interval
     */
    startAutoCleanup() {
        setInterval(() => {
            this.runCleanup();
        }, config.MEMORY_CHECK_INTERVAL);

        console.log(`🧹 Auto-cleanup started (${config.MEMORY_CHECK_INTERVAL / 1000}s interval)`);
    }
}

// Singleton instance
const memoryManager = new MemoryManager();

module.exports = { memoryManager, MemoryManager };

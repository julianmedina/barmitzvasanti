/**
 * Firebase Score Sync with Batch Processing
 * Syncs player scores every 60 seconds in batches
 */

const admin = require('firebase-admin');
const config = require('./config');

class FirebaseSyncManager {
    constructor() {
        this.pendingScoreUpdates = new Map(); // uid -> scoreDelta
        this.lastSyncTime = Date.now();
        this.syncing = false;
        this.syncErrors = 0;
        this.totalSyncs = 0;
    }

    /**
     * Queue a score update for batch processing
     */
    queueScoreUpdate(uid, scoreDelta) {
        const current = this.pendingScoreUpdates.get(uid) || 0;
        this.pendingScoreUpdates.set(uid, current + scoreDelta);

        console.log(`📝 Queued score update: ${uid} +${scoreDelta} (total pending: ${current + scoreDelta})`);
    }

    /**
     * Sync all pending scores to Firebase
     */
    async syncScoresToFirebase(firestore, gameState) {
        if (this.syncing) {
            console.log('⏳ Sync already in progress, skipping...');
            return;
        }

        if (this.pendingScoreUpdates.size === 0) {
            console.log('📊 No score updates to sync');
            return;
        }

        this.syncing = true;
        const timestamp = Date.now();
        const updateCount = this.pendingScoreUpdates.size;

        console.log(`🔄 Syncing ${updateCount} score updates to Firebase...`);

        try {
            const batch = firestore.batch();

            for (const [uid, scoreDelta] of this.pendingScoreUpdates) {
                const player = gameState.players.get(uid);

                if (player) {
                    const scoreRef = firestore.collection('scores').doc(uid);

                    batch.set(scoreRef, {
                        name: player.name,
                        avatar: player.avatarUrl || '',
                        points: admin.firestore.FieldValue.increment(scoreDelta),
                        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                        gamesPlayed: admin.firestore.FieldValue.increment(1)
                    }, { merge: true });
                }
            }

            await batch.commit();

            console.log(`✅ Firebase sync successful: ${updateCount} players updated`);

            this.pendingScoreUpdates.clear();
            this.lastSyncTime = timestamp;
            this.totalSyncs++;
            this.syncErrors = 0;

        } catch (error) {
            console.error(`❌ Firebase sync failed:`, error.message);
            this.syncErrors++;

            // Don't clear pending updates - will retry next interval
            // But if too many errors, clear to prevent infinite growth
            if (this.syncErrors > 5) {
                console.warn('⚠️ Too many sync errors, clearing pending updates');
                this.pendingScoreUpdates.clear();
                this.syncErrors = 0;
            }
        } finally {
            this.syncing = false;
        }
    }

    /**
     * Start automatic sync interval
     */
    startAutoSync(firestore, gameState) {
        setInterval(() => {
            this.syncScoresToFirebase(firestore, gameState);
        }, config.FIREBASE_SYNC_INTERVAL);

        console.log(`📊 Firebase auto-sync started (${config.FIREBASE_SYNC_INTERVAL / 1000}s interval)`);
    }

    /**
     * Get sync statistics
     */
    getStats() {
        return {
            pendingUpdates: this.pendingScoreUpdates.size,
            lastSyncTime: this.lastSyncTime,
            timeSinceLastSync: Date.now() - this.lastSyncTime,
            totalSyncs: this.totalSyncs,
            syncErrors: this.syncErrors,
            syncing: this.syncing
        };
    }

    /**
     * Force immediate sync
     */
    async forceSync(firestore, gameState) {
        console.log('🔄 Force syncing scores...');
        await this.syncScoresToFirebase(firestore, gameState);
    }
}

// Singleton instance
const firebaseSyncManager = new FirebaseSyncManager();

module.exports = { firebaseSyncManager, FirebaseSyncManager };

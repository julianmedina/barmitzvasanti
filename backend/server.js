const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const gameState = require('./gameState');
const { setupSocketHandlers } = require('./socketHandlers');
const { startGameLoop } = require('./gameLoop');
const { memoryManager } = require('./memoryManager');
const { firebaseSyncManager } = require('./firebaseSyncManager');

// Initialize Express
const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
    credentials: true
}));

app.use(express.json());

// Initialize Firebase Admin
console.log("Starting Firebase Admin initialization...");
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    console.log("Service account parsed successfully.");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized.");
} catch (e) {
    console.error("FAILED to initialize Firebase Admin:", e);
}

const firestore = admin.firestore();

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
        methods: ['GET', 'POST']
    }
});

// Setup Socket.IO event handlers
setupSocketHandlers(io, firestore);

// Start game loop (50ms tick for 20 TPS)
startGameLoop(io);

// Start memory manager (30s cleanup)
memoryManager.startAutoCleanup();

// Start Firebase score sync (60s interval)
firebaseSyncManager.startAutoSync(firestore, gameState);

// REST API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/game/status', (req, res) => {
    const state = gameState.getGameState();
    const playerCount = gameState.getPlayerCount();
    const memStats = memoryManager.getStats();
    const syncStats = firebaseSyncManager.getStats();

    res.json({
        session: state.session,
        playerCount,
        remainingDots: state.remainingDots,
        memory: memStats,
        firebaseSync: syncStats
    });
});

// Memory stats endpoint
app.get('/api/admin/memory', (req, res) => {
    res.json(memoryManager.getStats());
});

// Force memory cleanup
app.post('/api/admin/cleanup', (req, res) => {
    memoryManager.runCleanup();
    res.json({ success: true, message: 'Cleanup completed' });
});

// Force Firebase sync
app.post('/api/admin/sync', async (req, res) => {
    await firebaseSyncManager.forceSync(firestore, gameState);
    res.json({ success: true, message: 'Sync completed' });
});

app.post('/api/game/start', (req, res) => {
    gameState.startGame();
    gameState.addEvent('system', 'Nueva partida iniciada');

    // Broadcast to all clients
    io.emit('game_started', {
        worldSeed: gameState.gameSession.worldSeed,
        startedAt: gameState.gameSession.startedAt
    });

    res.json({ success: true, session: gameState.gameSession });
});

app.post('/api/game/reset', (req, res) => {
    gameState.resetGame();
    io.emit('game_reset');
    res.json({ success: true });
});

app.get('/api/reentry-video', async (req, res) => {
    try {
        // Query Firebase for enabled re-entry videos
        const videosSnapshot = await firestore
            .collection('reentry_videos')
            .where('enabled', '==', true)
            .get();

        if (videosSnapshot.empty) {
            return res.status(404).json({ error: 'No videos available' });
        }

        // Pick random video
        const videos = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const randomVideo = videos[Math.floor(Math.random() * videos.length)];

        res.json(randomVideo);
    } catch (error) {
        console.error('Error fetching re-entry video:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Pacman Backend running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🔥 Firebase connected`);
});

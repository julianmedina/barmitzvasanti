const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const path = require('path');
const os = require('os');
const fs = require('fs');
const axios = require('axios');

admin.initializeApp();

// ... existing code ... (syncToDrive and notifyNewHomenaje)

/**
 * Trigger: On Homenaje Updated - v2
 */
exports.notifyUnlockedHomenaje = onDocumentUpdated({
    document: 'homenajes/{id}'
}, async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // Check if it was locked and is now unlocked
    if (beforeData.locked && !afterData.locked) {
        try {
            const tokensSnapshot = await admin.firestore().collection('tokens').get();
            const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

            if (tokens.length === 0) return;

            const messages = tokens.map(token => ({
                to: token,
                sound: 'default',
                title: '🎥 ¡Nuevo Homenaje!',
                body: `¡Se acaba de desbloquear: ${afterData.title}!`,
                data: { url: '/social/homenajes' },
            }));

            await axios.post('https://exp.host/--/api/v2/push/send', messages);
            console.log(`Sent ${messages.length} notifications for unlocked homenaje`);
        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    }
});

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const TARGET_FOLDER_ID = '1MOfze1ttd74aF7sWaRcDwPDy_wtONRGx';

/**
 * Trigger: On Firestore Create (Collection 'media') - v2
 */
exports.syncToDrive = onDocumentCreated({
    document: 'media/{mediaId}'
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data associated with the event');
        return;
    }

    const data = snapshot.data();
    const mediaId = event.params.mediaId;
    const imageUrl = data.url;
    const section = data.section || 'general';
    const userId = data.userId || 'anonymous';

    const fileName = `${section}_${userId}_${mediaId}.jpg`;

    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.error('ERROR: service-account.json not found.');
        return;
    }

    try {
        // 1. Setup Google Drive API
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_PATH,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        const drive = google.drive({ version: 'v3', auth });

        // 2. Download file
        const tempFilePath = path.join(os.tmpdir(), fileName);
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // 3. Upload to Drive
        const fileMetadata = {
            name: fileName,
            parents: [TARGET_FOLDER_ID],
        };
        const media = {
            mimeType: 'image/jpeg',
            body: fs.createReadStream(tempFilePath),
        };

        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        const driveFileId = driveResponse.data.id;
        console.log(`Successfully synced ${mediaId} to Drive: ${driveFileId}`);

        // 4. Update Firestore
        await snapshot.ref.update({
            driveId: driveFileId,
            synced: true,
            syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        fs.unlinkSync(tempFilePath);

    } catch (error) {
        console.error('Error syncing to Drive:', error);
        await snapshot.ref.update({
            synced: false,
            syncError: error.message
        });
    }
});

/**
 * Trigger: On Homenaje Created - v2
 */
exports.notifyNewHomenaje = onDocumentCreated({
    document: 'homenajes/{id}'
}, async (event) => {
    const data = event.data.data();
    if (data.locked) return; // Only notify if it's unlocked by default

    try {
        const tokensSnapshot = await admin.firestore().collection('tokens').get();
        const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

        if (tokens.length === 0) return;

        const messages = tokens.map(token => ({
            to: token,
            sound: 'default',
            title: '🎥 ¡Nuevo Homenaje!',
            body: `Se desbloqueó: ${data.title}`,
            data: { url: '/social/homenajes' },
        }));

        // Send via Expo Push API
        await axios.post('https://exp.host/--/api/v2/push/send', messages);
        console.log(`Sent ${messages.length} notifications for new homenaje`);

    } catch (error) {
        console.error('Error sending notifications:', error);
    }
});

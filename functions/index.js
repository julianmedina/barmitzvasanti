const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const path = require('path');
const os = require('os');
const fs = require('fs');
const axios = require('axios');

admin.initializeApp();

/** ID de la carpeta de Drive del Book por defecto (podés cambiarla desde el admin). */
const DEFAULT_BOOK_DRIVE_FOLDER_ID = '1cslGcbl0hvEky2mShf4-9Z6DvEJ2lLrJ';

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

// Configuration — carpeta de Drive donde se copian las fotos subidas (media)
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const TARGET_FOLDER_ID = '1EJdugtyNRLkH0S-myVIPq9OyM73NZfdM';

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
    const fileUrl = data.url;
    const section = data.section || 'general';
    const userId = data.userId || 'anonymous';
    const mimeType = data.mimeType || (fileUrl && fileUrl.toLowerCase().includes('.mp4') ? 'video/mp4' : 'image/jpeg');
    const isVideo = mimeType.startsWith('video/');
    const ext = isVideo ? '.mp4' : '.jpg';
    const fileName = `${section}_${userId}_${mediaId}${ext}`;

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
            url: fileUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // 3. Upload to Drive (image or video)
        const fileMetadata = {
            name: fileName,
            parents: [TARGET_FOLDER_ID],
        };
        const media = {
            mimeType: mimeType,
            body: fs.createReadStream(tempFilePath),
        };

        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        const driveFileId = driveResponse.data.id;
        console.log(`Successfully synced ${mediaId} (${isVideo ? 'video' : 'image'}) to Drive: ${driveFileId}`);

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

/**
 * Lista archivos de una carpeta de Google Drive (Book) y guarda las URLs en configs/book_photos.
 * La carpeta debe estar compartida con el email del service account (client_email del JSON).
 * Scope: drive.readonly para poder listar archivos en carpetas compartidas.
 */
const SERVICE_ACCOUNT_PATH_BOOK = path.join(__dirname, 'service-account.json');

exports.syncBookFromDriveFolder = onCall(async (request) => {
    const folderId = request.data?.folderId || DEFAULT_BOOK_DRIVE_FOLDER_ID;
    if (!folderId || typeof folderId !== 'string') {
        throw new HttpsError('invalid-argument', 'folderId is required');
    }

    if (!fs.existsSync(SERVICE_ACCOUNT_PATH_BOOK)) {
        console.error('syncBookFromDriveFolder: service-account.json not found');
        throw new HttpsError('failed-precondition', 'Service account not configured');
    }

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_PATH_BOOK,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        const drive = google.drive({ version: 'v3', auth });

        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            orderBy: 'name',
            pageSize: 100,
            fields: 'files(id, name, mimeType)',
        });

        const files = (res.data.files || [])
            .filter((f) => f.mimeType && f.mimeType.startsWith('image/'))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const urls = files.map((f) => `https://drive.google.com/uc?export=view&id=${f.id}`);

        const { getFirestore } = require('firebase-admin/firestore');
        const db = getFirestore(admin.app(), 'barmitzvamedina');
        await db.collection('configs').doc('book_photos').set({
            value: urls,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`syncBookFromDriveFolder: saved ${urls.length} photo URLs from folder ${folderId}`);
        return { success: true, count: urls.length };
    } catch (err) {
        console.error('syncBookFromDriveFolder error:', err);
        if (err.code === 404 || (err.message && err.message.includes('File not found'))) {
            throw new HttpsError('not-found', 'Carpeta no encontrada o sin acceso. Compartí la carpeta con el email del service account.');
        }
        throw new HttpsError('internal', err.message || 'Error al listar la carpeta de Drive');
    }
});

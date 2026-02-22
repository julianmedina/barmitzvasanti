/**
 * BACKEND CLOUD FUNCTION (Node.js)
 *
 * Instructions:
 * 1. Deploy this to Firebase Cloud Functions (or Vercel).
 * 2. Create a Service Account in Google Cloud Console with "Google Drive API" enabled.
 * 3. Download the JSON key and save it as 'service-account.json' next to this file.
 * 4. Share your target Google Drive Folder with the client_email from the JSON.
 */

const { google } = require('googleapis');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp();

// Configuration
const SERVICE_ACCOUNT_PATH = './service-account.json';
const TARGET_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';

const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Trigger: On Firestore Create (Collection 'media')
 * When the App uploads a photo to Firestore/Storage, this runs.
 */
exports.uploadToDrive = functions.firestore
    .document('media/{mediaId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const imageUrl = data.url; // URL from Firebase Storage
        const fileName = `medina_bar_mitzva_${context.params.mediaId}.jpg`;

        try {
            // 1. Download file from Firebase Storage (or use the buffer directly if triggered by Storage)
            // For simplicity, assuming we have the file buffer or downloading it here.

            // 2. Upload to Drive
            const fileMetadata = {
                name: fileName,
                parents: [TARGET_FOLDER_ID],
            };

            const media = {
                mimeType: 'image/jpeg',
                body: fs.createReadStream('/tmp/temp_image.jpg'), // Placeholder for downloaded stream
            };

            const response = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });

            console.log('File Id:', response.data.id);

            // 3. Mark in Firestore that it was synced
            return snap.ref.set({ driveId: response.data.id, synced: true }, { merge: true });

        } catch (error) {
            console.error('Error uploading to Drive:', error);
            return null; // Handle error
        }
    });

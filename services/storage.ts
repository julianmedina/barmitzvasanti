import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebaseConfig';

/**
 * Uploads a file to Firebase Storage with a structured path
 * @param uri The local URI of the file
 * @param section The category (camera, profile, etc.)
 * @param userId The UID of the user
 * @returns The download URL of the uploaded file
 */
export const uploadMedia = async (uri: string, section: string, userId: string): Promise<string> => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();

        const timestamp = new Date().getTime();
        const fileName = `${userId}_${timestamp}.jpg`;
        const storagePath = `media/${section}/${userId}/${fileName}`;

        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);

        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (e) {
        console.error("Error in uploadMedia:", e);
        throw e;
    }
};

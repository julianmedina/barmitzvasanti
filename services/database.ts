import { File as ExpoFile } from 'expo-file-system';
import {
    addDoc, collection,
    deleteDoc,
    doc,
    getDocs,
    increment,
    limit, onSnapshot, orderBy, query,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Platform } from 'react-native';
import { auth, db, storage } from './firebaseConfig';

export const isNameTaken = async (name: string) => {
    const q = query(collection(db, 'scores'), where('name', '==', name), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
};
export { auth, db, storage };

// Sanitizer to avoid Firebase "unsupported field value: undefined" errors
const sanitize = (data: any) => {
    const clean: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) clean[key] = data[key];
    });
    return clean;
};

// Types
export interface UserScore {
    id?: string; // This will be the UID
    name: string;
    points: number;
    avatar?: string;
}

export interface SocialMessage {
    id?: string;
    text: string;
    userId: string;
    visible: boolean;
    timestamp: any;
}

export interface NewsAlert {
    id?: string;
    type: 'URGENTE' | 'ULTIMO MOMENTO' | 'ALERTA' | 'INFO';
    text: string;
    visible?: boolean;
    timestamp: any;
}

export interface HomenajeItem {
    id?: string;
    title: string;
    description?: string;
    youtubeId: string;
    locked: boolean;
    order: number;
    timestamp: any;
}

export interface UserProfile {
    id: string; // Document ID = UID
    name?: string;
    avatar?: string;
    metWhere?: string;
    friendDuration?: string;
    pointsAwarded?: boolean;
    updatedAt: any;
}

export interface MediaMetadata {
    id?: string;
    url: string;
    section: 'camera' | 'profile' | 'general';
    userId: string;
    timestamp: any;
    synced: boolean;
    driveId?: string;
}

export interface AppConfig {
    id: string; // The config key, e.g., 'branding'
    value: any;
}

// Trivia
export interface TriviaQuestion {
    id?: string;
    question: string;
    options: string[]; // 4 options
    correctIndex: number; // 0-3
    order: number;
    timestamp?: any;
}

export interface TriviaVideo {
    id?: string;
    /** YouTube video ID (recomendado: estable, sin límites de uso). */
    youtubeId?: string;
    /** Google Drive file ID (legacy; si hay youtubeId se usa ese). */
    driveFileId?: string;
    name?: string;
    order: number;
    /** Si false, no se muestra en la trivia (ej. para ocultar antes del evento). Por defecto true. */
    visible?: boolean;
    timestamp?: any;
}

// 1. Leaderboard / Scores (Cumulative)
export const updatePlayerScore = async (points: number, name?: string, avatar?: string) => {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const scoreRef = doc(db, 'scores', user.uid);

        // Prepare data to merge
        const data: any = {
            points: increment(points),
            timestamp: new Date()
        };

        if (name) data.name = name;
        if (avatar) data.avatar = avatar;

        // Use setDoc with merge to create or update
        await setDoc(scoreRef, sanitize(data), { merge: true });
    } catch (e) {
        console.error("Error updating score", e);
    }
};

export const subscribeToLeaderboard = (callback: (data: UserScore[]) => void) => {
    // Fetch top 30 to allow for paging/scrolling in dashboard
    const q = query(collection(db, 'scores'), orderBy('points', 'desc'), limit(30));
    return onSnapshot(q, (snapshot) => {
        const scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserScore));
        callback(scores);
    });
};

export const resetRanking = async () => {
    try {
        const q = query(collection(db, 'scores'));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (e) {
        console.error("Error resetting ranking", e);
        throw e;
    }
};

// 2. Social Messages (Santi no es Santi)
export const sendMessage = async (text: string) => {
    try {
        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'messages'), {
            text,
            userId: user.uid,
            visible: true,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Error sending message", e);
    }
};

export const updateMessage = async (id: string, updates: Partial<SocialMessage>) => {
    try {
        const docRef = doc(db, 'messages', id);
        await updateDoc(docRef, sanitize(updates));
    } catch (e) {
        console.error("Error updating message", e);
    }
};

export const subscribeToMessages = (callback: (msgs: SocialMessage[]) => void) => {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(20));
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialMessage));
        callback(msgs);
    });
};

export const deleteMessage = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'messages', id));
    } catch (e) {
        console.error("Error deleting message", e);
    }
};

// 3. Homenajes Management
export const addHomenaje = async (homenaje: Omit<HomenajeItem, 'id' | 'timestamp'>) => {
    try {
        console.log("Firestore: Adding homenaje...", homenaje);
        const docRef = await addDoc(collection(db, 'homenajes'), sanitize({
            ...homenaje,
            timestamp: new Date()
        }));
        console.log("Firestore: Homenaje added with ID:", docRef.id);
    } catch (e) {
        console.error("Firestore Error adding homenaje:", e);
        throw e;
    }
};

export const updateHomenaje = async (id: string, updates: Partial<HomenajeItem>) => {
    if (!id) {
        console.error("updateHomenaje: id is required");
        throw new Error("Falta el ID del homenaje");
    }
    const { id: _id, timestamp: _ts, ...rest } = updates as Partial<HomenajeItem> & { id?: string; timestamp?: unknown };
    const data = sanitize(rest);
    if (Object.keys(data).length === 0) {
        console.warn("updateHomenaje: no fields to update");
        return;
    }
    try {
        const docRef = doc(db, 'homenajes', id);
        await updateDoc(docRef, data);
    } catch (e: any) {
        console.error("Error updating homenaje", e);
        const msg = e?.message ?? (e?.code === 'permission-denied' ? 'Sin permiso. Revisá las reglas de Firestore.' : 'No se pudo actualizar.');
        throw new Error(msg);
    }
};

export const deleteHomenaje = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'homenajes', id));
    } catch (e) {
        console.error("Error deleting homenaje", e);
    }
};

export const subscribeToHomenajes = (callback: (items: HomenajeItem[]) => void) => {
    console.log("Firestore: Subscribing to homenajes...");
    const q = query(collection(db, 'homenajes'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as HomenajeItem));
        console.log(`Firestore: Received ${items.length} homenajes`);
        callback(items);
    }, (error) => {
        console.error("Firestore Subscription Error (Homenajes):", error);
    });
};

// 4. News Feed
export const addNews = async (type: NewsAlert['type'], text: string) => {
    try {
        await addDoc(collection(db, 'news'), sanitize({
            type,
            text,
            visible: true,
            timestamp: new Date()
        }));
    } catch (e) {
        console.error("Error adding news", e);
        throw e; // Rethrow to let UI handle it
    }
};

export const updateNews = async (newsId: string, updates: Partial<NewsAlert>) => {
    try {
        await updateDoc(doc(db, 'news', newsId), sanitize(updates));
    } catch (e) {
        console.error("Error updating news", e);
    }
};

export const deleteNews = async (newsId: string) => {
    try {
        await deleteDoc(doc(db, 'news', newsId));
    } catch (e) {
        console.error("Error deleting news", e);
    }
};

export const subscribeToNews = (callback: (news: NewsAlert[]) => void) => {
    const q = query(collection(db, 'news'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsAlert));
        callback(news);
    });
};

// 5. User Profiles
export const saveUserProfile = async (profileData: Partial<Omit<UserProfile, 'id' | 'updatedAt'>>) => {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const profileRef = doc(db, 'profiles', user.uid);
        await setDoc(profileRef, sanitize({
            ...profileData,
            updatedAt: new Date()
        }), { merge: true });
    } catch (e) {
        console.error("Error saving user profile", e);
        throw e;
    }
};

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
    const profileRef = doc(db, 'profiles', uid);
    return onSnapshot(profileRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() } as UserProfile);
        } else {
            callback(null);
        }
    });
};

export const subscribeToAllProfiles = (callback: (profiles: UserProfile[]) => void) => {
    const q = query(collection(db, 'profiles'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        callback(profiles);
    });
};

// 6. Media Metadata
export const saveMediaMetadata = async (media: Omit<MediaMetadata, 'id' | 'synced' | 'timestamp'>) => {
    try {
        const docRef = await addDoc(collection(db, 'media'), sanitize({
            ...media,
            synced: false,
            timestamp: new Date()
        }));
        return docRef.id;
    } catch (e) {
        console.error("Error saving media metadata", e);
        throw e;
    }
};

export const subscribeToMedia = (callback: (media: MediaMetadata[]) => void) => {
    const q = query(collection(db, 'media'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaMetadata));
        callback(items);
    });
};

export const deleteMedia = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'media', id));
    } catch (e) {
        console.error("Error deleting media", e);
    }
};

// 7. Global Configs
export const saveConfig = async (id: string, value: any) => {
    try {
        await setDoc(doc(db, 'configs', id), { value, updatedAt: new Date() });
    } catch (e) {
        console.error("Error saving config", e);
    }
};

export const subscribeToConfigs = (callback: (configs: Record<string, any>) => void) => {
    return onSnapshot(collection(db, 'configs'), (snapshot) => {
        const configs: Record<string, any> = {};
        snapshot.docs.forEach(doc => {
            configs[doc.id] = doc.data().value;
        });
        callback(configs);
    });
};

// 8. Storage Helpers
export const uploadMediaFile = async (uri: string, path: string): Promise<string> => {
    try {
        console.log(`Uploading file from ${uri} to ${path}...`);

        let blob: Blob;
        if (Platform.OS === 'web') {
            const response = await fetch(uri);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            blob = await response.blob();
        } else if (uri.startsWith('file://')) {
            // En iOS/Android fetch(file://) suele fallar; usar expo-file-system (File implementa Blob)
            const file = new ExpoFile(uri);
            blob = file as unknown as Blob;
        } else {
            const response = await fetch(uri);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            blob = await response.blob();
        }

        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, blob);
        const downloadUrl = await getDownloadURL(fileRef);
        console.log(`Upload complete! URL: ${downloadUrl}`);
        return downloadUrl;
    } catch (e) {
        console.error("Error in uploadMediaFile:", e);
        throw e;
    }
};

// 9. Push Notifications
export const savePushToken = async (token: string) => {
    try {
        const user = auth.currentUser;
        if (!user) return;
        await setDoc(doc(db, 'tokens', user.uid), {
            token,
            platform: Platform.OS,
            updatedAt: new Date()
        });
    } catch (e) {
        console.error("Error saving push token", e);
    }
};

// 10. Trivia Questions
export const addTriviaQuestion = async (q: Omit<TriviaQuestion, 'id' | 'timestamp'>) => {
    try {
        await addDoc(collection(db, 'trivia_questions'), sanitize({
            ...q,
            timestamp: new Date()
        }));
    } catch (e) {
        console.error("Error adding trivia question", e);
        throw e;
    }
};

export const updateTriviaQuestion = async (id: string, updates: Partial<TriviaQuestion>) => {
    try {
        await updateDoc(doc(db, 'trivia_questions', id), sanitize(updates));
    } catch (e) {
        console.error("Error updating trivia question", e);
    }
};

export const deleteTriviaQuestion = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'trivia_questions', id));
    } catch (e) {
        console.error("Error deleting trivia question", e);
    }
};

export const subscribeToTriviaQuestions = (callback: (questions: TriviaQuestion[]) => void) => {
    const q = query(collection(db, 'trivia_questions'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TriviaQuestion));
        callback(items);
    });
};

export const getTriviaQuestionsOnce = async (): Promise<TriviaQuestion[]> => {
    const q = query(collection(db, 'trivia_questions'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TriviaQuestion));
};

// 11. Trivia Videos (Google Drive references)
export const addTriviaVideo = async (v: Omit<TriviaVideo, 'id' | 'timestamp'>) => {
    try {
        await addDoc(collection(db, 'trivia_videos'), sanitize({
            ...v,
            timestamp: new Date()
        }));
    } catch (e) {
        console.error("Error adding trivia video", e);
        throw e;
    }
};

export const updateTriviaVideo = async (id: string, updates: Partial<TriviaVideo>) => {
    try {
        await updateDoc(doc(db, 'trivia_videos', id), sanitize(updates));
    } catch (e) {
        console.error("Error updating trivia video", e);
    }
};

export const deleteTriviaVideo = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'trivia_videos', id));
    } catch (e) {
        console.error("Error deleting trivia video", e);
    }
};

export const subscribeToTriviaVideos = (callback: (videos: TriviaVideo[]) => void) => {
    const q = query(collection(db, 'trivia_videos'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TriviaVideo));
        callback(items);
    });
};

export const getTriviaVideosOnce = async (): Promise<TriviaVideo[]> => {
    const q = query(collection(db, 'trivia_videos'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TriviaVideo));
};

/** Prefer YouTube; fallback Drive. Returns { type, youtubeId? } or { type, url? } for playback. */
export function getTriviaVideoPlayback(v: TriviaVideo): { type: 'youtube'; youtubeId: string } | { type: 'drive'; url: string } | null {
    const id = (v.youtubeId || '').trim();
    if (id) return { type: 'youtube', youtubeId: id };
    const driveId = (v.driveFileId || '').trim();
    if (driveId && driveId !== 'REEMPLAZAR') return { type: 'drive', url: `https://drive.google.com/uc?export=download&id=${driveId}` };
    return null;
}

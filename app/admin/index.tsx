import { Colors, Fonts } from '@/constants/theme';
import {
    HomenajeItem,
    MediaMetadata,
    Mission,
    NewsAlert,
    SocialMessage,
    TriviaQuestion,
    TriviaVideo,
    UserProfile,
    addHomenaje,
    addMission,
    addNews,
    addTriviaQuestion,
    addTriviaVideo,
    auth,
    deleteHomenaje,
    deleteMedia,
    deleteMessage,
    deleteMission,
    deleteNews,
    deleteTriviaQuestion,
    deleteTriviaVideo,
    resetRanking,
    saveConfig,
    subscribeToAllProfiles,
    subscribeToConfigs,
    subscribeToHomenajes,
    subscribeToMedia,
    subscribeToMessages,
    subscribeToMissions,
    subscribeToNews,
    subscribeToTriviaQuestions,
    subscribeToTriviaVideos,
    syncBookFromDriveFolder,
    updateHomenaje,
    updateMedia,
    updateMessage,
    updateMission,
    updateNews,
    updateTriviaQuestion,
    updateTriviaVideo
} from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import { signInAnonymously } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

type AdminView = 'MENU' | 'CONFIG' | 'NEWS' | 'HOMENAJES' | 'MESSAGES' | 'PROFILES' | 'MEDIA' | 'TRIVIA' | 'MISIONES' | 'DANGER';

const TRIVIA_SEED_QUESTIONS: Omit<TriviaQuestion, 'id' | 'timestamp'>[] = [
    { question: '¿De qué cuadro es Medina?', options: ['Boca', 'River', 'Atlanta', 'Racing'], correctIndex: 1, order: 0 },
    { question: '¿Cuál es su comida favorita?', options: ['Sushi', 'Asado', 'Milanesa con Puré', 'Fideos con Tuco'], correctIndex: 2, order: 1 },
    { question: '¿En qué posición juega al fútbol?', options: ['Arquero', 'Defensor', 'Mediocampista', 'Delantero'], correctIndex: 1, order: 2 },
    { question: '¿Cuál es su materia preferida en el colegio?', options: ['Matemática', 'Gimnasia', 'Historia', 'Recreo'], correctIndex: 3, order: 3 },
];

const TRIVIA_SEED_VIDEOS: { name: string; order: number; youtubeId?: string }[] = [
    { name: 'Short 1', order: 0, youtubeId: 'WjMbH6RSMFc' },
    { name: 'Short 2', order: 1, youtubeId: '-KbKlrb3sn0' },
    { name: 'Short 3', order: 2, youtubeId: '9LsTK-rp8wE' },
    { name: 'Short 4', order: 3, youtubeId: 'B72ihL1LKrk' },
    { name: 'Short 5', order: 4, youtubeId: 'vovAE0FrAh4' },
    { name: 'Short 6', order: 5, youtubeId: '-bRLWfznUPs' },
    { name: 'Short 7', order: 6, youtubeId: 'TIVlHFpoLsk' },
    { name: 'Short 8', order: 7, youtubeId: '0E5ouMxqfEA' },
];

const MISSION_SEED: Omit<Mission, 'id' | 'timestamp'>[] = [
    { title: 'Invitar a un primo de Santi y sacarse una foto', description: 'Encontrá un primo de Santi y sacate una foto juntos.', type: 'familiar', icon: '👨‍👦', order: 0, active: true, points: 100 },
    { title: 'Sacarse una Selfie con el Tío más gracioso de Santi', description: 'Buscá al tío más divertido y sacate una selfie.', type: 'tío', icon: '😄', order: 1, active: true, points: 100 },
    { title: 'Subí una foto con 3 amigos', description: 'Juntate con 3 amigos y subí la foto.', type: 'amigos', icon: '👥', order: 2, active: true, points: 100 },
    { title: 'Sacate una foto con un amigo de Buber', description: 'Encontrá a un amigo de Buber y sacate una foto.', type: 'amigo', icon: '🤝', order: 3, active: true, points: 100 },
    { title: 'Filma un video mandándole un saludo a Santi', description: 'Grabá un video corto saludando a Santi.', type: 'video', icon: '🎥', order: 4, active: true, points: 150 },
    { title: 'Hacé la mejor cara de "me olvidé el regalo" y sacate una foto', description: 'Poné cara de olvido y sacate la foto.', type: 'divertido', icon: '😱', order: 5, active: true, points: 80 },
    { title: 'Buscá a alguien que se parezca a Santi y sacate una selfie', description: 'Encontrá al doble de Santi en la fiesta.', type: 'divertido', icon: '🕵️', order: 6, active: true, points: 120 },
    { title: 'Grabá un video cantando el feliz cumple en falsete', description: 'Cantá el feliz cumple con la voz más graciosa posible.', type: 'video', icon: '🎤', order: 7, active: true, points: 100 },
    { title: 'Sacate una foto abrazando a la abuela más copada de la fiesta', description: 'Dale un abrazo a la abu y sacate la foto.', type: 'familiar', icon: '🧓', order: 8, active: true, points: 100 },
    { title: 'Encontrá al que más grita "Medina" y sacate una foto con él/ella', description: 'Buscá al fan número uno de Medina.', type: 'amigos', icon: '📢', order: 9, active: true, points: 100 },
    { title: 'Imitá el baile de Santi y que alguien te filme', description: 'Copiá su baile y que te graben.', type: 'video', icon: '💃', order: 10, active: true, points: 150 },
    { title: 'Sacate una foto con 5 personas haciendo la "M" de Medina con las manos', description: 'Armá la M con las manos entre 5 personas.', type: 'amigos', icon: '✋', order: 11, active: true, points: 120 },
    { title: 'Mandale un saludo en video a Santi diciendo una palabra inventada', description: 'Inventá una palabra y decila en el video.', type: 'video', icon: '🗣️', order: 12, active: true, points: 80 },
    { title: 'Sacate una selfie con el plato más raro que veas en el buffet', description: 'Encontrá el plato más raro y sacate la selfie.', type: 'divertido', icon: '🍽️', order: 13, active: true, points: 80 },
    { title: 'Filmá a un amigo haciendo un gol (de mentira) y festejando como en la cancha', description: 'Que tu amigo haga el gol y festeje a lo River.', type: 'video', icon: '⚽', order: 14, active: true, points: 100 },
    { title: 'Sacate una foto con el que mejor cante', description: 'Encontrá al karaoke de la fiesta y sacate la foto.', type: 'divertido', icon: '🎙️', order: 15, active: true, points: 80 },
    { title: 'Grabá un video diciendo "Santi, te queremos" en cámara lenta', description: 'Dilo en cámara lenta, tipo película.', type: 'video', icon: '🎬', order: 16, active: true, points: 100 },
    { title: 'Sacate una foto con dos tíos haciendo la misma cara', description: 'Que dos tíos pongan la misma cara y sacate la foto.', type: 'familiar', icon: '😜', order: 17, active: true, points: 100 },
    { title: 'Encontrá a alguien con la misma remera que vos y sacate una selfie', description: 'Busca tu gemelo de outfit.', type: 'divertido', icon: '👕', order: 18, active: true, points: 80 },
    { title: 'Filmá a alguien contando el chiste más malo de la noche', description: 'El chiste más malo gana.', type: 'video', icon: '😂', order: 19, active: true, points: 100 },
    { title: 'Sacate una foto con la persona que más lejos viajó para estar acá', description: 'Preguntá y encontrá al que vino de más lejos.', type: 'amigos', icon: '✈️', order: 20, active: true, points: 100 },
    { title: 'Grabá un video haciendo la ola con 5 personas', description: 'Armá la ola y que alguien lo filme.', type: 'video', icon: '🌊', order: 21, active: true, points: 120 },
    { title: 'Sacate una selfie con quien tenga el celular más viejo', description: 'Buscá el Nokia o el cel más antiguo.', type: 'divertido', icon: '📱', order: 22, active: true, points: 80 },
    { title: 'Sacate una foto con tres generaciones (abuelo, padre, hijo)', description: 'Tres generaciones en una foto.', type: 'familiar', icon: '👴', order: 23, active: true, points: 120 },
    { title: 'Filmá a un amigo intentando decir "Bar Mitzva de Medina" 5 veces rápido', description: 'Que lo diga 5 veces sin trabarse.', type: 'video', icon: '🗣️', order: 24, active: true, points: 80 },
    { title: 'Encontrá al que tenga el número de Santi y sacate una foto con él/ella', description: 'El que tiene el contacto de Santi.', type: 'amigos', icon: '📞', order: 25, active: true, points: 100 },
    { title: 'Sacate una foto con alguien que esté bailando solo', description: 'El que baila sin pareja.', type: 'divertido', icon: '🕺', order: 26, active: true, points: 80 },
    { title: 'Grabá un video de alguien brindando en idioma inventado', description: 'Brindis en idioma que no exista.', type: 'video', icon: '🥂', order: 27, active: true, points: 100 },
    { title: 'Sacate una foto con la torta antes de que la corten', description: 'La torta intacta, con vos al lado.', type: 'divertido', icon: '🎂', order: 28, active: true, points: 80 },
    { title: 'Filmá a dos personas haciendo piedra-papel-tijera por el último pedazo de torta', description: 'Duelo por la torta.', type: 'video', icon: '✂️', order: 29, active: true, points: 100 },
    { title: 'Sacate una selfie con quien lleve la corbata más llamativa', description: 'La corbata más loca de la fiesta.', type: 'divertido', icon: '👔', order: 30, active: true, points: 80 },
    { title: 'Sacate una foto con 4 personas haciendo forma de torre', description: 'Apilados o en forma de torre humana.', type: 'amigos', icon: '🗼', order: 31, active: true, points: 120 },
    { title: 'Grabá un video saludando a Santi como si fuera noticiero', description: 'Estilo presentador de noticias.', type: 'video', icon: '📺', order: 32, active: true, points: 100 },
    { title: 'Encontrá a alguien que haya ido al jardín con Santi y sacate una foto', description: 'Amigo de la infancia.', type: 'familiar', icon: '🧒', order: 33, active: true, points: 100 },
    { title: 'Sacate una selfie con el zapato más roto o más gastado de la fiesta', description: 'El zapato que ya cumplió.', type: 'divertido', icon: '👟', order: 34, active: true, points: 80 },
    { title: 'Filmá a alguien haciendo la coreo de una canción que pongan', description: 'Que baile la coreo de la música que suene.', type: 'video', icon: '💿', order: 35, active: true, points: 100 },
    { title: 'Sacate una foto con quien tenga más años de amistad con Santi', description: 'El amigo más viejo de Santi.', type: 'amigos', icon: '🤝', order: 36, active: true, points: 100 },
    { title: 'Grabá un video diciendo "Feliz Bar Mitzva" como robot', description: 'Voz de robot.', type: 'video', icon: '🤖', order: 37, active: true, points: 80 },
    { title: 'Sacate una foto con la persona más dormilona de la fiesta', description: 'El que ya tiene sueño.', type: 'divertido', icon: '😴', order: 38, active: true, points: 80 },
    { title: 'Sacate una selfie con dos personas que no se conozcan y presentalos', description: 'Hacé de cupido y presentá a dos que no se conocen.', type: 'amigos', icon: '💕', order: 39, active: true, points: 100 },
    { title: 'Filmá a un amigo intentando no reírse por 10 segundos', description: 'Que no se ría mientras le hacés caras.', type: 'video', icon: '😏', order: 40, active: true, points: 100 },
    { title: 'Sacate una foto con el regalo más grande que veas', description: 'El regalo más enorme.', type: 'divertido', icon: '🎁', order: 41, active: true, points: 80 },
    { title: 'Grabá un video de alguien haciendo el gesto de gol de River', description: 'El gesto de gol, bien River.', type: 'video', icon: '⚽', order: 42, active: true, points: 100 },
    { title: 'Sacate una foto con tres personas que se llamen igual', description: 'Tres con el mismo nombre.', type: 'divertido', icon: '👥', order: 43, active: true, points: 120 },
    { title: 'Encontrá al que más fotos se sacó en la fiesta y sacate una con él/ella', description: 'El fanático de las selfies.', type: 'amigos', icon: '📸', order: 44, active: true, points: 80 },
    { title: 'Filmá un brindis grupal diciendo el nombre completo de Santi', description: 'Todos brindando y diciendo su nombre completo.', type: 'video', icon: '🥃', order: 45, active: true, points: 120 },
    { title: 'Sacate una selfie con quien tenga el peinado más alto', description: 'El peinado más alto de la noche.', type: 'divertido', icon: '💇', order: 46, active: true, points: 80 },
    { title: 'Sacate una foto con la decoración más linda de la fiesta', description: 'Vos + la decoración que más te guste.', type: 'divertido', icon: '✨', order: 47, active: true, points: 80 },
    { title: 'Grabá un video de alguien contando en 10 segundos cómo conoció a Santi', description: 'Historia express de cómo se conocieron.', type: 'video', icon: '⏱️', order: 48, active: true, points: 100 },
    { title: 'Sacate una foto con el DJ o el que ponga la música', description: 'Con el que maneja los temas.', type: 'amigos', icon: '🎧', order: 49, active: true, points: 80 },
];

export default function AdminPanel() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pin, setPin] = useState('');
    const [currentView, setCurrentView] = useState<AdminView>('MENU');

    // Data States
    const [newsList, setNewsList] = useState<NewsAlert[]>([]);
    const [homenajesList, setHomenajesList] = useState<HomenajeItem[]>([]);
    const [profilesList, setProfilesList] = useState<UserProfile[]>([]);
    const [mediaList, setMediaList] = useState<MediaMetadata[]>([]);
    const [messagesList, setMessagesList] = useState<SocialMessage[]>([]);
    const [configs, setConfigs] = useState<Record<string, any>>({});
    const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestion[]>([]);
    const [triviaVideos, setTriviaVideos] = useState<TriviaVideo[]>([]);
    const [missionsList, setMissionsList] = useState<Mission[]>([]);

    // Forms State
    const [newsText, setNewsText] = useState('');
    const [newsType, setNewsType] = useState<NewsAlert['type']>('INFO');
    const [homTitle, setHomTitle] = useState('');
    const [homYoutube, setHomYoutube] = useState('');
    const [homOrder, setHomOrder] = useState('');

    // Config Form
    const [configBrandTop, setConfigBrandTop] = useState('');
    const [configBrandBottom, setConfigBrandBottom] = useState('');
    const [configWelcome, setConfigWelcome] = useState('');
    const [configSocialTitle, setConfigSocialTitle] = useState('');
    const [configLandingSub, setConfigLandingSub] = useState('');
    const [configBookPhotos, setConfigBookPhotos] = useState(''); // URLs del Book, una por línea
    const [configBookDriveFolderId, setConfigBookDriveFolderId] = useState('1cslGcbl0hvEky2mShf4-9Z6DvEJ2lLrJ'); // ID carpeta Drive para Book (por defecto)
    const [bookSyncLoading, setBookSyncLoading] = useState(false);
    const [triviaSubView, setTriviaSubView] = useState<'questions' | 'videos'>('questions');
    const [triviaQuestion, setTriviaQuestion] = useState('');
    const [triviaOpt1, setTriviaOpt1] = useState('');
    const [triviaOpt2, setTriviaOpt2] = useState('');
    const [triviaOpt3, setTriviaOpt3] = useState('');
    const [triviaOpt4, setTriviaOpt4] = useState('');
    const [triviaCorrect, setTriviaCorrect] = useState(0);
    const [triviaOrder, setTriviaOrder] = useState('');
    const [triviaVideoName, setTriviaVideoName] = useState('');
    const [triviaVideoId, setTriviaVideoId] = useState('');
    const [triviaVideoOrder, setTriviaVideoOrder] = useState('');
    const [editingVideo, setEditingVideo] = useState<TriviaVideo | null>(null);
    const [editingVideoYoutubeId, setEditingVideoYoutubeId] = useState('');
    const [editingVideoVisible, setEditingVideoVisible] = useState(true);
    const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
    const [deletingHomenajeId, setDeletingHomenajeId] = useState<string | null>(null);
    const [editingHomenaje, setEditingHomenaje] = useState<HomenajeItem | null>(null);
    const [homEditTitle, setHomEditTitle] = useState('');
    const [homEditYoutube, setHomEditYoutube] = useState('');
    const [homEditOrder, setHomEditOrder] = useState('');
    const [orderedHomenajes, setOrderedHomenajes] = useState<HomenajeItem[]>([]);
    const [publishingHomenajeId, setPublishingHomenajeId] = useState<string | null>(null);
    const [seedMessage, setSeedMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

    // Missions form
    const [missionTitle, setMissionTitle] = useState('');
    const [missionDesc, setMissionDesc] = useState('');
    const [missionType, setMissionType] = useState('');
    const [missionIcon, setMissionIcon] = useState('');
    const [missionOrder, setMissionOrder] = useState('');
    const [missionActive, setMissionActive] = useState(true);
    const [missionPrize, setMissionPrize] = useState('');
    const [missionPoints, setMissionPoints] = useState('');
    const [editingMission, setEditingMission] = useState<Mission | null>(null);
    const [missionSeedMessage, setMissionSeedMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
    const [deletingMissionId, setDeletingMissionId] = useState<string | null>(null);

    const sortedHomenajesFromSubscription = useMemo(
        () => [...homenajesList].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        [homenajesList]
    );
    // Siempre reflejar en la lista lo que viene de Firestore (editar/publicar/reordenar)
    useEffect(() => {
        if (sortedHomenajesFromSubscription.length > 0) {
            setOrderedHomenajes(sortedHomenajesFromSubscription);
        }
    }, [sortedHomenajesFromSubscription]);

    const handleHomenajesDragEnd = useCallback(
        async ({ data }: { data: HomenajeItem[] }) => {
            setOrderedHomenajes(data);
            setIsLoading(true);
            try {
                await Promise.all(
                    data
                        .filter((h) => h.id)
                        .map((h, i) => updateHomenaje(h.id!, { order: i }))
                );
            } catch (e) {
                console.error('Error updating homenajes order', e);
                Alert.alert("Error", "No se pudo guardar el orden.");
            } finally {
                setIsLoading(false);
            }
        },
        []
    );
    const [editingQuestion, setEditingQuestion] = useState<TriviaQuestion | null>(null);
    const [confirmDeleteAllTrivia, setConfirmDeleteAllTrivia] = useState(false);

    const router = useRouter();
    const ADMIN_PIN = "2026";

    useEffect(() => {
        // Recover admin session on web refresh
        if (Platform.OS === 'web' && sessionStorage.getItem('isAdmin') === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            const unsubNews = subscribeToNews(setNewsList);
            const unsubHom = subscribeToHomenajes(setHomenajesList);
            const unsubProfiles = subscribeToAllProfiles(setProfilesList);
            const unsubMedia = subscribeToMedia(setMediaList);
            const unsubMessages = subscribeToMessages(setMessagesList);
            const unsubConfigs = subscribeToConfigs((data) => {
                setConfigs(data);
                if (data.branding_top) setConfigBrandTop(data.branding_top);
                if (data.branding_bottom) setConfigBrandBottom(data.branding_bottom);
                if (data.welcome_text) setConfigWelcome(data.welcome_text);
                if (data.social_title) setConfigSocialTitle(data.social_title);
                if (data.landing_subtitle) setConfigLandingSub(data.landing_subtitle);
                if (Array.isArray(data.book_photos)) setConfigBookPhotos(data.book_photos.join('\n'));
                else if (data.book_photos) setConfigBookPhotos(String(data.book_photos));
                if (data.book_drive_folder_id !== undefined) setConfigBookDriveFolderId(String(data.book_drive_folder_id || '1cslGcbl0hvEky2mShf4-9Z6DvEJ2lLrJ'));
            });
            const unsubTq = subscribeToTriviaQuestions(setTriviaQuestions);
            const unsubTv = subscribeToTriviaVideos(setTriviaVideos);
            const unsubMissions = subscribeToMissions(setMissionsList);
            return () => {
                unsubNews(); unsubHom(); unsubProfiles(); unsubMedia(); unsubMessages(); unsubConfigs(); unsubTq(); unsubTv(); unsubMissions();
            };
        }
    }, [isAuthenticated]);

    const checkPin = async () => {
        if (pin === ADMIN_PIN) {
            setIsLoading(true);
            try {
                await signInAnonymously(auth);
                if (Platform.OS === 'web') sessionStorage.setItem('isAdmin', 'true');
                setIsAuthenticated(true);
            } catch (e) {
                console.error("Auth Fail", e);
                Alert.alert("Error de Conexión", "No se pudo conectar con el servidor.");
            } finally {
                setIsLoading(false);
            }
        }
        else { Alert.alert("Error", "PIN Incorrecto"); setPin(''); }
    };

    // HANDLERS
    const handleSaveConfig = async () => {
        setIsLoading(true);
        try {
            await saveConfig('branding_top', configBrandTop);
            await saveConfig('branding_bottom', configBrandBottom);
            await saveConfig('welcome_text', configWelcome);
            await saveConfig('social_title', configSocialTitle);
            await saveConfig('landing_subtitle', configLandingSub);
            const bookUrls = configBookPhotos.split(/\n/).map(s => s.trim()).filter(Boolean);
            await saveConfig('book_photos', bookUrls);
            await saveConfig('book_drive_folder_id', configBookDriveFolderId.trim() || null);
            Alert.alert("Éxito", "Configuración guardada");
        } catch (e) {
            Alert.alert("Error", "No se pudo guardar la configuración");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncBookFromDrive = async () => {
        const folderId = configBookDriveFolderId.trim();
        if (!folderId) {
            Alert.alert("Falta carpeta", "Ingresá el ID de la carpeta de Google Drive.");
            return;
        }
        setBookSyncLoading(true);
        try {
            const result = await syncBookFromDriveFolder(folderId);
            Alert.alert("Listo", `Se cargaron ${result.count} fotos desde Drive. Las URLs ya están en Book de Santi. Si querés, guardá la config para persistir también el ID de carpeta.`);
            await saveConfig('book_drive_folder_id', folderId);
        } catch (e: any) {
            const msg = e?.message || e?.code || String(e);
            Alert.alert("Error al sincronizar", msg.includes('not-found') || msg.includes('404') ? "Carpeta no encontrada o sin acceso. Compartí la carpeta con el email del service account (Cloud Functions)." : msg);
        } finally {
            setBookSyncLoading(false);
        }
    };

    const handleAddNews = async () => {
        if (!newsText.trim()) return;
        setIsLoading(true);
        console.log("Admin: Attempting to add news...", { newsType, newsText });
        try {
            await addNews(newsType, newsText);
            setNewsText('');
            Alert.alert("Éxito", "Noticia agregada");
        } catch (e: any) {
            console.error("Admin: Error adding news:", e);
            Alert.alert("Error", `No se pudo agregar la noticia: ${e.message || 'Error desconocido'} `);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteNews = (id: string) => {
        Alert.alert("Confirmar", "¿Borrar noticia?", [
            { text: "No" },
            {
                text: "Sí",
                onPress: async () => {
                    try {
                        await deleteNews(id);
                    } catch (e: any) {
                        Alert.alert("Error al borrar", e?.message ?? "No se pudo borrar la noticia.");
                    }
                },
            },
        ]);
    };

    const handleAddHomenaje = async () => {
        if (!homTitle.trim() || !homYoutube.trim()) return;
        setIsLoading(true);
        await addHomenaje({ title: homTitle, youtubeId: homYoutube, order: parseInt(homOrder) || 1, locked: true });
        setHomTitle(''); setHomYoutube(''); setHomOrder('');
        setIsLoading(false);
    };

    const handleConfirmDeleteHomenaje = async () => {
        if (!deletingHomenajeId) return;
        setIsLoading(true);
        try {
            await deleteHomenaje(deletingHomenajeId);
            setDeletingHomenajeId(null);
        } catch (e: any) {
            Alert.alert("Error al borrar", e?.message ?? "No se pudo borrar el homenaje.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditHomenaje = (h: HomenajeItem) => {
        if (!h.id) return;
        setEditingHomenaje(h);
        setHomEditTitle(h.title ?? '');
        setHomEditYoutube(h.youtubeId ?? '');
        setHomEditOrder(String(h.order ?? ''));
    };

    const handleSaveEditHomenaje = async () => {
        if (!editingHomenaje?.id || !homEditTitle.trim() || !homEditYoutube.trim()) {
            Alert.alert("Error", "Completá título y YouTube ID o enlace.");
            return;
        }
        const youtubeId = extractYoutubeId(homEditYoutube) || homEditYoutube.trim();
        if (!youtubeId) {
            Alert.alert("Error", "YouTube: pegá un enlace o un ID de 11 caracteres.");
            return;
        }
        setIsLoading(true);
        try {
            await updateHomenaje(editingHomenaje.id, {
                title: homEditTitle.trim(),
                youtubeId,
                order: parseInt(homEditOrder, 10) || 0
            });
            setEditingHomenaje(null);
            setHomEditTitle('');
            setHomEditYoutube('');
            setHomEditOrder('');
            Alert.alert("Listo", "Homenaje actualizado.");
        } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo actualizar el homenaje.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteMessage = (id: string) => {
        Alert.alert("Confirmar", "¿Borrar mensaje social?", [{ text: "No" }, { text: "Sí", onPress: () => deleteMessage(id) }]);
    };

    const handleDeleteMedia = (id: string) => {
        Alert.alert("Confirmar", "¿Borrar esta foto?", [{ text: "No" }, { text: "Sí", onPress: () => deleteMedia(id) }]);
    };

    function extractDriveFileId(input: string): string | null {
        const t = input.trim();
        const m1 = t.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (m1) return m1[1];
        const m2 = t.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (m2) return m2[1];
        if (/^[a-zA-Z0-9_-]{20,}$/.test(t)) return t;
        return null;
    }

    function extractYoutubeId(input: string): string | null {
        const t = input.trim();
        const m1 = t.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (m1) return m1[1];
        if (/^[a-zA-Z0-9_-]{11}$/.test(t)) return t;
        return null;
    }

    const handleAddTriviaQuestion = async () => {
        const opts = [triviaOpt1.trim(), triviaOpt2.trim(), triviaOpt3.trim(), triviaOpt4.trim()];
        if (!triviaQuestion.trim() || opts.some(o => !o)) {
            Alert.alert("Error", "Completá pregunta y las 4 opciones.");
            return;
        }
        setIsLoading(true);
        try {
            await addTriviaQuestion({
                question: triviaQuestion.trim(),
                options: opts,
                correctIndex: triviaCorrect,
                order: parseInt(triviaOrder, 10) || triviaQuestions.length
            });
            setTriviaQuestion(''); setTriviaOpt1(''); setTriviaOpt2(''); setTriviaOpt3(''); setTriviaOpt4(''); setTriviaOrder('');
            Alert.alert("Éxito", "Pregunta agregada");
        } catch (e: any) {
            const msg = e?.message || (e?.code === 'permission-denied' ? 'Sin permiso. Desplegá las reglas de Firestore (firebase deploy --only firestore:rules).' : 'No se pudo agregar');
            Alert.alert("Error", msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTriviaQuestion = (id: string) => {
        Alert.alert("Confirmar", "¿Borrar esta pregunta?", [{ text: "No" }, { text: "Sí", onPress: () => deleteTriviaQuestion(id) }]);
    };

    const handleAddTriviaVideo = async () => {
        const youtubeId = extractYoutubeId(triviaVideoId);
        const driveFileId = extractDriveFileId(triviaVideoId);
        if (!youtubeId && !driveFileId) {
            Alert.alert("Error", "Pegá un enlace de YouTube (recomendado) o de Google Drive.");
            return;
        }
        setIsLoading(true);
        try {
            await addTriviaVideo({
                ...(youtubeId && { youtubeId }),
                ...(driveFileId && { driveFileId }),
                name: triviaVideoName.trim() || undefined,
                order: parseInt(triviaVideoOrder, 10) || triviaVideos.length,
                visible: true
            });
            setTriviaVideoName(''); setTriviaVideoId(''); setTriviaVideoOrder('');
            Alert.alert("Éxito", youtubeId ? "Video de YouTube agregado." : "Referencia a Drive agregada.");
        } catch (e: any) {
            const msg = e?.message || (e?.code === 'permission-denied' ? 'Sin permiso. Desplegá las reglas de Firestore.' : 'No se pudo agregar');
            Alert.alert("Error", msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTriviaVideo = (id: string) => {
        setDeletingVideoId(id);
    };

    const confirmDeleteTriviaVideo = async () => {
        if (!deletingVideoId) return;
        setIsLoading(true);
        try {
            await deleteTriviaVideo(deletingVideoId);
            setDeletingVideoId(null);
        } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo borrar");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveEditVideo = async () => {
        if (!editingVideo?.id) return;
        const youtubeId = extractYoutubeId(editingVideoYoutubeId);
        if (!youtubeId) {
            Alert.alert("Error", "Pegá un enlace de YouTube o el ID del video (11 caracteres).");
            return;
        }
        setIsLoading(true);
        try {
            await updateTriviaVideo(editingVideo.id, { youtubeId, visible: editingVideoVisible });
            setEditingVideo(null);
            setEditingVideoYoutubeId('');
            setEditingVideoVisible(true);
            Alert.alert("Listo", "Video actualizado.");
        } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo actualizar");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditQuestion = (q: TriviaQuestion) => {
        setEditingQuestion(q);
        setTriviaQuestion(q.question);
        setTriviaOpt1(q.options[0] ?? '');
        setTriviaOpt2(q.options[1] ?? '');
        setTriviaOpt3(q.options[2] ?? '');
        setTriviaOpt4(q.options[3] ?? '');
        setTriviaCorrect(q.correctIndex);
        setTriviaOrder(String(q.order ?? 0));
    };

    const handleSaveEditQuestion = async () => {
        if (!editingQuestion?.id) return;
        const opts = [triviaOpt1.trim(), triviaOpt2.trim(), triviaOpt3.trim(), triviaOpt4.trim()];
        if (!triviaQuestion.trim() || opts.some(o => !o)) {
            Alert.alert("Error", "Completá pregunta y las 4 opciones.");
            return;
        }
        setIsLoading(true);
        try {
            await updateTriviaQuestion(editingQuestion.id, {
                question: triviaQuestion.trim(),
                options: opts,
                correctIndex: triviaCorrect,
                order: parseInt(triviaOrder, 10) || 0
            });
            setEditingQuestion(null);
            setTriviaQuestion(''); setTriviaOpt1(''); setTriviaOpt2(''); setTriviaOpt3(''); setTriviaOpt4(''); setTriviaOrder('');
            Alert.alert("Listo", "Pregunta actualizada.");
        } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo actualizar");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadTriviaSeed = async () => {
        if (triviaQuestions.length > 0 || triviaVideos.length > 0) {
            Alert.alert("Aviso", "Ya hay preguntas o videos. ¿Cargar igual? (se duplicarán)", [
                { text: "Cancelar" },
                { text: "Sí, cargar", onPress: doLoadTriviaSeed }
            ]);
            return;
        }
        await doLoadTriviaSeed();
    };

    const doDeleteAllTrivia = async () => {
        setConfirmDeleteAllTrivia(false);
        setSeedMessage(null);
        setIsLoading(true);
        try {
            for (const q of triviaQuestions) {
                if (q.id) await deleteTriviaQuestion(q.id);
            }
            for (const v of triviaVideos) {
                if (v.id) await deleteTriviaVideo(v.id);
            }
            setSeedMessage({ type: 'ok', text: 'Trivia borrada. Podés cargar datos iniciales.' });
        } catch (e: any) {
            const msg = e?.message || (e?.code === 'permission-denied' ? 'Sin permiso.' : 'Error al borrar.');
            setSeedMessage({ type: 'error', text: msg });
        } finally {
            setIsLoading(false);
        }
    };

    const doLoadTriviaSeed = async () => {
        setSeedMessage(null);
        setIsLoading(true);
        try {
            for (let i = 0; i < TRIVIA_SEED_QUESTIONS.length; i++) {
                await addTriviaQuestion({ ...TRIVIA_SEED_QUESTIONS[i], order: i });
            }
            for (let i = 0; i < TRIVIA_SEED_VIDEOS.length; i++) {
                await addTriviaVideo({
                    name: TRIVIA_SEED_VIDEOS[i].name,
                    youtubeId: TRIVIA_SEED_VIDEOS[i].youtubeId,
                    order: TRIVIA_SEED_VIDEOS[i].order,
                    visible: true
                });
            }
            const msg = "Se cargaron 4 preguntas y 8 YouTube Shorts para la trivia.";
            setSeedMessage({ type: 'ok', text: msg });
            Alert.alert("Listo", msg);
        } catch (e: any) {
            const errMsg = e?.message || e?.code || String(e);
            const isPermission = e?.code === 'permission-denied' || errMsg.includes('permission');
            const text = isPermission
                ? "Sin permiso. Desplegá reglas: firebase deploy --only firestore:rules y revisá que estés en la base 'barmitzvamedina'."
                : `Error: ${errMsg}`;
            setSeedMessage({ type: 'error', text });
            console.error("Trivia seed error:", e);
            Alert.alert("Error", text);
        } finally {
            setIsLoading(false);
        }
    };

    // Missions CRUD
    const handleAddMission = async () => {
        if (!missionTitle.trim()) {
            Alert.alert("Error", "El título es obligatorio.");
            return;
        }
        setIsLoading(true);
        try {
            await addMission({
                title: missionTitle.trim(),
                description: missionDesc.trim() || undefined,
                type: missionType.trim() || undefined,
                icon: missionIcon.trim() || undefined,
                order: parseInt(missionOrder, 10) || missionsList.length,
                active: missionActive,
                prize: missionPrize.trim() || undefined,
                points: missionPoints.trim() ? parseInt(missionPoints, 10) : undefined,
            });
            setMissionTitle(''); setMissionDesc(''); setMissionType(''); setMissionIcon('');
            setMissionOrder(''); setMissionPrize(''); setMissionPoints('');
            Alert.alert("Listo", "Misión creada.");
        } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo crear la misión.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditMission = (m: Mission) => {
        setEditingMission(m);
        setMissionTitle(m.title ?? '');
        setMissionDesc(m.description ?? '');
        setMissionType(m.type ?? '');
        setMissionIcon(m.icon ?? '');
        setMissionOrder(String(m.order ?? ''));
        setMissionActive(m.active !== false);
        setMissionPrize(m.prize ?? '');
        setMissionPoints(m.points != null ? String(m.points) : '');
    };

    const handleSaveEditMission = async () => {
        if (!editingMission?.id) return;
        if (!missionTitle.trim()) {
            Alert.alert("Error", "El título es obligatorio.");
            return;
        }
        setIsLoading(true);
        try {
            await updateMission(editingMission.id, {
                title: missionTitle.trim(),
                description: missionDesc.trim() || undefined,
                type: missionType.trim() || undefined,
                icon: missionIcon.trim() || undefined,
                order: parseInt(missionOrder, 10) ?? editingMission.order,
                active: missionActive,
                prize: missionPrize.trim() || undefined,
                points: missionPoints.trim() ? parseInt(missionPoints, 10) : undefined,
            });
            setEditingMission(null);
            setMissionTitle(''); setMissionDesc(''); setMissionType(''); setMissionIcon('');
            setMissionOrder(''); setMissionPrize(''); setMissionPoints('');
            Alert.alert("Listo", "Misión actualizada.");
        } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo actualizar.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDeleteMission = async () => {
        if (!deletingMissionId) return;
        setIsLoading(true);
        try {
            await deleteMission(deletingMissionId);
            setDeletingMissionId(null);
            Alert.alert("Listo", "Misión eliminada.");
        } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo eliminar.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadMissionsSeed = async () => {
        if (missionsList.length > 0) {
            Alert.alert("Aviso", "Ya hay misiones. ¿Cargar igual? (se duplicarán)", [
                { text: "Cancelar" },
                { text: "Sí, cargar", onPress: doLoadMissionsSeed }
            ]);
            return;
        }
        await doLoadMissionsSeed();
    };

    const doLoadMissionsSeed = async () => {
        setMissionSeedMessage(null);
        setIsLoading(true);
        try {
            for (let i = 0; i < MISSION_SEED.length; i++) {
                await addMission({ ...MISSION_SEED[i], order: i });
            }
            const msg = "Se cargaron 50 misiones (pool). Cada usuario recibe 13 al azar.";
            setMissionSeedMessage({ type: 'ok', text: msg });
            Alert.alert("Listo", msg);
        } catch (e: any) {
            const errMsg = e?.message || e?.code || String(e);
            setMissionSeedMessage({ type: 'error', text: errMsg });
            Alert.alert("Error", errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loginBox}>
                    <Text style={styles.title}>PANEL DE CONTROL</Text>
                    <TextInput style={styles.pinInput} value={pin} onChangeText={setPin} keyboardType="numeric" secureTextEntry maxLength={4} placeholder="****" />
                    <TouchableOpacity style={styles.loginBtn} onPress={checkPin}><Text style={styles.loginBtnText}>ENTRAR</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()}><Text style={{ color: '#666', marginTop: 20 }}>Volver</Text></TouchableOpacity>
                </View>
            </View>
        );
    }

    const renderMenu = () => (
        <View style={styles.menuGrid}>
            {[
                { id: 'CONFIG', label: 'Branding/Config', icon: 'gears' },
                { id: 'NEWS', label: 'Noticias Zócalo', icon: 'newspaper-o' },
                { id: 'HOMENAJES', label: 'Homenajes (Videos)', icon: 'video-camera' },
                { id: 'MESSAGES', label: 'Mensajes Sociales', icon: 'comments' },
                { id: 'MISIONES', label: 'Marketing → Misiones', icon: 'star' },
                { id: 'PROFILES', label: 'Invitados/Perfiles', icon: 'users' },
                { id: 'MEDIA', label: 'Fotos Subidas', icon: 'image' },
                { id: 'TRIVIA', label: 'Trivia Medina', icon: 'question-circle' },
                { id: 'DANGER', label: 'Zona Peligrosa', icon: 'warning' },
            ].map((item) => (
                <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => setCurrentView(item.id as AdminView)}>
                    <FontAwesome name={item.icon as any} size={30} color={Colors.elegant.gold} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderHeader = (title: string) => (
        <View style={styles.viewHeader}>
            <TouchableOpacity onPress={() => setCurrentView('MENU')}>
                <FontAwesome name="arrow-left" size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.viewHeaderTitle}>{title}</Text>
            <View style={{ width: 20 }} />
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.topBarTitle}>ADMINISTRACIÓN</Text>
                    <Text style={styles.topBarSubtitle}>Bar Mitzva Medina</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)')}>
                    <FontAwesome name="close" size={24} color={Colors.elegant.gold} />
                </TouchableOpacity>
            </View>

            {isLoading && <ActivityIndicator color={Colors.elegant.gold} style={{ padding: 10 }} />}

            <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
                {currentView === 'MENU' && renderMenu()}

                {currentView === 'CONFIG' && (
                    <View style={styles.section}>
                        {renderHeader('CONFIGURACIÓN GLOBAL')}
                        <Text style={styles.inputLabel}>Título Superior (ej: El Bar Mitzva de)</Text>
                        <TextInput style={styles.inputField} value={configBrandTop} onChangeText={setConfigBrandTop} placeholder="El Bar Mitzva de..." />

                        <Text style={styles.inputLabel}>Título Principal (ej: MEDINA)</Text>
                        <TextInput style={styles.inputField} value={configBrandBottom} onChangeText={setConfigBrandBottom} placeholder="SANTI MEDINA" />

                        <Text style={styles.inputLabel}>Texto de Bienvenida (Home)</Text>
                        <TextInput style={styles.inputField} value={configWelcome} onChangeText={setConfigWelcome} placeholder="BIENVENIDO A LA FIESTA" />

                        <Text style={styles.inputLabel}>Título Sección Social</Text>
                        <TextInput style={styles.inputField} value={configSocialTitle} onChangeText={setConfigSocialTitle} placeholder="Santi no es Santi sin..." />

                        <Text style={styles.inputLabel}>Subtítulo Pantalla Bienvenida</Text>
                        <TextInput style={styles.inputField} value={configLandingSub} onChangeText={setConfigLandingSub} placeholder="EXPERIENCIA INTERACTIVA" />

                        <Text style={styles.inputLabel}>Book de Santi – ID de carpeta Google Drive</Text>
                        <TextInput
                            style={styles.inputField}
                            value={configBookDriveFolderId}
                            onChangeText={setConfigBookDriveFolderId}
                            placeholder="Ej: 1cslGcbl0hvEky2mShf4-9Z6DvEJ2lLrJ"
                        />
                        <TouchableOpacity style={[styles.addBtn, { marginBottom: 16 }]} onPress={handleSyncBookFromDrive} disabled={bookSyncLoading}>
                            {bookSyncLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.addBtnText}>SINCRONIZAR BOOK DESDE DRIVE</Text>}
                        </TouchableOpacity>

                        <Text style={styles.inputLabel}>Book de Santi – URLs de fotos (una por línea; se llenan al sincronizar o pegá manual)</Text>
                        <TextInput
                            style={[styles.inputField, { minHeight: 120, textAlignVertical: 'top' }]}
                            value={configBookPhotos}
                            onChangeText={setConfigBookPhotos}
                            placeholder="https://...\nhttps://..."
                            multiline
                            numberOfLines={6}
                        />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConfig} disabled={isLoading}>
                            <Text style={styles.saveBtnText}>GUARDAR TODA LA CONFIG</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {currentView === 'NEWS' && (
                    <View style={styles.section}>
                        {renderHeader('GESTIÓN DE NOTICIAS')}
                        <TextInput style={styles.inputField} placeholder="Texto de la noticia..." value={newsText} onChangeText={setNewsText} />
                        <View style={styles.typeRow}>
                            {['INFO', 'ALERTA', 'ULTIMO MOMENTO', 'URGENTE'].map((t) => (
                                <TouchableOpacity key={t} style={[styles.typeMiniBtn, newsType === t && styles.typeMiniBtnActive]} onPress={() => setNewsType(t as any)}>
                                    <Text style={styles.typeMiniText}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddNews}><Text style={styles.addBtnText}>AGREGAR NOTICIA</Text></TouchableOpacity>
                        {newsList.map(n => (
                            <View key={n.id} style={styles.listItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, color: '#444' }}>{n.type}</Text>
                                    <Text style={{ color: '#111', fontWeight: 'bold' }}>{n.text}</Text>
                                </View>
                                <Switch
                                    value={n.visible !== false}
                                    onValueChange={(v) => updateNews(n.id!, { visible: v })}
                                    trackColor={{ false: '#767577', true: Colors.elegant.gold }}
                                />
                                <TouchableOpacity onPress={() => handleDeleteNews(n.id!)} style={{ marginLeft: 15 }}>
                                    <FontAwesome name="trash" size={18} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {currentView === 'HOMENAJES' && (
                    <View style={styles.section}>
                        {renderHeader('VIDEOS HOMENAJES')}
                        {deletingHomenajeId && (
                            <View style={[styles.listItem, { backgroundColor: '#4d1a1a', marginBottom: 10 }]}>
                                <Text style={{ color: '#fff', flex: 1 }}>¿Borrar este video homenaje?</Text>
                                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#c00', marginLeft: 8 }]} onPress={handleConfirmDeleteHomenaje} disabled={isLoading}>
                                    <Text style={styles.addBtnText}>SÍ, BORRAR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555', marginLeft: 8 }]} onPress={() => setDeletingHomenajeId(null)} disabled={isLoading}>
                                    <Text style={styles.addBtnText}>NO</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <TextInput style={styles.inputField} placeholder="Título" value={homTitle} onChangeText={setHomTitle} />
                        <TextInput style={styles.inputField} placeholder="YouTube ID" value={homYoutube} onChangeText={setHomYoutube} />
                        <TextInput style={styles.inputField} placeholder="Orden" value={homOrder} onChangeText={setHomOrder} keyboardType="numeric" />
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddHomenaje}><Text style={styles.addBtnText}>CREAR HOMENAJE</Text></TouchableOpacity>
                        <Text style={[styles.inputLabel, { marginTop: 8 }]}>Arrastrá para reordenar (mantené apretado en el ícono ≡). Tocá el lápiz para editar.</Text>
                        <View style={{ height: 360, marginTop: 8 }}>
                            <GestureHandlerRootView style={{ flex: 1 }}>
                                <DraggableFlatList<HomenajeItem>
                                    data={orderedHomenajes.filter((h) => h.id)}
                                    keyExtractor={(h) => h.id ?? ''}
                                    onDragEnd={handleHomenajesDragEnd}
                                    renderItem={({ item: h, drag, isActive }) => (
                                        <View style={[styles.listItem, isActive && { opacity: 0.9, backgroundColor: '#ddd' }]}>
                                            <TouchableOpacity onLongPress={drag} style={{ marginRight: 12, padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                                <FontAwesome name="bars" size={18} color="#666" />
                                            </TouchableOpacity>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: 'bold' }}>{h.title}</Text>
                                                <Text style={{ fontSize: 10, color: '#999' }}>Orden: {h.order}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => handleEditHomenaje(h)} style={{ marginRight: 8 }} disabled={!!editingHomenaje}>
                                                <FontAwesome name="pencil" size={18} color={Colors.elegant.gold} />
                                            </TouchableOpacity>
                                            <Switch
                                                value={!h.locked}
                                                disabled={publishingHomenajeId === h.id}
                                                onValueChange={async (v) => {
                                                    if (!h.id) return;
                                                    setPublishingHomenajeId(h.id);
                                                    try {
                                                        await updateHomenaje(h.id, { locked: !v });
                                                    } catch (e: any) {
                                                        Alert.alert("Error al publicar/ocultar", e?.message ?? "No se pudo actualizar. Revisá la consola.");
                                                    } finally {
                                                        setPublishingHomenajeId(null);
                                                    }
                                                }}
                                                trackColor={{ false: '#767577', true: Colors.elegant.gold }}
                                            />
                                            <TouchableOpacity onPress={() => h.id && setDeletingHomenajeId(h.id)} style={{ marginLeft: 15 }} disabled={!!deletingHomenajeId}>
                                                <FontAwesome name="trash" size={18} color="red" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                            </GestureHandlerRootView>
                        </View>
                        {editingHomenaje && (
                            <View style={[styles.listItem, { backgroundColor: '#2a2a2a', marginTop: 16, paddingVertical: 16, borderWidth: 1, borderColor: Colors.elegant.gold }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: Colors.elegant.gold, fontWeight: 'bold', marginBottom: 4 }}>Editando: {editingHomenaje.title}</Text>
                                    <Text style={{ color: '#999', fontSize: 11, marginBottom: 10 }}>Cambiá los campos y tocá GUARDAR.</Text>
                                    <TextInput style={styles.inputField} placeholder="Título" value={homEditTitle} onChangeText={setHomEditTitle} />
                                    <TextInput style={styles.inputField} placeholder="YouTube ID o enlace" value={homEditYoutube} onChangeText={setHomEditYoutube} />
                                    <TextInput style={styles.inputField} placeholder="Orden" value={homEditOrder} onChangeText={setHomEditOrder} keyboardType="numeric" />
                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                        <TouchableOpacity style={styles.addBtn} onPress={handleSaveEditHomenaje} disabled={isLoading}><Text style={styles.addBtnText}>GUARDAR</Text></TouchableOpacity>
                                        <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555' }]} onPress={() => { setEditingHomenaje(null); setHomEditTitle(''); setHomEditYoutube(''); setHomEditOrder(''); }}><Text style={styles.addBtnText}>CANCELAR</Text></TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {currentView === 'MESSAGES' && (
                    <View style={styles.section}>
                        {renderHeader('SANTI NO ES SANTI SIN...')}
                        {messagesList.map(m => {
                            const sender = profilesList.find(p => p.id === m.userId);
                            return (
                                <View key={m.id} style={styles.listItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, color: '#666' }}>{sender?.name || 'Invitado'}:</Text>
                                        <Text style={{ color: '#444', fontStyle: 'italic' }}>"{m.text}"</Text>
                                    </View>
                                    <Switch
                                        value={m.visible !== false}
                                        onValueChange={(v) => updateMessage(m.id!, { visible: v })}
                                        trackColor={{ false: '#767577', true: Colors.elegant.gold }}
                                    />
                                    <TouchableOpacity onPress={() => handleDeleteMessage(m.id!)} style={{ marginLeft: 15 }}>
                                        <FontAwesome name="trash" size={18} color="red" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}

                {currentView === 'PROFILES' && (
                    <View style={styles.section}>
                        {renderHeader('INVITADOS')}
                        {profilesList.map(p => (
                            <View key={p.id} style={styles.listItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{p.name || 'Sin nombre'}</Text>
                                    <Text style={{ fontSize: 12, color: '#666' }}>📍 {p.metWhere}</Text>
                                    <Text style={{ fontSize: 10, color: '#999' }}>UID: {p.id}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {currentView === 'MEDIA' && (
                    <View style={styles.section}>
                        {renderHeader('GALERÍA DE FOTOS')}
                        <Text style={[styles.inputLabel, { marginBottom: 8 }]}>Visible = se muestra en la pantalla principal. Podés ocultar sin borrar.</Text>
                        <View style={styles.mediaGrid}>
                            {mediaList.map(m => (
                                <View key={m.id} style={styles.mediaCard}>
                                    <Image source={{ uri: m.url }} style={styles.mediaImg} />
                                    <View style={styles.mediaCardActions}>
                                        <View style={styles.mediaCardVisibleRow}>
                                            <Text style={styles.mediaCardVisibleLabel}>Visible</Text>
                                            <Switch
                                                value={m.visible !== false}
                                                onValueChange={(v) => m.id && updateMedia(m.id, { visible: v })}
                                                trackColor={{ false: '#767577', true: Colors.elegant.gold }}
                                            />
                                        </View>
                                        <TouchableOpacity style={styles.delMedia} onPress={() => handleDeleteMedia(m.id!)}>
                                            <FontAwesome name="trash" size={12} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {currentView === 'TRIVIA' && (
                    <View style={styles.section}>
                        {renderHeader('TRIVIA MEDINA')}
                        <View style={[styles.listItem, { backgroundColor: '#222', marginBottom: 12 }]}>
                            <Text style={{ color: Colors.elegant.gold, fontWeight: 'bold' }}>
                                Cargado: {triviaQuestions.length} preguntas, {triviaVideos.length} videos
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                            <TouchableOpacity style={[styles.addBtn, { backgroundColor: Colors.elegant.gold, flex: 1, minWidth: 180 }]} onPress={handleLoadTriviaSeed} disabled={isLoading}>
                                <Text style={[styles.addBtnText, { color: '#000' }]}>CARGAR DATOS INICIALES (4 preguntas + 8 Shorts)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#8b0000', flex: 1, minWidth: 140 }]} onPress={() => setConfirmDeleteAllTrivia(true)} disabled={isLoading || (triviaQuestions.length === 0 && triviaVideos.length === 0)}>
                                <Text style={styles.addBtnText}>BORRAR TODO</Text>
                            </TouchableOpacity>
                        </View>
                        {confirmDeleteAllTrivia && (
                            <View style={[styles.listItem, { backgroundColor: '#4d1a1a', marginBottom: 12 }]}>
                                <Text style={{ color: '#fff', flex: 1 }}>¿Borrar todas las preguntas y todos los videos de trivia?</Text>
                                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#c00', marginLeft: 8 }]} onPress={doDeleteAllTrivia} disabled={isLoading}>
                                    <Text style={styles.addBtnText}>SÍ, BORRAR TODO</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555', marginLeft: 8 }]} onPress={() => setConfirmDeleteAllTrivia(false)}>
                                    <Text style={styles.addBtnText}>NO</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {seedMessage && (
                            <View style={[styles.listItem, { backgroundColor: seedMessage.type === 'ok' ? '#1a3d1a' : '#4d1a1a', marginBottom: 12 }]}>
                                <Text style={{ color: '#fff', flex: 1 }}>{seedMessage.text}</Text>
                            </View>
                        )}
                        <View style={styles.typeRow}>
                            <TouchableOpacity style={[styles.typeMiniBtn, triviaSubView === 'questions' && styles.typeMiniBtnActive]} onPress={() => { setTriviaSubView('questions'); setEditingQuestion(null); setEditingVideo(null); }}>
                                <Text style={styles.typeMiniText}>Preguntas ({triviaQuestions.length})</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.typeMiniBtn, triviaSubView === 'videos' && styles.typeMiniBtnActive]} onPress={() => { setTriviaSubView('videos'); setEditingQuestion(null); setEditingVideo(null); }}>
                                <Text style={styles.typeMiniText}>Videos ({triviaVideos.length})</Text>
                            </TouchableOpacity>
                        </View>

                        {triviaSubView === 'questions' && (
                            <>
                                <Text style={[styles.inputLabel, { marginTop: 4 }]}>Listado de preguntas (tocá lápiz para editar)</Text>
                                {triviaQuestions.map((q) => (
                                    <View key={q.id} style={styles.listItem}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: 'bold', color: '#111' }}>{q.question}</Text>
                                            <Text style={{ fontSize: 11, color: '#666' }}>Correcta: índice {q.correctIndex} • Orden: {q.order}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleEditQuestion(q)} style={{ marginLeft: 10 }}>
                                            <FontAwesome name="pencil" size={18} color={Colors.elegant.gold} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteTriviaQuestion(q.id!)} style={{ marginLeft: 10 }}>
                                            <FontAwesome name="trash" size={18} color="red" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <Text style={[styles.inputLabel, { marginTop: 16 }]}>{editingQuestion ? 'Editar pregunta' : 'Nueva pregunta'}</Text>
                                {editingQuestion && (
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                        <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={handleSaveEditQuestion} disabled={isLoading}><Text style={styles.addBtnText}>GUARDAR CAMBIOS</Text></TouchableOpacity>
                                        <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555', flex: 1 }]} onPress={() => { setEditingQuestion(null); setTriviaQuestion(''); setTriviaOpt1(''); setTriviaOpt2(''); setTriviaOpt3(''); setTriviaOpt4(''); setTriviaOrder(''); }}><Text style={styles.addBtnText}>CANCELAR</Text></TouchableOpacity>
                                    </View>
                                )}
                                <TextInput style={styles.inputField} placeholder="Pregunta" value={triviaQuestion} onChangeText={setTriviaQuestion} />
                                <Text style={styles.inputLabel}>Opción 1 (correcta = índice 0)</Text>
                                <TextInput style={styles.inputField} placeholder="Ej: Boca" value={triviaOpt1} onChangeText={setTriviaOpt1} />
                                <Text style={styles.inputLabel}>Opción 2 (correcta = índice 1)</Text>
                                <TextInput style={styles.inputField} placeholder="Ej: River" value={triviaOpt2} onChangeText={setTriviaOpt2} />
                                <Text style={styles.inputLabel}>Opción 3 (correcta = índice 2)</Text>
                                <TextInput style={styles.inputField} placeholder="Ej: Atlanta" value={triviaOpt3} onChangeText={setTriviaOpt3} />
                                <Text style={styles.inputLabel}>Opción 4 (correcta = índice 3)</Text>
                                <TextInput style={styles.inputField} placeholder="Ej: Racing" value={triviaOpt4} onChangeText={setTriviaOpt4} />
                                <Text style={styles.inputLabel}>Índice correcta (0-3)</Text>
                                <View style={styles.typeRow}>
                                    {[0, 1, 2, 3].map((i) => (
                                        <TouchableOpacity key={i} style={[styles.typeMiniBtn, triviaCorrect === i && styles.typeMiniBtnActive]} onPress={() => setTriviaCorrect(i)}>
                                            <Text style={styles.typeMiniText}>{i}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput style={styles.inputField} placeholder="Orden" value={triviaOrder} onChangeText={setTriviaOrder} keyboardType="numeric" />
                                <TouchableOpacity style={styles.addBtn} onPress={handleAddTriviaQuestion} disabled={isLoading}>
                                    <Text style={styles.addBtnText}>AGREGAR PREGUNTA</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {triviaSubView === 'videos' && (
                            <>
                                <Text style={[styles.inputLabel, { marginTop: 4 }]}>Listado de videos (tocá lápiz para poner YouTube y que se reproduzca bien)</Text>
                                {deletingVideoId && (
                                    <View style={[styles.listItem, { backgroundColor: '#4d1a1a', marginBottom: 10 }]}>
                                        <Text style={{ color: '#fff', flex: 1 }}>¿Borrar este video?</Text>
                                        <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#c00', marginLeft: 8 }]} onPress={confirmDeleteTriviaVideo} disabled={isLoading}>
                                            <Text style={styles.addBtnText}>SÍ, BORRAR</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555', marginLeft: 8 }]} onPress={() => setDeletingVideoId(null)}>
                                            <Text style={styles.addBtnText}>NO</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {editingVideo && (
                                    <View style={[styles.listItem, { backgroundColor: '#333', marginBottom: 10 }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: Colors.elegant.gold, fontWeight: 'bold' }}>YouTube: {editingVideo.name}</Text>
                                            <TextInput style={[styles.inputField, { marginTop: 8 }]} placeholder="Enlace de YouTube o ID del video" value={editingVideoYoutubeId} onChangeText={setEditingVideoYoutubeId} />
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                                                <Switch value={editingVideoVisible} onValueChange={setEditingVideoVisible} trackColor={{ false: '#555', true: Colors.elegant.gold }} thumbColor="#fff" />
                                                <Text style={{ color: '#fff', marginLeft: 10 }}>Visible en la trivia</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                                <TouchableOpacity style={styles.addBtn} onPress={handleSaveEditVideo} disabled={isLoading}><Text style={styles.addBtnText}>GUARDAR</Text></TouchableOpacity>
                                                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555' }]} onPress={() => { setEditingVideo(null); setEditingVideoYoutubeId(''); setEditingVideoVisible(true); }}><Text style={styles.addBtnText}>CANCELAR</Text></TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                )}
                                {triviaVideos.map((v) => (
                                    <View key={v.id} style={styles.listItem}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: 'bold', color: '#111' }}>{v.name || v.youtubeId || v.driveFileId || '—'}</Text>
                                            <Text style={{ fontSize: 10, color: v.youtubeId ? '#0a0' : (v.driveFileId === 'REEMPLAZAR' ? 'red' : '#999') }}>
                                                {v.youtubeId ? `YouTube: ${v.youtubeId}` : `Drive: ${v.driveFileId || '—'}`}
                                                {v.visible === false ? ' · Oculta' : ''}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => { setEditingVideo(v); setEditingVideoYoutubeId(v.youtubeId || ''); }} style={{ marginLeft: 10 }}>
                                            <FontAwesome name="pencil" size={18} color={Colors.elegant.gold} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteTriviaVideo(v.id!)} style={{ marginLeft: 10 }}>
                                            <FontAwesome name="trash" size={18} color="red" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Agregar video (YouTube recomendado: subí a YouTube y pegá el enlace)</Text>
                                <TextInput style={styles.inputField} placeholder="Nombre (opcional)" value={triviaVideoName} onChangeText={setTriviaVideoName} />
                                <TextInput style={styles.inputField} placeholder="https://youtube.com/watch?v=... o ID de YouTube" value={triviaVideoId} onChangeText={setTriviaVideoId} />
                                <TextInput style={styles.inputField} placeholder="Orden" value={triviaVideoOrder} onChangeText={setTriviaVideoOrder} keyboardType="numeric" />
                                <TouchableOpacity style={styles.addBtn} onPress={handleAddTriviaVideo} disabled={isLoading}>
                                    <Text style={styles.addBtnText}>IMPORTAR VIDEO</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {currentView === 'MISIONES' && (
                    <View style={styles.section}>
                        {renderHeader('MARKETING → MISIONES')}
                        <Text style={[styles.inputLabel, { marginBottom: 8 }]}>Pool de misiones (ej. 50). Cada usuario recibe 13 al azar y debe completar esas 13. Orden = orden en listado admin. Activa = visible en el pool.</Text>
                        {missionSeedMessage && (
                            <View style={[styles.listItem, { backgroundColor: missionSeedMessage.type === 'ok' ? '#1a3d1a' : '#4d1a1a', marginBottom: 10 }]}>
                                <Text style={{ color: '#fff' }}>{missionSeedMessage.text}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={[styles.addBtn, { backgroundColor: Colors.elegant.gold }]} onPress={handleLoadMissionsSeed} disabled={isLoading}>
                            <Text style={[styles.addBtnText, { color: '#000' }]}>CARGAR 50 MISIONES INICIALES (pool)</Text>
                        </TouchableOpacity>

                        {deletingMissionId && (
                            <View style={[styles.listItem, { backgroundColor: '#4d1a1a', marginBottom: 10 }]}>
                                <Text style={{ color: '#fff', flex: 1 }}>¿Borrar esta misión?</Text>
                                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#c00', marginLeft: 8 }]} onPress={handleConfirmDeleteMission} disabled={isLoading}>
                                    <Text style={styles.addBtnText}>SÍ, BORRAR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555', marginLeft: 8 }]} onPress={() => setDeletingMissionId(null)}>
                                    <Text style={styles.addBtnText}>NO</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Nueva misión</Text>
                        <TextInput style={styles.inputField} placeholder="Título de la misión *" value={missionTitle} onChangeText={setMissionTitle} />
                        <TextInput style={styles.inputField} placeholder="Descripción" value={missionDesc} onChangeText={setMissionDesc} />
                        <TextInput style={styles.inputField} placeholder="Tipo (primo, tío, amigo, familiar...)" value={missionType} onChangeText={setMissionType} />
                        <TextInput style={styles.inputField} placeholder="Ícono (emoji ej. 📸)" value={missionIcon} onChangeText={setMissionIcon} />
                        <TextInput style={styles.inputField} placeholder="Orden (número)" value={missionOrder} onChangeText={setMissionOrder} keyboardType="numeric" />
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ color: '#AAA', marginRight: 10 }}>Activa</Text>
                            <Switch value={missionActive} onValueChange={setMissionActive} trackColor={{ false: '#555', true: Colors.elegant.gold }} />
                        </View>
                        <TextInput style={styles.inputField} placeholder="Premio (opcional)" value={missionPrize} onChangeText={setMissionPrize} />
                        <TextInput style={styles.inputField} placeholder="Puntos (opcional)" value={missionPoints} onChangeText={setMissionPoints} keyboardType="numeric" />

                        {editingMission ? (
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                <TouchableOpacity style={styles.addBtn} onPress={handleSaveEditMission} disabled={isLoading}>
                                    <Text style={styles.addBtnText}>GUARDAR CAMBIOS</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#555' }]} onPress={() => { setEditingMission(null); setMissionTitle(''); setMissionDesc(''); setMissionType(''); setMissionIcon(''); setMissionOrder(''); setMissionPrize(''); setMissionPoints(''); }}>
                                    <Text style={styles.addBtnText}>CANCELAR</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.addBtn} onPress={handleAddMission} disabled={isLoading}>
                                <Text style={styles.addBtnText}>AGREGAR MISIÓN</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={[styles.inputLabel, { marginTop: 8 }]}>Listado ({missionsList.length}) — tocá lápiz para editar</Text>
                        {missionsList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((m) => (
                            <View key={m.id} style={styles.listItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: 'bold', color: '#111' }}>{m.icon ? `${m.icon} ` : ''}{m.title}</Text>
                                    <Text style={{ fontSize: 10, color: '#666' }}>Tipo: {m.type || '—'} · Orden: {m.order} · Puntos: {m.points ?? '—'} {m.active ? '' : '· Oculta'}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleEditMission(m)} style={{ marginRight: 8 }}>
                                    <FontAwesome name="pencil" size={18} color={Colors.elegant.gold} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => m.id && setDeletingMissionId(m.id)}>
                                    <FontAwesome name="trash" size={18} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {currentView === 'DANGER' && (
                    <View style={styles.section}>
                        {renderHeader('PELIGRO')}
                        <TouchableOpacity style={styles.dangerBtn} onPress={resetRanking}>
                            <Text style={styles.dangerBtnText}>REINICIAR RANKING (PUNTAJES)</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111' },
    loginBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    title: { color: 'white', fontSize: 22, fontFamily: Fonts.bold, marginBottom: 30 },
    pinInput: { backgroundColor: 'white', width: 200, height: 60, borderRadius: 10, textAlign: 'center', fontSize: 24, marginBottom: 20 },
    loginBtn: { backgroundColor: Colors.elegant.gold, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 10 },
    loginBtnText: { fontFamily: Fonts.bold, color: 'black' },
    topBar: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#000', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topBarTitle: { color: 'white', fontFamily: Fonts.bold, fontSize: 18 },
    topBarSubtitle: { color: Colors.elegant.gold, fontSize: 10 },
    menuGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 10, justifyContent: 'center', marginTop: 20 },
    menuItem: { width: '45%', backgroundColor: '#222', padding: 20, borderRadius: 15, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#333' },
    menuLabel: { color: 'white', fontSize: 12, textAlign: 'center', fontFamily: Fonts.sans },
    section: { padding: 20 },
    viewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15 },
    viewHeaderTitle: { color: Colors.elegant.gold, fontFamily: Fonts.bold, fontSize: 16 },
    inputLabel: { color: '#AAA', fontSize: 12, marginBottom: 5, marginTop: 15 },
    inputField: { backgroundColor: '#222', color: 'white', borderRadius: 8, padding: 12, marginBottom: 10 },
    saveBtn: { backgroundColor: Colors.elegant.gold, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    saveBtnText: { fontWeight: 'bold' },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
    typeMiniBtn: { backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    typeMiniBtnActive: { backgroundColor: Colors.elegant.gold },
    typeMiniText: { color: 'white', fontSize: 9 },
    addBtn: { backgroundColor: '#444', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    addBtnText: { color: 'white', fontWeight: 'bold' },
    listItem: { backgroundColor: '#F0F0F0', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    mediaCard: { width: '31%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
    mediaImg: { width: '100%', aspectRatio: 1, backgroundColor: '#222' },
    mediaCardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 6, backgroundColor: '#1a1a1a' },
    mediaCardVisibleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    mediaCardVisibleLabel: { color: '#AAA', fontSize: 10 },
    delMedia: { backgroundColor: 'rgba(255,0,0,0.7)', padding: 6, borderRadius: 8 },
    dangerBtn: { backgroundColor: '#CC0000', padding: 20, borderRadius: 10, alignItems: 'center' },
    dangerBtnText: { color: 'white', fontWeight: 'bold' }
});

import { Colors, Fonts } from '@/constants/theme';
import { HomenajeItem, subscribeToHomenajes } from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomenajesScreen() {
    const router = useRouter();
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [homenajes, setHomenajes] = useState<HomenajeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToHomenajes((items) => {
            setHomenajes(items);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Filter: Hide locked videos from this list
    const visibleVideos = homenajes.filter(v => !v.locked);
    // Count hidden videos to show the "Coming Soon" message
    const hiddenCount = homenajes.length - visibleVideos.length;

    const handlePlay = (id: string) => {
        setPlayingVideoId(id);
    };

    const handleSubscribe = async () => {
        const { status } = await Notifications.getPermissionsAsync();
        let finalStatus = status;
        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            finalStatus = newStatus;
        }
        if (finalStatus !== 'granted') {
            Alert.alert("Permiso denegado", "Necesitamos permiso para avisarte cuando haya nuevos videos.");
            return;
        }

        const token = (await Notifications.getExpoPushTokenAsync({
            projectId: 'barmedina-fa97f' // Replace with your actual project ID or let Expo handle it
        })).data;

        if (token) {
            const { savePushToken } = require('@/services/database');
            await savePushToken(token);
            setNotifEnabled(true);
            Alert.alert("¡Listo!", "Te avisaremos cuando se desbloqueen los próximos videos. 🔔");
        }
    };


    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Homenajes</Text>
            </View>

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.intro}>
                    Disfrutá los mensajes que preparamos para Santi.
                </Text>

                {loading && <ActivityIndicator size="large" color={Colors.elegant.gold} style={{ marginTop: 50 }} />}

                {!loading && visibleVideos.length === 0 && (
                    <View style={styles.emptyState}>
                        <FontAwesome name="film" size={40} color="#CCC" />
                        <Text style={styles.emptyText}>Todavía no hay videos disponibles.</Text>
                    </View>
                )}

                {/* Video List */}
                <View style={styles.videoList}>
                    {visibleVideos.map((video) => (
                        <TouchableOpacity
                            key={video.id}
                            style={styles.videoCard}
                            onPress={() => handlePlay(video.youtubeId)}
                        >
                            <View style={styles.cardInfo}>
                                <Text style={styles.videoTitle}>{video.title}</Text>
                                <View style={styles.actionRow}>
                                    <Text style={styles.actionText}>Ver Homenaje</Text>
                                    <FontAwesome name="play-circle" size={18} color={Colors.elegant.gold} />
                                </View>
                            </View>
                            <FontAwesome name="chevron-right" size={20} color="#DDD" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Coming Soon Section */}
                {hiddenCount > 0 && (
                    <View style={styles.comingSoonContainer}>
                        <View style={styles.comingSoonHeader}>
                            <FontAwesome name="lock" size={24} color="#666" />
                            <Text style={styles.comingSoonTitle}>¡Más homenajes próximamente!</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.bellButton, notifEnabled && styles.bellButtonActive]}
                            onPress={handleSubscribe}
                            disabled={notifEnabled}
                        >
                            <FontAwesome name={notifEnabled ? "bell" : "bell-o"} size={20} color={notifEnabled ? "white" : Colors.river.primary} />
                            <Text style={[styles.bellText, notifEnabled && { color: 'white' }]}>
                                {notifEnabled ? "¡Aviso Activado!" : "Avisame cuando estén listos"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Video Player Overlay */}
            {playingVideoId && (
                <View style={styles.playerOverlay}>
                    <View style={styles.modalBackdrop} onTouchEnd={() => setPlayingVideoId(null)} />
                    <View style={styles.playerWrapper}>
                        <View style={styles.playerHeader}>
                            <Text style={styles.playingTitle}>
                                {visibleVideos.find(v => v.youtubeId === playingVideoId)?.title || 'Video'}
                            </Text>
                            <TouchableOpacity style={styles.closePlayer} onPress={() => setPlayingVideoId(null)}>
                                <FontAwesome name="times" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.playerContainer}>
                            {Platform.OS === 'web' ? (
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <View style={styles.nativeFallback}>
                                    <FontAwesome name="youtube-play" size={80} color="red" />
                                    <Text style={styles.fallbackText}>Reproduciendo...</Text>
                                    <TouchableOpacity
                                        style={styles.nativeBtn}
                                        onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${playingVideoId}`)}
                                    >
                                        <Text style={styles.nativeBtnText}>ABRIR YOUTUBE</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: 'black',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    backButton: { marginRight: 15 },
    headerTitle: {
        color: Colors.elegant.gold,
        fontFamily: Fonts.bold,
        fontSize: 22
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: Colors.elegant.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    intro: {
        fontFamily: Fonts.sans,
        fontSize: 16,
        color: '#AAA',
        marginBottom: 30,
        textAlign: 'center'
    },
    videoList: {
        gap: 15,
    },
    videoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#333',
    },
    cardInfo: {
        flex: 1,
    },
    videoTitle: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: 'white',
        marginBottom: 8
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        fontFamily: Fonts.sans,
        fontSize: 14,
        color: Colors.elegant.gold,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    comingSoonContainer: {
        marginTop: 40,
        padding: 25,
        backgroundColor: '#1A1A1A',
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    comingSoonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10
    },
    comingSoonTitle: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: '#AAA',
        flexShrink: 1
    },
    bellButton: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Colors.elegant.gold,
        alignItems: 'center',
        gap: 10
    },
    bellButtonActive: {
        backgroundColor: Colors.elegant.gold,
        borderColor: Colors.elegant.gold
    },
    bellText: {
        color: Colors.elegant.gold,
        fontFamily: Fonts.bold,
        fontSize: 14
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50,
        gap: 15
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
        fontFamily: Fonts.sans
    },
    playerOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2000,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    playerWrapper: {
        width: '100%',
        maxWidth: 800,
        backgroundColor: '#111',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    playerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#1A1A1A',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    playingTitle: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 16,
        flex: 1,
        marginRight: 10,
    },
    closePlayer: {
        padding: 5,
    },
    playerContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
    },
    nativeFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    fallbackText: {
        color: 'white',
        fontFamily: Fonts.bold,
        marginTop: 20,
        textAlign: 'center'
    },
    nativeBtn: {
        backgroundColor: Colors.elegant.gold,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 30
    },
    nativeBtnText: {
        fontFamily: Fonts.bold,
        color: 'black'
    }
});

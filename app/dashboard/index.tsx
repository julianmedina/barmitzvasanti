import { Colors, Fonts } from '@/constants/theme';
import { NewsAlert, subscribeToConfigs, subscribeToLeaderboard, subscribeToMedia, subscribeToMessages, subscribeToNews, UserScore } from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, LayoutAnimation, Platform, StyleSheet, Text, UIManager, View } from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MESSAGES = [
    "su camiseta de River",
    "llegar tarde a entrenar",
    "pedir milanesa con papas",
    "sus chistes de dudosa calidad",
    "su pasión por el fútbol",
];

const PHOTOS = [
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80',
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80',
    'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?w=800&q=80',
    'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80',
];

const FALLBACK_NEWS: NewsAlert[] = [
    { type: 'INFO', text: "¡BIENVENIDOS AL BAR MITZVA DE SANTI!", timestamp: new Date() },
    { type: 'ALERTA', text: "ESCANEÁ EL QR PARA BAJAR LA APP", timestamp: new Date() },
];

export default function DashboardScreen() {
    // Rotation States
    const [currentMsg, setCurrentMsg] = useState(0);
    const [currentPhoto, setCurrentPhoto] = useState(0);
    const [currentAlert, setCurrentAlert] = useState(0);
    const [leaderboardPage, setLeaderboardPage] = useState(0);

    // Data States
    const [liveNews, setLiveNews] = useState<NewsAlert[]>(FALLBACK_NEWS);
    const [leaderboard, setLeaderboard] = useState<UserScore[]>([]);
    const [livePhotos, setLivePhotos] = useState<string[]>(PHOTOS);
    const [liveMessages, setLiveMessages] = useState<string[]>(MESSAGES);
    const [configs, setConfigs] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    // Constants for Paging
    const ITEMS_PER_PAGE = 8;
    const TOTAL_PAGES = Math.ceil(leaderboard.length / ITEMS_PER_PAGE) || 1;

    useEffect(() => {
        // 1. Subscribe to Leaderboard
        const unsubLeaderboard = subscribeToLeaderboard((data) => {
            // Apply Animation on change
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setLeaderboard(data);
            setLoading(false);
        });

        // 2. Subscribe to News from DB
        const unsubNews = subscribeToNews((news) => {
            const visibleNews = news.filter(n => n.visible !== false);
            if (visibleNews.length > 0) {
                setLiveNews(visibleNews);
            } else {
                setLiveNews([{ type: 'INFO', text: configs.branding || 'EL BAR MITZVA DE MEDINA', timestamp: new Date() }]);
            }
        });

        // 3. Subscribe to Media (Photos)
        const unsubMedia = subscribeToMedia((items) => {
            if (items.length > 0) {
                setLivePhotos(items.map(m => m.url));
            } else {
                setLivePhotos(PHOTOS);
            }
        });

        // 4. Subscribe to Social Messages (Filtered by Visibility)
        const unsubMessages = subscribeToMessages((msgs) => {
            const visible = msgs.filter(m => m.visible !== false).map(m => m.text);
            if (visible.length > 0) {
                setLiveMessages(visible);
            } else {
                setLiveMessages(MESSAGES);
            }
        });

        // 5. Subscribe to Configs
        const unsubConfigs = subscribeToConfigs((data) => {
            setConfigs(data);
        });

        const msgInterval = setInterval(() => {
            setLiveMessages(current => {
                setCurrentMsg(prev => (prev + 1) % current.length);
                return current;
            });
        }, 5000);

        const photoInterval = setInterval(() => {
            setLivePhotos(current => {
                setCurrentPhoto(prev => (prev + 1) % current.length);
                return current;
            });
        }, 7000);

        const alertInterval = setInterval(() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCurrentAlert(prev => (prev + 1) % liveNews.length);
        }, 15000); // 15 seconds per news

        // Leaderboard Paging Interval
        const pageInterval = setInterval(() => {
            setLeaderboardPage(prev => (prev + 1) % TOTAL_PAGES);
        }, 15000); // 15 seconds per page

        return () => {
            unsubLeaderboard();
            unsubNews();
            unsubMedia();
            unsubMessages();
            clearInterval(msgInterval);
            clearInterval(photoInterval);
            clearInterval(alertInterval);
            clearInterval(pageInterval);
        };
    }, [liveNews.length, TOTAL_PAGES, livePhotos.length, liveMessages.length]);

    const activeAlert = liveNews[currentAlert] || { type: 'INFO', text: configs.branding || 'EL BAR MITZVA DE MEDINA' };

    // Live Clock State
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ANIMATION FOR TICKER
    const scrollAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        scrollAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(scrollAnim, {
                    toValue: -2000,
                    duration: 25000,
                    useNativeDriver: true,
                }),
                Animated.timing(scrollAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [activeAlert.text]);

    // Slice leaderboard for current page
    const startIdx = leaderboardPage * ITEMS_PER_PAGE;
    const currentLeaderboard = leaderboard.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    // Derived Stats
    const totalPoints = leaderboard.reduce((acc, curr) => acc + curr.points, 0);
    const totalPlayers = leaderboard.length;
    const totalPhotos = livePhotos.length;
    const totalMessages = liveMessages.length;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.brandingTitle}>{configs.branding || 'SANTI MEDINA'}</Text>
                <View style={styles.headerDivider} />
            </View>

            <View style={styles.mainContent}>

                {/* 1. Left: Leaderboard (Live & Paged) */}
                <View style={styles.leaderboardContainer}>
                    <View style={styles.sectionHeader}>
                        <FontAwesome name="trophy" size={20} color={Colors.elegant.gold} />
                        <Text style={styles.sectionTitle}>RANKING EN VIVO</Text>
                        <View style={styles.pageIndicator}>
                            <Text style={styles.pageLabel}>{leaderboardPage + 1}/{TOTAL_PAGES}</Text>
                        </View>
                    </View>

                    {loading && <ActivityIndicator color={Colors.elegant.gold} style={{ marginTop: 20 }} />}

                    {!loading && leaderboard.length === 0 && (
                        <Text style={styles.emptyLead}>¡Que empiece el juego!</Text>
                    )}

                    <View style={styles.rankList}>
                        {currentLeaderboard.map((item, localIdx) => {
                            const globalIdx = startIdx + localIdx;
                            return (
                                <View key={item.id || globalIdx} style={[
                                    styles.rankItem,
                                    globalIdx === 0 && styles.rankItemGold
                                ]}>
                                    <View style={styles.rankLeft}>
                                        <Text style={[styles.rankNum, globalIdx === 0 && { color: 'black' }]}>
                                            #{globalIdx + 1}
                                        </Text>
                                        <Image source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${item.name}&background=random` }} style={styles.miniAvatar} />
                                        <Text numberOfLines={1} style={[styles.rankName, globalIdx === 0 && { color: 'black', fontFamily: Fonts.bold }]}>
                                            {item.name}
                                        </Text>
                                    </View>
                                    <View style={[styles.rankRight, globalIdx === 0 && { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                                        <Text style={[styles.rankPts, globalIdx === 0 && { color: 'black' }]}>
                                            {item.points.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {leaderboard.length > ITEMS_PER_PAGE && (
                        <View style={styles.moreIndicator}>
                            <Text style={styles.moreText}>MÁS POSICIONES ABAJO...</Text>
                        </View>
                    )}
                </View>

                {/* 2. Middle: Dynamic Photo Slideshow */}
                <View style={styles.centralPanel}>
                    <View style={styles.slideshowContainer}>
                        <Image source={{ uri: livePhotos[currentPhoto] || PHOTOS[0] }} style={styles.mainPhoto} />
                        {/* Caption removed as per request */}
                    </View>
                </View>


                {/* 3. Right: QR + Social Wall */}
                <View style={styles.rightSidebar}>

                    <View style={styles.qrSection}>
                        <Text style={styles.qrTitle}>{configs.branding || 'SANTI MEDINA'}</Text>
                        <Text style={[styles.qrTitle, { fontSize: 18, marginTop: -15, color: 'rgba(0,0,0,0.6)' }]}>EXPERIENCIA INTERACTIVA</Text>
                        <View style={styles.qrBox}>
                            <Image
                                source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://bar-mitzva-medina.vercel.app' }}
                                style={styles.qrImage}
                            />
                        </View>
                        <View style={styles.qrArrowContainer}>
                            <FontAwesome name="mobile-phone" size={28} color="black" />
                            <Text style={styles.qrFooter}>ESCANEÁ PARA JUGAR</Text>
                        </View>
                    </View>

                    <View style={styles.socialCard}>
                        <View style={styles.socialHeader}>
                            <FontAwesome name="commenting" size={28} color={Colors.river.primary} />
                            <Text style={styles.socialTitle}>{configs.social_title || 'SANTI NO ES SANTI SIN...'}</Text>
                        </View>
                        <View style={styles.messageBox}>
                            <Text style={styles.socialMessage}>"{liveMessages[currentMsg] || MESSAGES[0]}"</Text>
                        </View>
                        <View style={styles.socialGlow} />
                    </View>

                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>{totalPhotos}</Text>
                            <Text style={styles.statLab}>FOTOS</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>{totalPlayers}</Text>
                            <Text style={styles.statLab}>PLAYERS</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>{totalMessages}</Text>
                            <Text style={styles.statLab}>IDEAS</Text>
                        </View>
                    </View>

                </View>

            </View>

            {/* Footer: TV Style Zocalo */}
            <View style={styles.zocalo}>
                <View style={[
                    styles.zocaloBrand,
                    activeAlert.type === 'URGENTE' && { backgroundColor: '#FF0000' },
                    activeAlert.type === 'ULTIMO MOMENTO' && { backgroundColor: '#FF8800' },
                    activeAlert.type === 'ALERTA' && { backgroundColor: Colors.elegant.gold }
                ]}>
                    <Text style={[
                        styles.zocaloBrandText,
                        activeAlert.type === 'ALERTA' && { color: 'black' }
                    ]}>
                        {activeAlert.type}
                    </Text>
                    {activeAlert.type === 'URGENTE' && <View style={styles.liveDot} />}
                </View>
                <View style={styles.zocaloContent}>
                    <Animated.View style={{
                        transform: [{ translateX: scrollAnim }],
                        flexDirection: 'row',
                    }}>
                        <Text style={styles.tickerText} numberOfLines={1}>
                            {activeAlert.text.toUpperCase()} • {activeAlert.text.toUpperCase()} • {activeAlert.text.toUpperCase()}
                        </Text>
                    </Animated.View>
                </View>
                <View style={styles.zocaloTime}>
                    <Text style={styles.timeText}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        padding: 30,
        paddingBottom: 0,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    brandingTitle: {
        fontFamily: Fonts.bold,
        fontSize: 56, // Increased
        color: Colors.elegant.gold,
        letterSpacing: 12,
        textShadowColor: 'rgba(212, 175, 55, 0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 15,
    },
    headerDivider: {
        width: 100,
        height: 4,
        backgroundColor: Colors.elegant.gold,
        marginTop: 10,
        borderRadius: 2,
    },
    mainContent: {
        flex: 1,
        flexDirection: 'row',
        gap: 25,
        marginBottom: 80,
    },
    leaderboardContainer: {
        width: 480, // Increased
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        borderRadius: 30,
        padding: 30,
        borderWidth: 2,
        borderColor: '#444',
        shadowColor: Colors.elegant.gold,
        shadowOpacity: 0.2,
        shadowRadius: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
        paddingBottom: 10,
    },
    sectionTitle: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 24, // Increased
        flex: 1,
    },
    pageIndicator: {
        backgroundColor: '#333',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pageLabel: {
        color: Colors.elegant.gold,
        fontSize: 16, // Increased
        fontFamily: Fonts.bold,
    },
    emptyLead: {
        color: '#666',
        textAlign: 'center',
        marginTop: 60,
        fontSize: 20,
        fontStyle: 'italic'
    },
    rankList: {
        flex: 1,
    },
    rankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1a1a1a',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    rankItemGold: {
        backgroundColor: Colors.elegant.gold,
        borderColor: 'white',
        transform: [{ scale: 1.02 }],
    },
    rankLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rankNum: {
        color: '#888',
        fontFamily: Fonts.bold,
        fontSize: 22, // Increased
        width: 45,
    },
    miniAvatar: {
        width: 44, // Increased
        height: 44,
        borderRadius: 22,
        marginRight: 15,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    rankName: {
        flex: 1,
        color: 'white',
        fontFamily: Fonts.sans,
        fontSize: 24, // Increased
    },
    rankRight: {
        backgroundColor: '#222',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    rankPts: {
        color: Colors.elegant.gold,
        fontFamily: Fonts.bold,
        fontSize: 24, // Increased
    },
    moreIndicator: {
        alignItems: 'center',
        paddingTop: 15,
    },
    moreText: {
        color: '#555',
        fontSize: 12,
        fontFamily: Fonts.bold,
        letterSpacing: 2,
    },
    centralPanel: {
        flex: 1,
        backgroundColor: '#111',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    slideshowContainer: {
        flex: 1,
        position: 'relative',
    },
    mainPhoto: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    photoCaption: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    captionText: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 16,
        letterSpacing: 2,
    },
    rightSidebar: {
        width: 420, // Increased
        gap: 30,
    },
    qrSection: {
        backgroundColor: Colors.elegant.gold,
        padding: 30,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        elevation: 10,
    },
    qrTitle: {
        fontFamily: Fonts.bold,
        fontSize: 28, // Increased
        color: 'black',
        marginBottom: 15,
        textAlign: 'center',
    },
    qrBox: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: 'black',
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    qrImage: {
        width: 180, // Increased
        height: 180,
    },
    qrArrowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    qrFooter: {
        fontFamily: Fonts.bold,
        fontSize: 18, // Increased
        color: 'black',
    },
    socialCard: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        borderColor: Colors.river.primary,
        shadowColor: Colors.river.primary,
        shadowOpacity: 0.1,
    },
    socialHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    socialTitle: {
        color: Colors.river.primary,
        fontFamily: Fonts.bold,
        fontSize: 22, // Increased
        textAlign: 'center',
    },
    messageBox: {
        flex: 1,
        justifyContent: 'center',
    },
    socialMessage: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 42, // Significantly Increased
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 52,
        textShadowColor: 'rgba(228, 0, 43, 0.4)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    zocalo: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        height: 60,
        flexDirection: 'row',
        backgroundColor: '#1E1E1E',
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#444',
    },
    zocaloBrand: {
        backgroundColor: Colors.river.primary,
        width: 180,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    zocaloBrandText: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 16,
    },
    liveDot: {
        width: 12,
        height: 12,
        backgroundColor: 'white',
        borderRadius: 6,
    },
    zocaloContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 25,
        overflow: 'hidden', // Crucial for marquee
    },
    tickerText: {
        color: 'white',
        fontFamily: Fonts.bold, // Stronger
        fontSize: 32,
        minWidth: 4000, // Even wider for repetition
    },
    zocaloTime: {
        backgroundColor: '#333',
        paddingHorizontal: 40,
        justifyContent: 'center',
    },
    timeText: {
        color: Colors.elegant.gold,
        fontFamily: Fonts.bold,
        fontSize: 32,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#333',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statVal: {
        color: 'white',
        fontSize: 28,
        fontFamily: Fonts.bold,
    },
    statLab: {
        color: Colors.elegant.gold,
        fontSize: 12,
        fontFamily: Fonts.bold,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#333',
    },
    socialGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Colors.river.primary,
        opacity: 0.3,
        shadowColor: Colors.river.primary,
        shadowOpacity: 0.5,
        shadowRadius: 20,
    }
});

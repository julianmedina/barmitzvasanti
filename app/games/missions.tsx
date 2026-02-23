import { Colors, Fonts } from '@/constants/theme';
import {
    Mission,
    auth,
    ensureUserMissionAssignment,
    subscribeToCurrentUserScore,
    subscribeToMissionAssignment,
    subscribeToMissions,
    subscribeToUserMissionProgress,
} from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const TOTAL_MISSIONS = 13;

export default function MissionsScreen() {
    const router = useRouter();
    const [poolMissions, setPoolMissions] = useState<Mission[]>([]);
    const [assignmentIds, setAssignmentIds] = useState<string[] | null>(null);
    const [completedIds, setCompletedIds] = useState<string[]>([]);
    const [userPoints, setUserPoints] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const ensuredOnce = useRef(false);
    const scaleCelebration = useRef(new Animated.Value(0)).current;
    const opacityCelebration = useRef(new Animated.Value(0)).current;

    const user = auth.currentUser;
    const userId = user?.uid ?? null;
    const params = useLocalSearchParams<{ celebrate?: string }>();

    useFocusEffect(
        React.useCallback(() => {
            if (params.celebrate === '1') {
                runCelebration();
                router.setParams({ celebrate: undefined });
            }
        }, [params.celebrate])
    );

    useEffect(() => {
        const unsubM = subscribeToMissions((list) =>
            setPoolMissions(list.filter((m) => m.active !== false))
        );
        return () => unsubM();
    }, []);

    useEffect(() => {
        if (!userId) return;
        const unsubA = subscribeToMissionAssignment(userId, (assignment) => {
            setAssignmentIds(assignment?.missionIds ?? null);
        });
        const unsubP = subscribeToUserMissionProgress(userId, (progress) =>
            setCompletedIds(progress?.completedMissionIds ?? [])
        );
        const unsubScore = subscribeToCurrentUserScore(userId, setUserPoints);
        return () => {
            unsubA();
            unsubP();
            unsubScore();
        };
    }, [userId]);

    useEffect(() => {
        if (!userId || poolMissions.length < 13 || ensuredOnce.current) return;
        ensuredOnce.current = true;
        const poolIds = poolMissions.map((m) => m.id!).filter(Boolean);
        ensureUserMissionAssignment(userId, poolIds).catch((e) => {
            console.error("ensureUserMissionAssignment", e);
            ensuredOnce.current = false;
        });
    }, [userId, poolMissions.length]);

    const myMissions: Mission[] = assignmentIds
        ? assignmentIds
            .map((id) => poolMissions.find((m) => m.id === id))
            .filter((m): m is Mission => Boolean(m))
        : [];
    const currentIndex = myMissions.findIndex((m) => m.id && !completedIds.includes(m.id));
    const allCompleted = myMissions.length > 0 && currentIndex < 0;
    const currentMission =
        currentIndex >= 0 ? myMissions[currentIndex] : (allCompleted ? null : myMissions[myMissions.length - 1]);
    const isVideoMission = currentMission?.type === 'video';

    const runCelebration = () => {
        setShowCelebration(true);
        scaleCelebration.setValue(0);
        opacityCelebration.setValue(0);
        Animated.parallel([
            Animated.timing(scaleCelebration, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
            }),
            Animated.timing(opacityCelebration, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setTimeout(() => {
                Animated.timing(opacityCelebration, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }).start(() => setShowCelebration(false));
            }, 1500);
        });
    };

    const handleOpenCamera = () => {
        if (!currentMission?.id) return;
        router.push({
            pathname: '/games/camera',
            params: {
                prenda: currentMission.title ?? 'Misión',
                missionId: currentMission.id,
                mode: isVideoMission ? 'video' : 'photo',
                completedCount: String(completedIds.length),
            },
        });
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={22} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>MISIONES</Text>
                <View style={styles.backBtn} />
            </View>

            {/* Progreso: X / 13 + puntos integrados */}
            <View style={styles.progressBlock}>
                <Text style={styles.progressBig}>
                    {completedIds.length} <Text style={styles.progressSlash}>/</Text> {TOTAL_MISSIONS}
                </Text>
                <Text style={styles.progressLabel}>misiones completadas</Text>
                <Text style={styles.progressPoints}>{userPoints.toLocaleString('es-AR')} puntos</Text>
                <View style={styles.dotsRow}>
                    {Array.from({ length: TOTAL_MISSIONS }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i < completedIds.length && styles.dotDone,
                            ]}
                        />
                    ))}
                </View>
            </View>

            {/* Misión actual: solo ícono + título (1 línea), sin scroll */}
            {currentMission && !allCompleted && (
                <View style={styles.currentBlock}>
                    <View style={styles.currentRow}>
                        <Text style={styles.currentIcon}>{currentMission.icon ?? '🎯'}</Text>
                        <Text style={styles.currentTitle} numberOfLines={2}>
                            {currentMission.title}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.cameraButton}
                        onPress={handleOpenCamera}
                        activeOpacity={0.8}
                    >
                        {isVideoMission ? (
                            <>
                                <FontAwesome name="video-camera" size={22} color="white" style={styles.btnIcon} />
                                <Text style={styles.cameraButtonText}>Grabar video</Text>
                            </>
                        ) : (
                            <>
                                <FontAwesome name="camera" size={22} color="white" style={styles.btnIcon} />
                                <Text style={styles.cameraButtonText}>Sacar foto</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {poolMissions.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No hay misiones cargadas.</Text>
                </View>
            )}

            {userId && poolMissions.length >= 13 && myMissions.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Asignando tus 13 misiones...</Text>
                </View>
            )}

            {allCompleted && (
                <View style={styles.allDoneBlock}>
                    <Text style={styles.allDoneEmoji}>🏆</Text>
                    <Text style={styles.allDoneTitle}>¡Las 13 completadas!</Text>
                </View>
            )}

            {showCelebration && (
                <Animated.View
                    style={[
                        styles.celebrationOverlay,
                        {
                            opacity: opacityCelebration,
                            transform: [{ scale: scaleCelebration }],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <Text style={styles.celebrationEmoji}>🎉</Text>
                    <Text style={styles.celebrationTitle}>¡Misión completada!</Text>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        paddingTop: 48,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontFamily: Fonts.bold,
        fontSize: 22,
        color: 'white',
        letterSpacing: 1,
        textAlign: 'center',
    },
    progressBlock: {
        alignItems: 'center',
        marginBottom: 20,
    },
    progressBig: {
        fontFamily: Fonts.bold,
        fontSize: 42,
        color: 'white',
    },
    progressSlash: {
        color: Colors.elegant.gold,
        fontSize: 38,
    },
    progressLabel: {
        fontFamily: Fonts.light,
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    progressPoints: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: Colors.elegant.gold,
        marginTop: 6,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    dotDone: {
        backgroundColor: Colors.elegant.gold,
    },
    currentBlock: {
        flex: 1,
        justifyContent: 'center',
        maxHeight: 220,
    },
    currentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.25)',
        marginBottom: 16,
    },
    currentIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    currentTitle: {
        flex: 1,
        fontFamily: Fonts.sans,
        fontSize: 15,
        color: 'white',
    },
    cameraButton: {
        flexDirection: 'row',
        backgroundColor: Colors.river.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnIcon: {
        marginRight: 10,
    },
    cameraButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: 'white',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontFamily: Fonts.sans,
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
    },
    allDoneBlock: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    allDoneEmoji: { fontSize: 56, marginBottom: 8 },
    allDoneTitle: { fontFamily: Fonts.bold, fontSize: 22, color: '#FFD700' },
    celebrationOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    celebrationEmoji: { fontSize: 64, marginBottom: 12 },
    celebrationTitle: {
        fontFamily: Fonts.bold,
        fontSize: 24,
        color: '#FFD700',
    },
});

import { Colors, Fonts } from '@/constants/theme';
import {
    Mission,
    auth,
    ensureUserMissionAssignment,
    skipMission,
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
    const [skippedIds, setSkippedIds] = useState<string[]>([]);
    const [userPoints, setUserPoints] = useState(0);
    const [skippingId, setSkippingId] = useState<string | null>(null);
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
        const unsubP = subscribeToUserMissionProgress(userId, (progress) => {
            setCompletedIds(progress?.completedMissionIds ?? []);
            setSkippedIds(progress?.skippedMissionIds ?? []);
        });
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
    const currentIndex = myMissions.findIndex(
        (m) => m.id && !completedIds.includes(m.id) && !skippedIds.includes(m.id)
    );
    const allResolved = myMissions.length > 0 && (completedIds.length + skippedIds.length) >= myMissions.length;
    const currentMission =
        currentIndex >= 0 ? myMissions[currentIndex] : (allResolved ? null : myMissions[myMissions.length - 1]);
    const isVideoMission = currentMission?.type === 'video';

    const handleSkipMission = async () => {
        if (!currentMission?.id || !userId || skippingId) return;
        setSkippingId(currentMission.id);
        try {
            await skipMission(userId, currentMission.id);
        } catch (e) {
            console.error(e);
        } finally {
            setSkippingId(null);
        }
    };

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

            {/* 13 boxes: ✓ completada, ✗ salteada, vacío pendiente */}
            <View style={styles.progressBlock}>
                <Text style={styles.progressPoints}>{userPoints.toLocaleString('es-AR')} puntos</Text>
                <View style={styles.boxesRow}>
                    {myMissions.slice(0, TOTAL_MISSIONS).map((mission, i) => {
                        const completed = mission.id && completedIds.includes(mission.id);
                        const skipped = mission.id && skippedIds.includes(mission.id);
                        return (
                            <View
                                key={mission.id ?? i}
                                style={[
                                    styles.missionBox,
                                    completed && styles.missionBoxDone,
                                    skipped && styles.missionBoxSkipped,
                                    mission.id === currentMission?.id && styles.missionBoxCurrent,
                                ]}
                            >
                                {completed ? (
                                    <FontAwesome name="check" size={18} color="#2ECC71" />
                                ) : skipped ? (
                                    <FontAwesome name="times" size={18} color="#E74C3C" />
                                ) : (
                                    <Text style={styles.missionBoxNum}>{i + 1}</Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Misión actual: completar o saltear */}
            {currentMission && !allResolved && (
                <View style={styles.currentBlock}>
                    <View style={styles.currentRow}>
                        <Text style={styles.currentIcon}>{currentMission.icon ?? '🎯'}</Text>
                        <Text style={styles.currentTitle} numberOfLines={2}>
                            {currentMission.title}
                        </Text>
                    </View>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.cameraButton, styles.actionBtnFlex]}
                            onPress={handleOpenCamera}
                            activeOpacity={0.8}
                        >
                            {isVideoMission ? (
                                <>
                                    <FontAwesome name="video-camera" size={20} color="white" style={styles.btnIcon} />
                                    <Text style={styles.cameraButtonText}>Grabar video</Text>
                                </>
                            ) : (
                                <>
                                    <FontAwesome name="camera" size={20} color="white" style={styles.btnIcon} />
                                    <Text style={styles.cameraButtonText}>Sacar foto</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.skipButton, styles.actionBtnFlex]}
                            onPress={handleSkipMission}
                            disabled={!!skippingId}
                        >
                            <FontAwesome name="times" size={20} color="white" style={styles.btnIcon} />
                            <Text style={styles.skipButtonText}>Saltear</Text>
                        </TouchableOpacity>
                    </View>
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

            {allResolved && (
                <View style={styles.allDoneBlock}>
                    <Text style={styles.allDoneEmoji}>🏆</Text>
                    <Text style={styles.allDoneTitle}>
                        {completedIds.length === TOTAL_MISSIONS ? '¡Las 13 completadas!' : '¡Listo! 13 misiones'}
                    </Text>
                    <Text style={styles.progressPoints}>{userPoints.toLocaleString('es-AR')} puntos</Text>
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
        marginBottom: 16,
    },
    progressPoints: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: Colors.elegant.gold,
        marginBottom: 10,
    },
    boxesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    missionBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    missionBoxDone: {
        backgroundColor: 'rgba(46,204,113,0.3)',
        borderColor: '#2ECC71',
    },
    missionBoxSkipped: {
        backgroundColor: 'rgba(231,76,60,0.25)',
        borderColor: '#E74C3C',
    },
    missionBoxCurrent: {
        borderColor: Colors.elegant.gold,
        backgroundColor: 'rgba(255,215,0,0.2)',
    },
    missionBoxNum: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
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
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtnFlex: {
        flex: 1,
    },
    cameraButton: {
        flexDirection: 'row',
        backgroundColor: Colors.river.primary,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipButton: {
        flexDirection: 'row',
        backgroundColor: 'rgba(231,76,60,0.9)',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnIcon: {
        marginRight: 8,
    },
    cameraButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: 'white',
    },
    skipButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 16,
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

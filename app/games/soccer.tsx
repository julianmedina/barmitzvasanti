import { Colors, Fonts } from '@/constants/theme';
import { updatePlayerScore } from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_SIZE = 50;
const BALL_SIZE = 20;
const DEFENDER_SIZE = 60;
const FIELD_COLOR = '#4a8c3c'; // Grass Green

export default function SoccerGame() {
    const router = useRouter();

    // Game State
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GOAL' | 'BLOCKED'>('IDLE');

    // Positions
    const playerX = useRef(new Animated.Value(SCREEN_WIDTH / 2 - PLAYER_SIZE / 2)).current;
    const defenderX = useRef(new Animated.Value(SCREEN_WIDTH / 2 - DEFENDER_SIZE / 2)).current;
    const ballPos = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH / 2 - BALL_SIZE / 2, y: SCREEN_HEIGHT - 150 })).current;

    // Refs for logic
    const playerXVal = useRef(SCREEN_WIDTH / 2 - PLAYER_SIZE / 2);
    const defenderXVal = useRef(SCREEN_WIDTH / 2 - DEFENDER_SIZE / 2);

    useEffect(() => {
        const pListener = playerX.addListener(({ value }) => playerXVal.current = value);
        const dListener = defenderX.addListener(({ value }) => defenderXVal.current = value);
        return () => {
            playerX.removeListener(pListener);
            defenderX.removeListener(dListener);
        };
    }, []);

    useEffect(() => {
        if (gameState === 'PLAYING') {
            startDefenderMovement();
        } else {
            defenderX.stopAnimation();
        }
    }, [gameState]);

    const startDefenderMovement = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(defenderX, {
                    toValue: 20,
                    duration: 2000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease)
                }),
                Animated.timing(defenderX, {
                    toValue: SCREEN_WIDTH - DEFENDER_SIZE - 20,
                    duration: 2000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease)
                })
            ])
        ).start();
    };

    const startGame = () => {
        setScore(0);
        resetRound();
        setGameState('PLAYING');
    };

    const resetRound = () => {
        ballPos.setValue({ x: playerXVal.current + PLAYER_SIZE / 2 - BALL_SIZE / 2, y: SCREEN_HEIGHT - 180 });
    };

    const movePlayer = (direction: number) => {
        if (gameState !== 'PLAYING') return;

        let newX = playerXVal.current + (direction * 30);
        if (newX < 0) newX = 0;
        if (newX > SCREEN_WIDTH - PLAYER_SIZE) newX = SCREEN_WIDTH - PLAYER_SIZE;

        Animated.timing(playerX, {
            toValue: newX,
            duration: 100,
            useNativeDriver: true
        }).start();

        ballPos.setValue({ x: newX + PLAYER_SIZE / 2 - BALL_SIZE / 2, y: SCREEN_HEIGHT - 180 });
    };

    const shoot = () => {
        if (gameState !== 'PLAYING') return;

        const targetY = 100;
        const duration = 500;

        Animated.timing(ballPos, {
            toValue: { x: playerXVal.current + PLAYER_SIZE / 2 - BALL_SIZE / 2, y: targetY },
            duration: duration,
            useNativeDriver: true,
            easing: Easing.linear
        }).start(({ finished }) => {
            if (finished) checkCollision();
        });
    };

    const checkCollision = async () => {
        const defCenter = defenderXVal.current + DEFENDER_SIZE / 2;
        const ballCenter = playerXVal.current + PLAYER_SIZE / 2;

        const diff = Math.abs(defCenter - ballCenter);

        if (diff < 15) {
            // GOAL (Caño)
            setGameState('GOAL');
            const newScore = score + 1;
            setScore(newScore);

            // SAVE TO DB: +50 points for a "Caño"
            await updatePlayerScore(50);

            setTimeout(() => {
                setGameState('PLAYING');
                resetRound();
            }, 2000);
        } else {
            setGameState('BLOCKED');
            setTimeout(() => {
                setGameState('PLAYING');
                resetRound();
            }, 2000);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.scoreText}>CAÑOS: {score}</Text>
                    <Text style={styles.ptsText}>+{score * 50} PTS GANADOS</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <FontAwesome name="close" size={20} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.field}>
                <View style={styles.midCircle} />
                <View style={styles.midLine} />

                <Animated.View style={[styles.defender, { transform: [{ translateX: defenderX }] }]}>
                    <Image
                        source={{ uri: 'https://ui-avatars.com/api/?name=Santi+Medina&background=random' }}
                        style={styles.avatar}
                    />
                    <View style={styles.legsContainer}>
                        <View style={styles.leg} />
                        <View style={styles.gap} />
                        <View style={styles.leg} />
                    </View>
                </Animated.View>

                <Animated.View style={[styles.ball, { transform: ballPos.getTranslateTransform() }]} />

                <Animated.View style={[styles.player, { transform: [{ translateX: playerX }] }]}>
                    <Image
                        source={{ uri: 'https://ui-avatars.com/api/?name=Yo&background=0D8ABC&color=fff' }}
                        style={styles.avatar}
                    />
                </Animated.View>

                {(gameState === 'GOAL' || gameState === 'BLOCKED') && (
                    <View style={styles.feedbackOverlay}>
                        <Text style={[styles.feedbackText, gameState === 'GOAL' ? styles.textGoal : styles.textMiss]}>
                            {gameState === 'GOAL' ? '¡CAÑO!' : '¡BLOQUEADO!'}
                        </Text>
                        {gameState === 'GOAL' && <Text style={styles.plusPts}>+50 PUNTOS</Text>}
                    </View>
                )}

            </View>

            <View style={styles.controlsArea}>
                {gameState === 'IDLE' ? (
                    <TouchableOpacity style={styles.playBtn} onPress={startGame}>
                        <Text style={styles.playBtnText}>EMPEZAR PARTIDO</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.gameControls}>
                        <View style={styles.moveButtons}>
                            <TouchableOpacity style={styles.ctrlBtn} onPress={() => movePlayer(-1)}>
                                <FontAwesome name="chevron-left" size={30} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.ctrlBtn} onPress={() => movePlayer(1)}>
                                <FontAwesome name="chevron-right" size={30} color="white" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.shootBtn} onPress={shoot}>
                            <Text style={styles.shootText}>¡TIRÁ CAÑO!</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
    },
    scoreText: {
        color: Colors.elegant.gold,
        fontSize: 24,
        fontFamily: Fonts.bold
    },
    ptsText: {
        color: '#888',
        fontSize: 12,
        fontFamily: Fonts.sans
    },
    closeBtn: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20
    },
    field: {
        flex: 1,
        backgroundColor: FIELD_COLOR,
        margin: 10,
        borderRadius: 10,
        borderColor: 'white',
        borderWidth: 2,
        overflow: 'hidden',
        position: 'relative'
    },
    midCircle: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 50,
        alignSelf: 'center',
        top: '50%',
        marginTop: -50
    },
    midLine: {
        position: 'absolute',
        width: '100%',
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        top: '50%'
    },
    defender: {
        position: 'absolute',
        top: 50,
        width: DEFENDER_SIZE,
        alignItems: 'center'
    },
    player: {
        position: 'absolute',
        bottom: 50,
        width: PLAYER_SIZE,
        alignItems: 'center'
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: 'white'
    },
    legsContainer: {
        flexDirection: 'row',
        marginTop: -10,
        justifyContent: 'space-between',
        width: 40
    },
    leg: {
        width: 10,
        height: 30,
        backgroundColor: 'black',
        borderRadius: 5
    },
    gap: {
        width: 15
    },
    ball: {
        position: 'absolute',
        width: BALL_SIZE,
        height: BALL_SIZE,
        backgroundColor: 'white',
        borderRadius: BALL_SIZE / 2,
        borderWidth: 1,
        borderColor: '#ccc'
    },
    controlsArea: {
        height: 150,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20
    },
    playBtn: {
        backgroundColor: Colors.macabi.primary,
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30
    },
    playBtnText: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 18
    },
    gameControls: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 20
    },
    moveButtons: {
        flexDirection: 'row',
        gap: 20
    },
    ctrlBtn: {
        width: 60,
        height: 60,
        backgroundColor: '#333',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#555'
    },
    shootBtn: {
        backgroundColor: Colors.river.primary,
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'white',
        shadowColor: "red",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5
    },
    shootText: {
        color: 'white',
        fontFamily: Fonts.bold,
        textAlign: 'center',
        fontSize: 18
    },
    feedbackOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 20
    },
    feedbackText: {
        fontSize: 50,
        fontFamily: Fonts.bold,
        textShadowColor: 'black',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 5
    },
    plusPts: {
        fontSize: 24,
        color: Colors.elegant.gold,
        fontFamily: Fonts.bold,
        marginTop: 10
    },
    textGoal: { color: '#4CC9F0' },
    textMiss: { color: '#F72585' }
});

import { Colors, Fonts } from '@/constants/theme';
import { getTriviaQuestionsOnce, getTriviaVideosOnce, getTriviaVideoPlayback, TriviaQuestion, TriviaVideo, updatePlayerScore } from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Audio, Video } from 'expo-av';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TriviaYouTubePlayer from './TriviaYouTubePlayer';

const TOTAL_GAME_SECONDS = 30;
const SECONDS_PER_QUESTION = 8;

// Fallback if DB has no questions
const FALLBACK_QUESTIONS: TriviaQuestion[] = [
    { question: '¿De qué cuadro es Medina?', options: ['Boca', 'River', 'Atlanta', 'Racing'], correctIndex: 1, order: 0 }
];

function shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export default function TriviaGame() {
    const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
    const [videos, setVideos] = useState<TriviaVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState<TriviaQuestion[]>([]);
    const [score, setScore] = useState(0);
    const [totalTimeLeft, setTotalTimeLeft] = useState(TOTAL_GAME_SECONDS);
    const [questionTimeLeft, setQuestionTimeLeft] = useState(SECONDS_PER_QUESTION);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [currentVideoPlayback, setCurrentVideoPlayback] = useState<{ type: 'youtube'; youtubeId: string } | { type: 'drive'; url: string } | null>(null);
    const [answered, setAnswered] = useState(false);

    const router = useRouter();
    const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const soundCorrectRef = useRef<Audio.Sound | null>(null);
    const soundWrongRef = useRef<Audio.Sound | null>(null);
    const scoreRef = useRef(0);
    scoreRef.current = score;

    const loadSounds = useCallback(async () => {
        try {
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true, playThroughEarpieceAndroid: false });
            const { sound: s1 } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2000.m4a' } // short correct
            );
            soundCorrectRef.current = s1;
            const { sound: s2 } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2568.m4a' } // wrong
            );
            soundWrongRef.current = s2;
        } catch (e) {
            console.warn('Trivia sounds failed to load', e);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [qList, vList] = await Promise.all([getTriviaQuestionsOnce(), getTriviaVideosOnce()]);
                if (mounted) {
                    setQuestions(qList);
                    setVideos(vList);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const startGame = useCallback(() => {
        const list = questions.length > 0 ? questions : FALLBACK_QUESTIONS;
        setShuffledQuestions(shuffle(list));
        setGameStarted(true);
        setGameOver(false);
        setScore(0);
        setCurrentQIndex(0);
        setTotalTimeLeft(TOTAL_GAME_SECONDS);
        setQuestionTimeLeft(SECONDS_PER_QUESTION);
        setShowVideo(false);
        setCurrentVideoPlayback(null);
        setAnswered(false);
        loadSounds();
    }, [questions, loadSounds]);

    const list = useMemo(() => shuffledQuestions.length ? shuffledQuestions : (questions.length ? questions : FALLBACK_QUESTIONS), [shuffledQuestions, questions]);
    const currentQ = list[currentQIndex];
    const displayOptions = useMemo(() => {
        if (!currentQ) return { options: [] as string[], correctIndex: 0 };
        const opts = shuffle([...currentQ.options]);
        const correctIndex = opts.indexOf(currentQ.options[currentQ.correctIndex]);
        return { options: opts, correctIndex };
    }, [currentQIndex, currentQ?.question]);

    // Total 30s countdown
    useEffect(() => {
        if (!gameStarted || gameOver || showVideo) return;
        if (totalTimeLeft <= 0) {
            endGame(scoreRef.current);
            return;
        }
        totalTimerRef.current = setInterval(() => {
            setTotalTimeLeft(prev => {
                if (prev <= 1) {
                    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (totalTimerRef.current) clearInterval(totalTimerRef.current);
        };
    }, [gameStarted, gameOver, showVideo, totalTimeLeft, score]);

    // Per-question countdown (only when not answered)
    useEffect(() => {
        if (!gameStarted || gameOver || showVideo || answered) return;
        if (questionTimeLeft <= 0) {
            handleAnswer(-1);
            return;
        }
        questionTimerRef.current = setInterval(() => {
            setQuestionTimeLeft(prev => prev - 1);
        }, 1000);
        return () => {
            if (questionTimerRef.current) clearInterval(questionTimerRef.current);
        };
    }, [gameStarted, gameOver, showVideo, questionTimeLeft, answered]);

    const pickRandomVideo = useCallback((): { type: 'youtube'; youtubeId: string } | { type: 'drive'; url: string } | null => {
        const valid = videos.map((v) => getTriviaVideoPlayback(v)).filter((x): x is NonNullable<ReturnType<typeof getTriviaVideoPlayback>> => x != null);
        if (valid.length === 0) return null;
        return valid[Math.floor(Math.random() * valid.length)];
    }, [videos]);

    const handleAnswer = useCallback((selectedOptionIndex: number) => {
        if (answered) return;
        setAnswered(true);
        const list = shuffledQuestions.length ? shuffledQuestions : (questions.length ? questions : FALLBACK_QUESTIONS);
        const q = list[currentQIndex];
        if (!q) return;
        const isCorrect = selectedOptionIndex === displayOptions.correctIndex;
        if (isCorrect) {
            const points = 100 + questionTimeLeft * 10;
            setScore(s => s + points);
            soundCorrectRef.current?.replayAsync().catch(() => {});
            nextQuestion();
        } else {
            // Perdiste: sonido y ver video; después del video va a pantalla de resultado
            soundWrongRef.current?.replayAsync().catch(() => {});
            const playback = pickRandomVideo();
            if (playback) {
                setCurrentVideoPlayback(playback);
                setShowVideo(true);
            } else {
                endGame(scoreRef.current);
            }
        }
    }, [answered, shuffledQuestions, currentQIndex, questions, questionTimeLeft, pickRandomVideo, displayOptions]);

    const nextQuestion = useCallback(() => {
        const list = shuffledQuestions.length ? shuffledQuestions : (questions.length ? questions : FALLBACK_QUESTIONS);
        if (currentQIndex + 1 >= list.length) {
            setShuffledQuestions(shuffle(questions.length ? questions : FALLBACK_QUESTIONS));
            setCurrentQIndex(0);
        } else {
            setCurrentQIndex(prev => prev + 1);
        }
        setQuestionTimeLeft(SECONDS_PER_QUESTION);
        setAnswered(false);
    }, [shuffledQuestions, currentQIndex, questions]);

    const onVideoFinished = useCallback(() => {
        setShowVideo(false);
        setCurrentVideoPlayback(null);
        endGame(scoreRef.current);
    }, []);

    const endGame = async (finalScore: number) => {
        setGameOver(true);
        if (totalTimerRef.current) clearInterval(totalTimerRef.current);
        if (questionTimerRef.current) clearInterval(questionTimerRef.current);
        setIsSaving(true);
        try {
            await updatePlayerScore(finalScore);
            Alert.alert("¡Trivia Terminada!", `Tu puntaje final es: ${finalScore} puntos. ¡Ya se sumaron a tu ranking!`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={Colors.river.primary} />
                <Text style={styles.loadingText}>Cargando trivia...</Text>
            </View>
        );
    }

    if (!gameStarted) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.card}>
                    <FontAwesome name="question-circle-o" size={80} color={Colors.river.primary} />
                    <Text style={styles.introTitle}>¿CUÁNTO SABÉS DE MEDINA EN 30 SEGUNDOS?</Text>
                    <Text style={styles.introText}>Respondé rápido. Si fallás, mirá un video para seguir jugando.</Text>
                    <TouchableOpacity style={styles.playButton} onPress={startGame}>
                        <Text style={styles.playText}>JUGAR AHORA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                        <Text style={{ color: '#666', fontFamily: Fonts.sans }}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (showVideo && currentVideoPlayback) {
        const isYoutube = currentVideoPlayback.type === 'youtube';
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.videoWrapper}>
                    <Text style={styles.videoTitle}>Mirá el video para seguir jugando</Text>
                    {isYoutube ? (
                        <TriviaYouTubePlayer youtubeId={currentVideoPlayback.youtubeId} />
                    ) : (
                        <Video
                            source={{ uri: currentVideoPlayback.url }}
                            style={styles.video}
                            useNativeControls
                            shouldPlay
                            onPlaybackStatusUpdate={(status) => {
                                if (status.isLoaded && status.didJustFinishAndNotReset) onVideoFinished();
                            }}
                        />
                    )}
                    <TouchableOpacity style={styles.skipVideoBtn} onPress={onVideoFinished}>
                        <Text style={styles.playText}>CONTINUAR</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (gameOver) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.card}>
                    <Text style={styles.introTitle}>RESULTADO</Text>
                    <Text style={styles.scoreBig}>{score}</Text>
                    <Text style={styles.introText}>Puntos</Text>
                    {isSaving ? (
                        <ActivityIndicator color={Colors.river.primary} size="large" />
                    ) : (
                        <>
                            <TouchableOpacity style={styles.playButton} onPress={startGame}>
                                <Text style={styles.playText}>JUGAR DE NUEVO</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.playButton, { backgroundColor: '#333', marginTop: 10 }]} onPress={() => router.back()}>
                                <Text style={styles.playText}>SALIR</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    }

    if (!currentQ) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.introText}>No hay preguntas. Volvé al menú.</Text>
                <TouchableOpacity onPress={() => router.back()}><Text style={{ color: Colors.river.primary }}>Volver</Text></TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerScore}>Puntos: {score}</Text>
                <View style={styles.timerBadge}>
                    <Text style={[styles.timerText, { color: totalTimeLeft < 6 ? 'red' : 'black' }]}>{totalTimeLeft}s</Text>
                </View>
            </View>
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(1 - totalTimeLeft / TOTAL_GAME_SECONDS) * 100}%` }]} />
            </View>
            <View style={styles.questionContainer}>
                <Text style={styles.indexText}>Pregunta • {totalTimeLeft}s restantes</Text>
                <Text style={styles.questionText}>{currentQ.question}</Text>
                <View style={styles.questionTimer}>
                    <Text style={[styles.timerText, { color: questionTimeLeft < 4 ? 'red' : '#333' }]}>{questionTimeLeft}s</Text>
                </View>
            </View>
            <View style={styles.optionsContainer}>
                {(displayOptions.options.length ? displayOptions.options : currentQ.options).map((opt, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.optionButton}
                        onPress={() => handleAnswer(index)}
                        disabled={answered}
                    >
                        <Text style={styles.optionText}>{opt}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        paddingTop: 50,
        paddingHorizontal: 20
    },
    centered: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontFamily: Fonts.sans, color: '#666' },
    card: {
        backgroundColor: 'white',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        width: '100%'
    },
    introTitle: {
        fontFamily: Fonts.bold,
        fontSize: 22,
        textAlign: 'center',
        marginVertical: 20,
        color: Colors.river.primary
    },
    introText: {
        fontFamily: Fonts.sans,
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginBottom: 30
    },
    playButton: {
        backgroundColor: Colors.river.primary,
        width: '100%',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center'
    },
    playText: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 18
    },
    scoreBig: {
        fontSize: 60,
        fontFamily: Fonts.bold,
        color: '#333'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    headerScore: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: '#333'
    },
    timerBadge: {
        backgroundColor: 'white',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    timerText: {
        fontFamily: Fonts.bold,
        fontSize: 18
    },
    progressBar: {
        height: 6,
        backgroundColor: '#ddd',
        borderRadius: 3,
        marginBottom: 30,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.river.primary
    },
    questionContainer: {
        marginBottom: 24
    },
    indexText: {
        color: '#888',
        fontFamily: Fonts.sans,
        marginBottom: 10
    },
    questionText: {
        fontSize: 26,
        fontFamily: Fonts.bold,
        color: '#222',
        lineHeight: 34
    },
    questionTimer: {
        marginTop: 12,
        alignItems: 'center'
    },
    optionsContainer: {
        gap: 15
    },
    optionButton: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    optionText: {
        fontFamily: Fonts.sans,
        fontSize: 18,
        color: '#333'
    },
    videoWrapper: {
        flex: 1,
        padding: 20,
        alignItems: 'center'
    },
    videoTitle: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: '#333',
        marginBottom: 16
    },
    video: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden'
    },
    skipVideoBtn: {
        marginTop: 24,
        backgroundColor: Colors.river.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 10
    }
});

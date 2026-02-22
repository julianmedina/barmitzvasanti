import { Colors, Fonts } from '@/constants/theme';
import { updatePlayerScore } from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const QUESTIONS = [
    {
        id: 1,
        question: "¿De qué cuadro es hincha fanático Santi?",
        options: ["Boca Juniors", "River Plate", "Racing", "San Lorenzo"],
        correct: 1 // Index
    },
    {
        id: 2,
        question: "¿Cuál es su comida favorita?",
        options: ["Sushi", "Asado", "Milanesa con Puré", "Fideos con Tuco"],
        correct: 2
    },
    {
        id: 3,
        question: "¿Cómo le dicen sus amigos del club?",
        options: ["Santi", "Medina", "El 10", "Tanque"],
        correct: 1
    },
    {
        id: 4,
        question: "¿En qué posición juega al fútbol?",
        options: ["Arquero", "Defensor", "Mediocampista", "Delantero"],
        correct: 1
    },
    {
        id: 5,
        question: "¿Cuál es su materia preferida en el colegio?",
        options: ["Matemática", "Gimnasia", "Historia", "Recreo"],
        correct: 3
    }
];

const TIME_PER_QUESTION = 10; // Seconds

export default function TriviaGame() {
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const router = useRouter();

    // Timer Logic
    useEffect(() => {
        if (!gameStarted || gameOver) return;

        if (timeLeft === 0) {
            handleTimeUp();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, gameStarted, gameOver]);

    const handleTimeUp = () => {
        handleAnswer(-1);
    };

    const handleAnswer = (selectedOptionIndex: number) => {
        const currentQ = QUESTIONS[currentQIndex];
        let newScore = score;

        if (selectedOptionIndex === currentQ.correct) {
            newScore += 100 + (timeLeft * 10);
        }

        setScore(newScore);

        if (currentQIndex + 1 < QUESTIONS.length) {
            setCurrentQIndex(prev => prev + 1);
            setTimeLeft(TIME_PER_QUESTION);
        } else {
            endGame(newScore);
        }
    };

    const endGame = async (finalScore: number) => {
        setGameOver(true);
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

    const startGame = () => {
        setGameStarted(true);
        setGameOver(false);
        setScore(0);
        setCurrentQIndex(0);
        setTimeLeft(TIME_PER_QUESTION);
    };

    if (!gameStarted) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.card}>
                    <FontAwesome name="question-circle-o" size={80} color={Colors.river.primary} />
                    <Text style={styles.introTitle}>¿CUÁNTO CONOCÉS A MEDINA?</Text>
                    <Text style={styles.introText}>Contestá rápido para sumar más puntos.</Text>
                    <TouchableOpacity style={styles.playButton} onPress={startGame}>
                        <Text style={styles.playText}>JUGAR AHORA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                        <Text style={{ color: '#666', fontFamily: Fonts.sans }}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
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
        )
    }

    const currentQ = QUESTIONS[currentQIndex];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Top Bar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerScore}>Puntos: {score}</Text>
                <View style={styles.timerBadge}>
                    <Text style={[styles.timerText, { color: timeLeft < 4 ? 'red' : 'black' }]}>{timeLeft}s</Text>
                </View>
            </View>

            {/* Progress */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((currentQIndex + 1) / QUESTIONS.length) * 100}%` }]} />
            </View>

            {/* Question Card */}
            <View style={styles.questionContainer}>
                <Text style={styles.indexText}>Pregunta {currentQIndex + 1}/{QUESTIONS.length}</Text>
                <Text style={styles.questionText}>{currentQ.question}</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
                {currentQ.options.map((opt, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.optionButton}
                        onPress={() => handleAnswer(index)}
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
        fontSize: 24,
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
        marginBottom: 40
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
    }
});

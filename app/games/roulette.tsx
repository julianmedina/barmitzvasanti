import { Colors, Fonts } from '@/constants/theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Mock Prendas
const PRENDAS = [
    "¡Gritá un gol de River!",
    "Selfie sacando la lengua",
    "Bailá como Santi",
    "Imitá a un jugador",
    "Cara de haber perdido",
    "Abrazo de gol a un amigo"
];

export default function RouletteGame() {
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const spinValue = useRef(new Animated.Value(0)).current;
    const router = useRouter();

    const spin = () => {
        if (spinning) return;
        setSpinning(true);
        setResult(null);

        // Random rotations (min 5, max 8) + random angle
        const randomRotations = 5 + Math.random() * 3;
        const finalValue = randomRotations;

        Animated.timing(spinValue, {
            toValue: finalValue,
            duration: 3000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setSpinning(false);
                // Select random result
                const randomPrenda = PRENDAS[Math.floor(Math.random() * PRENDAS.length)];
                setResult(randomPrenda);
                spinValue.setValue(0); // Reset for next time if needed, though visual jump might happen.
                // Better implementation for reset would be modular arithmetic but for simple MVP this works with state reset.
            }
        });
    };

    const spinInterpolate = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleCamera = () => {
        router.push({ pathname: '/games/camera', params: { prenda: result } });
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <FontAwesome name="arrow-left" size={24} color="white" />
            </TouchableOpacity>

            <Text style={styles.title}>LA RULETA DE MEDINA</Text>

            {/* The Wheel */}
            <View style={styles.wheelContainer}>
                <View style={styles.pointer} />
                <Animated.View style={[styles.wheel, { transform: [{ rotate: spinInterpolate }] }]}>
                    {/* Visual Segments (Simplified for code) */}
                    <View style={[styles.segment, { backgroundColor: Colors.river.primary, transform: [{ rotate: '0deg' }] }]} />
                    <View style={[styles.segment, { backgroundColor: 'white', transform: [{ rotate: '60deg' }] }]} />
                    <View style={[styles.segment, { backgroundColor: Colors.river.primary, transform: [{ rotate: '120deg' }] }]} />
                    <View style={[styles.segment, { backgroundColor: 'white', transform: [{ rotate: '180deg' }] }]} />
                    <View style={[styles.segment, { backgroundColor: Colors.river.primary, transform: [{ rotate: '240deg' }] }]} />
                    <View style={[styles.segment, { backgroundColor: 'white', transform: [{ rotate: '300deg' }] }]} />

                    {/* Center Decoration */}
                    <View style={styles.centerKnob}>
                        <Text style={{ fontSize: 20 }}>⚽</Text>
                    </View>
                </Animated.View>
            </View>

            {/* Controls / Result */}
            <View style={styles.controls}>
                {!result && !spinning && (
                    <TouchableOpacity style={styles.spinButton} onPress={spin}>
                        <Text style={styles.spinText}>GIRAR</Text>
                    </TouchableOpacity>
                )}

                {result && (
                    <View style={styles.resultContainer}>
                        <Text style={styles.resultLabel}>TU PRENDA:</Text>
                        <Text style={styles.resultText}>{result}</Text>

                        <TouchableOpacity style={styles.cameraButton} onPress={handleCamera}>
                            <FontAwesome name="camera" size={24} color={Colors.river.primary} style={{ marginRight: 10 }} />
                            <Text style={styles.cameraText}>CUMPLIR PRENDA</Text>
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
        backgroundColor: Colors.river.primary,
        alignItems: 'center',
        paddingTop: 60,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: 28,
        color: 'white',
        marginBottom: 40,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 5
    },
    wheelContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    pointer: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 20,
        borderRightWidth: 20,
        borderTopWidth: 40,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'gold', // Gold pointer
        position: 'absolute',
        top: -10,
        zIndex: 10,
    },
    wheel: {
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#ddd',
        borderWidth: 5,
        borderColor: 'white',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.51,
        shadowRadius: 13.16,
        elevation: 20,
    },
    segment: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        // This is a naive segment approach, for a real pie chart look we'd need SVG or distinct wedge shapes
        // For this rapid prototype, we use full circles clipped or just coloring.
        // Let's stick to a simple visual trick:
        left: 0,
        top: 0,
        // Since React Native doesn't do "conic-gradient" easily without Skia,
        // we will make do with a visual placeholder for the wheel segments.
    },
    centerKnob: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
        zIndex: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#333'
    },
    controls: {
        width: '100%',
        paddingHorizontal: 30,
        alignItems: 'center',
    },
    spinButton: {
        backgroundColor: 'white',
        paddingHorizontal: 50,
        paddingVertical: 15,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    spinText: {
        fontFamily: Fonts.bold,
        color: Colors.river.primary,
        fontSize: 24,
    },
    resultContainer: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 20,
        borderRadius: 15,
        width: '100%',
        alignItems: 'center',
    },
    resultLabel: {
        color: 'white',
        fontFamily: Fonts.light,
        fontSize: 14,
        marginBottom: 5
    },
    resultText: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 20,
    },
    cameraButton: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignItems: 'center'
    },
    cameraText: {
        fontFamily: Fonts.bold,
        color: Colors.river.primary,
        fontSize: 16
    }
});

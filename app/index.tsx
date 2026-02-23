import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import { Colors, Fonts } from '@/constants/theme';
import { auth, subscribeToConfigs, isNameTaken, updatePlayerScore } from '@/services/database';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LandingScreen() {
    const [nickname, setNickname] = useState('');
    const [brandTop, setBrandTop] = useState('El Bar Mitzva de');
    const [brandBottom, setBrandBottom] = useState('SANTI MEDINA');
    const [landingSub, setLandingSub] = useState('Experiencia Interactiva');
    const router = useRouter();
    const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

    useEffect(() => {
        const updateWidth = () => setWindowWidth(Dimensions.get('window').width);
        const subscription = Dimensions.addEventListener('change', updateWidth);

        const unsub = subscribeToConfigs((data) => {
            if (data.branding_top) setBrandTop(data.branding_top);
            if (data.branding_bottom) setBrandBottom(data.branding_bottom);
            if (data.landing_subtitle) setLandingSub(data.landing_subtitle);
        });

        return () => {
            subscription.remove();
            unsub();
        };
    }, []);

    // Si ya tiene sesión (volvió a entrar), ir directo a la app
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.replace('/(tabs)');
            }
        });
        return () => unsubscribe();
    }, [router]);

    // DESKTOP BLOCKER REMOVED

    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (nickname.trim().length === 0) return;
        setIsLoading(true);

        try {
            // First sign in to satisfy firestore rules
            await signInAnonymously(auth);

            // Then check if name is taken
            // We use a safe check here (if it fails or times out, we proceed anyway to not block the guest)
            let taken = false;
            try {
                taken = await isNameTaken(nickname.trim());
            } catch (err) {
                console.warn("Name check failed, proceeding anyway...", err);
            }

            if (taken) {
                Alert.alert("Nombre no disponible", "Este nombre ya está siendo usado por otro invitado. Por favor elegí otro.");
                setIsLoading(false);
                return;
            }

            await updatePlayerScore(0, nickname.trim());
            router.replace('/(tabs)');
        } catch (e) {
            console.error(e);
            // Fallback: if auth fails, still try to move forward or alert
            Alert.alert("Error de Conexión", "No pudimos conectarte. Por favor reintentá.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.header}>
                    <Text style={styles.topNameText}>{brandTop}</Text>
                    <Text style={styles.bottomNameText}>{brandBottom.toUpperCase()}</Text>
                    <Text style={styles.subTitle}>{landingSub.toUpperCase()}</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Ingresá tu nombre para jugar:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Tu Apodo / Nombre"
                        placeholderTextColor={Colors.elegant.textSecondary}
                        value={nickname}
                        onChangeText={setNickname}
                    />
                    <TouchableOpacity
                        style={[styles.button, isLoading && { opacity: 0.7 }]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="black" />
                        ) : (
                            <Text style={styles.buttonText}>INGRESAR</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            {Platform.OS === 'web' && <PWAInstallBanner />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.elegant.background,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    header: {
        alignItems: 'center',
        marginBottom: 60,
        width: '100%',
    },
    topNameText: {
        fontFamily: Fonts.light,
        fontSize: 24,
        color: 'white',
        textAlign: 'center',
        marginBottom: 5,
    },
    bottomNameText: {
        fontFamily: Fonts.bold,
        fontSize: 60,
        color: Colors.elegant.gold,
        textAlign: 'center',
        lineHeight: 65,
        marginBottom: 15,
    },
    subTitle: {
        fontFamily: Fonts.light,
        fontSize: 16,
        color: 'white',
        letterSpacing: 4,
        marginTop: 10,
    },
    inputContainer: {
        width: '100%',
    },
    label: {
        color: 'white',
        fontFamily: Fonts.sans,
        marginBottom: 10,
        fontSize: 16,
    },
    input: {
        backgroundColor: '#1E1E1E',
        borderRadius: 10,
        padding: 15,
        color: 'white',
        fontFamily: Fonts.sans,
        fontSize: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    button: {
        backgroundColor: Colors.elegant.gold,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: Colors.elegant.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonText: {
        fontFamily: Fonts.bold,
        color: 'black',
        fontSize: 16,
        letterSpacing: 1,
    },
    // Desktop Styles
    desktopContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 50
    },
    desktopTitle: {
        color: Colors.elegant.gold,
        fontSize: 60,
        fontFamily: Fonts.bold,
        marginBottom: 10
    },
    desktopSubtitle: {
        color: 'white',
        fontSize: 24,
        fontFamily: Fonts.light,
        letterSpacing: 5,
        marginBottom: 50
    },
    qrContainer: {
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 30
    },
    desktopText: {
        color: '#aaa',
        fontSize: 20,
        fontFamily: Fonts.sans
    },
    desktopNote: {
        marginTop: 50,
        color: '#444',
        fontSize: 14
    }
});

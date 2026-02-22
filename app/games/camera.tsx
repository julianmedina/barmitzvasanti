import { Colors, Fonts } from '@/constants/theme';
import { auth, saveMediaMetadata, updatePlayerScore, uploadMediaFile } from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraType, setCameraType] = useState<CameraType>('back');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const cameraRef = useRef<any>(null);
    const params = useLocalSearchParams();
    const router = useRouter();

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Necesitamos permiso para usar la cámara</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.button}>
                    <Text style={styles.text}>Dar Permiso</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            startCountdown(async () => {
                try {
                    const photo = await cameraRef.current.takePictureAsync({
                        quality: 0.7,
                        base64: true,
                    });
                    setCapturedImage(photo.uri);
                } catch (e) {
                    Alert.alert("Error", "No se pudo sacar la foto");
                }
            });
        }
    };

    const startCountdown = (callback: () => void) => {
        let count = 3;
        setCountdown(count);
        const interval = setInterval(() => {
            count--;
            if (count === 0) {
                clearInterval(interval);
                setCountdown(null);
                callback();
            } else {
                setCountdown(count);
            }
        }, 1000);
    }

    const handleShare = async () => {
        if (!capturedImage) return;
        try {
            await shareAsync(capturedImage, {
                mimeType: 'image/jpeg',
                dialogTitle: 'Compartir Prenda'
            });
        } catch (e) {
            Alert.alert("Error", "No se pudo compartir");
        }
    };

    const handleUpload = async () => {
        if (!capturedImage) return;

        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Error", "Debes estar identificado para subir fotos.");
            return;
        }

        setIsUploading(true);
        try {
            // 1. Upload to Firebase Storage
            const path = `media/camera/${user.uid}/${Date.now()}.jpg`;
            const downloadURL = await uploadMediaFile(capturedImage, path);

            // 2. Save Metadata in Firestore
            await saveMediaMetadata({
                url: downloadURL,
                section: 'camera',
                userId: user.uid
            });

            // 3. Award points
            await updatePlayerScore(150);

            Alert.alert(
                "¡Misión Cumplida!",
                "Ganaste 150 puntos y tu foto ya está en el Drive de Santi.",
                [
                    { text: "¡BUENÍSIMO!", onPress: () => router.navigate('/(tabs)') }
                ]
            );
        } catch (e) {
            console.error("Error in handleUpload:", e);
            Alert.alert("Error", "No se pudo subir la foto ni guardar los puntos.");
        } finally {
            setIsUploading(false);
        }
    };

    const retake = () => {
        setCapturedImage(null);
    };

    if (capturedImage) {
        return (
            <View style={styles.container}>
                <Text style={styles.previewTitle}>¡ASI QUEDÓ!</Text>
                <Image source={{ uri: capturedImage }} style={styles.previewImage} />

                <View style={styles.previewOverlay}>
                    <Text style={styles.watermark}>EL BAR MITZVA DE MEDINA</Text>
                </View>

                {isUploading ? (
                    <View style={{ marginTop: 20 }}>
                        <ActivityIndicator color={Colors.river.primary} size="large" />
                        <Text style={{ color: 'white', textAlign: 'center', marginTop: 10 }}>Subiendo...</Text>
                    </View>
                ) : (
                    <View style={styles.controlRow}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#555' }]} onPress={retake}>
                            <Text style={styles.btnText}>Nueva</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleShare}>
                            <FontAwesome name="whatsapp" size={20} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.river.primary }]} onPress={handleUpload}>
                            <Text style={styles.btnText}>¡Cumplido!</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <CameraView style={styles.camera} facing={cameraType} ref={cameraRef}>

                {/* Top Bar */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <FontAwesome name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.prendaText}>{params.prenda || "Hazaña"}</Text>
                </View>

                {/* Countdown Overlay */}
                {countdown !== null && (
                    <View style={styles.countdownContainer}>
                        <Text style={styles.countdownText}>{countdown}</Text>
                    </View>
                )}

                {/* Bottom Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity
                        style={styles.switchBtn}
                        onPress={() => setCameraType(current => (current === 'back' ? 'front' : 'back'))}>
                        <FontAwesome name="refresh" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                        <View style={styles.innerCircle} />
                    </TouchableOpacity>

                    <View style={{ width: 40 }} />
                </View>

            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    text: {
        fontSize: 18,
        color: 'white',
        textAlign: 'center',
        marginBottom: 20
    },
    button: {
        backgroundColor: Colors.river.primary,
        padding: 15,
        borderRadius: 10
    },
    camera: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 0,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    prendaText: {
        flex: 1,
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 18,
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 20,
        marginLeft: 10
    },
    controls: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'white'
    },
    innerCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white'
    },
    switchBtn: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25
    },
    countdownContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    countdownText: {
        fontSize: 150,
        fontFamily: Fonts.bold,
        color: 'white',
        textShadowColor: 'black',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 10
    },
    previewTitle: {
        color: 'white',
        fontSize: 24,
        fontFamily: Fonts.bold,
        marginTop: 60,
        marginBottom: 20,
        textAlign: 'center'
    },
    previewImage: {
        width: '100%',
        height: 400,
        resizeMode: 'cover'
    },
    previewOverlay: {
        position: 'absolute',
        bottom: 120,
        right: 20,
    },
    watermark: {
        color: 'rgba(255,255,255,0.8)',
        fontFamily: Fonts.bold,
        fontSize: 14,
        textShadowColor: 'black',
        textShadowRadius: 2
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 30
    },
    actionBtn: {
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
    },
    btnText: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 16
    }
});

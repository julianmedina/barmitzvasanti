import { Colors, Fonts } from '@/constants/theme';
import {
    auth,
    completeMission,
    getPointsForCompletionLevel,
    saveMediaMetadata,
    updatePlayerScore,
    uploadMediaFile,
} from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Video } from 'expo-av';

type CaptureMode = 'photo' | 'video';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [facing, setFacing] = useState<CameraType>('back');
    const recordingPromiseRef = useRef<Promise<{ uri: string }> | null>(null);

    const cameraRef = useRef<CameraView>(null);
    const params = useLocalSearchParams<{
        prenda?: string;
        missionId?: string;
        mode?: string;
        completedCount?: string;
    }>();
    const router = useRouter();

    const mode: CaptureMode = params.mode === 'video' ? 'video' : 'photo';
    const missionId = params.missionId ?? null;
    const completedCount = params.completedCount ? parseInt(params.completedCount, 10) : 0;
    const pointsForThisLevel = getPointsForCompletionLevel(completedCount);
    const title = params.prenda || (mode === 'video' ? 'Video' : 'Foto');

    if (!permission) {
        return <View style={styles.container} />;
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

    const takePicture = () => {
        if (!cameraRef.current) return;
        startCountdown(async () => {
            try {
                const photo = await cameraRef.current!.takePictureAsync({
                    quality: 0.7,
                    base64: true,
                });
                setCapturedImage(photo.uri);
            } catch (e) {
                Alert.alert("Error", "No se pudo sacar la foto");
            }
        });
    };

    const startRecording = async () => {
        if (!cameraRef.current || isRecording) return;
        try {
            setIsRecording(true);
            const promise = cameraRef.current.recordAsync();
            recordingPromiseRef.current = promise;
        } catch (e) {
            Alert.alert("Error", "No se pudo iniciar la grabación");
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        if (!cameraRef.current || !isRecording) return;
        try {
            cameraRef.current.stopRecording();
            const result = await recordingPromiseRef.current;
            recordingPromiseRef.current = null;
            setIsRecording(false);
            if (result?.uri) setCapturedVideo(result.uri);
        } catch (e) {
            Alert.alert("Error", "No se pudo detener la grabación");
            setIsRecording(false);
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
    };

    const handleShare = async () => {
        const uri = capturedImage || capturedVideo;
        if (!uri) return;
        try {
            await shareAsync(uri, {
                mimeType: capturedVideo ? 'video/mp4' : 'image/jpeg',
                dialogTitle: 'Compartir',
            });
        } catch (e) {
            Alert.alert("Error", "No se pudo compartir");
        }
    };

    const uploadAndComplete = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Error", "Debes estar identificado para subir.");
            return;
        }

        const uri = capturedImage || capturedVideo;
        if (!uri) return;

        setIsUploading(true);
        try {
            const ext = capturedVideo ? 'mp4' : 'jpg';
            const path = `media/camera/${user.uid}/${Date.now()}.${ext}`;
            const downloadURL = await uploadMediaFile(uri, path);

            await saveMediaMetadata({
                url: downloadURL,
                section: 'camera',
                userId: user.uid,
            });

            const pointsToAward = missionId ? pointsForThisLevel : 150;
            if (pointsToAward > 0) await updatePlayerScore(pointsToAward);

            if (missionId) {
                await completeMission(user.uid, missionId, pointsToAward);
                router.replace('/games/missions?celebrate=1');
            } else {
                Alert.alert(
                    "¡Listo!",
                    "Ganaste 150 puntos.",
                    [{ text: "¡BUENÍSIMO!", onPress: () => router.navigate('/(tabs)') }]
                );
            }
        } catch (e) {
            console.error("Upload error:", e);
            Alert.alert("Error", "No se pudo subir.");
        } finally {
            setIsUploading(false);
        }
    };

    const retake = () => {
        setCapturedImage(null);
        setCapturedVideo(null);
    };

    const previewUri = capturedImage || capturedVideo;
    const isVideo = !!capturedVideo;

    if (previewUri) {
        return (
            <View style={styles.container}>
                <Text style={styles.previewTitle}>{isVideo ? '¡Así quedó el video!' : '¡Así quedó!'}</Text>
                {capturedImage ? (
                    <Image source={{ uri: capturedImage }} style={styles.previewMedia} />
                ) : (
                    <Video
                        source={{ uri: capturedVideo! }}
                        style={styles.previewMedia}
                        useNativeControls
                        isLooping={false}
                        shouldPlay
                    />
                )}
                <View style={styles.previewOverlay}>
                    <Text style={styles.watermark}>EL BAR MITZVA DE MEDINA</Text>
                </View>

                {isUploading ? (
                    <View style={styles.uploadingRow}>
                        <ActivityIndicator color={Colors.river.primary} size="large" />
                        <Text style={styles.uploadingText}>Subiendo...</Text>
                    </View>
                ) : (
                    <View style={styles.controlRow}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#555' }]} onPress={retake}>
                            <Text style={styles.btnText}>Nueva</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleShare}>
                            <FontAwesome name="whatsapp" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.river.primary }]} onPress={uploadAndComplete}>
                            <Text style={styles.btnText}>Subir y cumplir</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <CameraView style={styles.camera} ref={cameraRef} facing={facing}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <FontAwesome name="close" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.prendaText} numberOfLines={1}>{title}</Text>
                </View>

                {countdown !== null && (
                    <View style={styles.countdownContainer}>
                        <Text style={styles.countdownText}>{countdown}</Text>
                    </View>
                )}

                <View style={styles.controls}>
                    <TouchableOpacity
                        style={styles.switchBtn}
                        onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                    >
                        <FontAwesome name="refresh" size={24} color="white" />
                    </TouchableOpacity>
                    {mode === 'photo' ? (
                        <TouchableOpacity style={styles.captureBtn} onPress={takePicture} disabled={!!countdown}>
                            <View style={styles.innerCircle} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.captureBtn, isRecording && styles.captureBtnRecording]}
                            onPress={isRecording ? stopRecording : startRecording}
                            disabled={!!countdown}
                        >
                            {isRecording ? (
                                <Text style={styles.stopLabel}>DETENER</Text>
                            ) : (
                                <View style={styles.recordDot} />
                            )}
                        </TouchableOpacity>
                    )}
                    <View style={styles.captureBtn} />
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
        marginBottom: 20,
    },
    button: {
        backgroundColor: Colors.river.primary,
        padding: 15,
        borderRadius: 10,
    },
    camera: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    closeBtn: {
        padding: 8,
    },
    prendaText: {
        flex: 1,
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 16,
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginLeft: 8,
    },
    countdownContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    countdownText: {
        fontSize: 120,
        fontFamily: Fonts.bold,
        color: 'white',
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    switchBtn: {
        width: 50,
        height: 50,
    },
    captureBtn: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'white',
    },
    captureBtnRecording: {
        backgroundColor: 'rgba(255,0,0,0.6)',
    },
    innerCircle: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: 'white',
    },
    recordDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'red',
    },
    stopLabel: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 12,
    },
    previewTitle: {
        color: 'white',
        fontSize: 22,
        fontFamily: Fonts.bold,
        marginTop: 56,
        marginBottom: 16,
        textAlign: 'center',
    },
    previewMedia: {
        width: '100%',
        height: 360,
        resizeMode: 'contain',
        backgroundColor: '#000',
    },
    previewOverlay: {
        position: 'absolute',
        bottom: 100,
        right: 16,
    },
    watermark: {
        color: 'rgba(255,255,255,0.8)',
        fontFamily: Fonts.bold,
        fontSize: 12,
    },
    uploadingRow: {
        marginTop: 20,
        alignItems: 'center',
    },
    uploadingText: {
        color: 'white',
        marginTop: 10,
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 16,
        marginTop: 24,
    },
    actionBtn: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 28,
    },
    btnText: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
});

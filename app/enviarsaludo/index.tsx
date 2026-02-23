import { Colors, Fonts } from '@/constants/theme';
import { auth, saveMediaMetadata, uploadMediaFile } from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Video } from 'expo-av';

export default function EnviarSaludoScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

    const startRecording = () => {
        if (!cameraRef.current || isRecording) return;
        setIsRecording(true);
        recordingPromiseRef.current = cameraRef.current
            .recordAsync({ maxDuration: 30 })
            .then((result) => {
                if (result?.uri) setVideoUri(result.uri);
                return result;
            })
            .catch((e) => {
                console.error('Error recording:', e);
                Alert.alert('Error', 'No se pudo grabar el video.');
            })
            .finally(() => {
                setIsRecording(false);
                recordingPromiseRef.current = null;
            }) as Promise<{ uri: string } | undefined>;
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
        }
    };

    const sendVideo = async () => {
        if (!videoUri) return;
        setIsUploading(true);
        try {
            const user = auth.currentUser;
            const userId = user?.uid ?? 'guest';
            const path = `saludos/${userId}_${Date.now()}.mp4`;
            const downloadUrl = await uploadMediaFile(videoUri, path);
            await saveMediaMetadata({
                url: downloadUrl,
                section: 'saludo',
                userId,
                mimeType: 'video/mp4',
            });
            Alert.alert(
                '¡Listo!',
                'Tu saludo se envió y va a aparecer en el Drive compartido.',
                [{ text: 'OK', onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')) }]
            );
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert('Error al enviar', 'No se pudo subir el video. Revisá la conexión e intentá de nuevo.\n' + msg);
        } finally {
            setIsUploading(false);
        }
    };

    const canRecordNative = Platform.OS === 'android' || Platform.OS === 'ios';

    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator color={Colors.elegant.gold} size="large" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Mandale un saludo a Santi', headerTintColor: Colors.elegant.gold }} />
                <View style={styles.messageContainer}>
                    <FontAwesome name="video-camera" size={50} color={Colors.elegant.gold} />
                    <Text style={styles.messageText}>Necesitamos acceso a la cámara y al micrófono para grabar tu saludo.</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
                        <Text style={styles.primaryButtonText}>DAR PERMISO</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!canRecordNative) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Mandale un saludo a Santi', headerTintColor: Colors.elegant.gold }} />
                <View style={styles.messageContainer}>
                    <Text style={styles.messageText}>Para mandar un saludo en video, abrí esta página desde la app en tu celular (Android o iPhone) y grabá desde ahí.</Text>
                    <Text style={styles.messageSub}>O escaneá el QR del totem con la app del Bar Mitzvá instalada.</Text>
                </View>
            </View>
        );
    }

    if (videoUri) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Tu saludo', headerTintColor: Colors.elegant.gold }} />
                <Video
                    source={{ uri: videoUri }}
                    style={styles.previewVideo}
                    useNativeControls
                    isLooping
                    shouldPlay
                />
                {isUploading ? (
                    <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="large" color={Colors.elegant.gold} />
                        <Text style={styles.uploadingText}>Subiendo a Drive...</Text>
                    </View>
                ) : (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => setVideoUri(null)}>
                            <Text style={styles.secondaryButtonText}>VOLVER A GRABAR</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primaryButton} onPress={sendVideo}>
                            <Text style={styles.primaryButtonText}>ENVIAR SALUDO</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Mandale un saludo a Santi', headerTintColor: Colors.elegant.gold }} />
            <CameraView ref={cameraRef} style={styles.camera} facing="front">
                <View style={styles.overlay} pointerEvents="box-none">
                    <Text style={styles.overlayTitle}>Mandale un saludo a Santi</Text>
                    <Text style={styles.overlaySub}>Grabá un video corto (máx. 30 s)</Text>
                </View>
                <View style={styles.recordBar}>
                    <TouchableOpacity
                        style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                        disabled={isRecording}
                    >
                        <Text style={styles.recordButtonLabel}>{isRecording ? 'Grabando...' : 'Mantener para grabar'}</Text>
                    </TouchableOpacity>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    messageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    messageText: {
        color: '#fff',
        fontFamily: Fonts.sans,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    messageSub: {
        color: Colors.elegant.textSecondary,
        fontFamily: Fonts.sans,
        fontSize: 14,
        textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: Colors.elegant.gold,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 30,
    },
    primaryButtonText: {
        fontFamily: Fonts.bold,
        color: '#000',
        fontSize: 16,
    },
    secondaryButton: {
        backgroundColor: '#333',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
    },
    secondaryButtonText: {
        fontFamily: Fonts.bold,
        color: '#fff',
        fontSize: 14,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 60,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
    },
    overlayTitle: {
        fontFamily: Fonts.bold,
        color: Colors.elegant.gold,
        fontSize: 20,
    },
    overlaySub: {
        fontFamily: Fonts.light,
        color: '#fff',
        fontSize: 14,
        marginTop: 4,
    },
    recordBar: {
        position: 'absolute',
        bottom: 48,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    recordButton: {
        backgroundColor: 'rgba(212,175,55,0.9)',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        minWidth: 200,
        alignItems: 'center',
    },
    recordButtonActive: {
        backgroundColor: '#E4002B',
    },
    recordButtonLabel: {
        fontFamily: Fonts.bold,
        color: '#000',
        fontSize: 15,
    },
    previewVideo: {
        flex: 1,
        width: '100%',
    },
    uploadingOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 32,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
    },
    uploadingText: {
        color: Colors.elegant.gold,
        fontFamily: Fonts.bold,
        marginTop: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 24,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
});

import { Colors, Fonts } from '@/constants/theme';
import { auth, saveMediaMetadata, uploadMediaFile } from '@/services/database';
import { FontAwesome5 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

const { width, height } = Dimensions.get('window');

export default function SelfieScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [photo, setPhoto] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [facing, setFacing] = useState<'front' | 'back'>('front');
    const [countdown, setCountdown] = useState<number | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const takePictureRef = useRef<(() => Promise<void>) | null>(null);
    const previewShotRef = useRef<View>(null);
    const router = useRouter();

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const result = await cameraRef.current.takePictureAsync({
                    quality: 0.7,
                    base64: false,
                    exif: false,
                });
                if (result) setPhoto(result.uri);
            } catch (error) {
                console.error("Error taking picture:", error);
                Alert.alert("Error", "No se pudo tomar la foto");
            }
        }
    };

    const startCountdownAndCapture = () => {
        if (!cameraReady && Platform.OS !== 'web') {
            Alert.alert("Espera", "La cámara aún no está lista.");
            return;
        }
        setCountdown(3);
    };

    const pickImageFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permiso", "Necesitamos acceso a la galería para elegir una foto.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
    };

    takePictureRef.current = takePicture;

    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            setCountdown(null);
            takePictureRef.current?.();
            return;
        }
        const id = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(id);
    }, [countdown]);

    if (!permission) {
        // Camera permissions are still loading.
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.elegant.gold} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Selfie', headerTransparent: true, headerTintColor: 'white' }} />
                <View style={styles.messageContainer}>
                    <FontAwesome5 name="camera" size={50} color={Colors.elegant.gold} />
                    <Text style={styles.messageText}>Necesitamos acceso a tu cámara para la selfie.</Text>
                    {Platform.OS === 'web' && (
                        <Text style={styles.messageSubtext}>Si estás en el navegador y la cámara no funciona, después de dar permiso podés usar "Elegir foto" para subir una imagen.</Text>
                    )}
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>DAR PERMISO</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }


    const confirmPicture = async () => {
        if (!photo) return;

        setIsUploading(true);
        try {
            let uriToUpload = photo;
            // Grabar la foto con el sobreimpreso "Bar Mitzvá de SANTI MEDINA"
            if (previewShotRef.current) {
                try {
                    const captured = await captureRef(previewShotRef, {
                        format: 'jpg',
                        quality: 0.9,
                        result: 'tmpfile',
                    });
                    if (captured) uriToUpload = captured;
                } catch (e) {
                    console.warn("No se pudo grabar el texto en la foto, se sube la original:", e);
                }
            }

            const user = auth.currentUser;
            const userId = user?.uid ?? 'guest';

            const path = `selfies/${userId}_${Date.now()}.jpg`;
            const downloadUrl = await uploadMediaFile(uriToUpload, path);

            await saveMediaMetadata({
                url: downloadUrl,
                section: 'camera',
                userId: userId,
            });

            if (Platform.OS === 'web') {
                window.alert("¡Éxito! Tu selfie se subió correctamente. ¡Buscate en la pantalla principal!");
                router.replace('/(tabs)');
            } else {
                Alert.alert(
                    "¡Éxito!",
                    "Tu selfie se subió correctamente. ¡Buscate en la pantalla principal!",
                    [{ text: "OK", onPress: () => router.replace('/(tabs)') }]
                );
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Error in confirmPicture:", error);
            if (Platform.OS === 'web') {
                window.alert("Error al subir la foto: No se pudo subir. Revisá que tengas conexión. " + message);
            } else {
                Alert.alert(
                    "Error al subir la foto",
                    "No se pudo subir la selfie. Revisá que tengas conexión a internet y permisos de la app. Reintentá en un momento.\n\nDetalle: " + message
                );
            }
        } finally {
            setIsUploading(false);
        }
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
        setCameraReady(false);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: 'SELFIE TIME',
                headerStyle: { backgroundColor: 'black' },
                headerTintColor: Colors.elegant.gold,
                headerTitleStyle: { fontFamily: Fonts.bold }
            }} />

            {!photo ? (
                <View style={{ flex: 1 }}>
                    <CameraView
                        key={facing}
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                        onCameraReady={() => {
                            console.warn("Camera ready event fired");
                            setTimeout(() => setCameraReady(true), 500);
                        }}
                        onMountError={(error) => {
                            console.error("Camera mount error:", error);
                            Alert.alert("Error de cámara", "No se pudo montar la cámara: " + error.message);
                        }}
                    >
                        {!cameraReady && (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }]}>
                                <ActivityIndicator size="large" color={Colors.elegant.gold} />
                                <Text style={{ color: 'white', marginTop: 10 }}>Iniciando cámara...</Text>
                            </View>
                        )}
                        {/* Overlay de marca: Bar Mitzvá de SANTI MEDINA (tipografía y colores del login/home) */}
                        <View style={styles.brandOverlay} pointerEvents="none">
                            <Text style={styles.brandLine1}>Bar Mitzvá de</Text>
                            <Text style={styles.brandLine2}>SANTI MEDINA</Text>
                        </View>

                        {countdown !== null && (
                            <View style={styles.countdownOverlay} pointerEvents="none">
                                <Text style={styles.countdownSmile}>¡Sonríe!</Text>
                                <Text style={styles.countdownNumber}>{countdown === 0 ? '¡Click!' : countdown}</Text>
                            </View>
                        )}

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                                <FontAwesome5 name="sync" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.captureButton}
                                onPress={startCountdownAndCapture}
                                disabled={countdown !== null}
                            >
                                <View style={styles.captureButtonInner} />
                            </TouchableOpacity>

                            {Platform.OS === 'web' ? (
                                <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
                                    <FontAwesome5 name="images" size={22} color="white" />
                                    <Text style={styles.galleryButtonText}>Elegir foto</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.flipButton} />
                            )}
                        </View>
                    </CameraView>
                </View>
            ) : (
                <View style={styles.previewContainer}>
                    {/* Vista que se captura para subir: foto + texto sobreimpreso */}
                    <View
                        ref={previewShotRef}
                        style={styles.previewShotWrapper}
                        collapsable={false}
                    >
                        {photo && <Image source={{ uri: photo }} style={styles.previewImage} />}
                        <View style={styles.brandOverlayOnPreview}>
                            <Text style={styles.brandLine1OnPreview}>Bar Mitzvá de</Text>
                            <Text style={styles.brandLine2OnPreview}>SANTI MEDINA</Text>
                        </View>
                    </View>

                    {isUploading ? (
                        <View style={styles.uploadingOverlay}>
                            <ActivityIndicator size="large" color={Colors.elegant.gold} />
                            <Text style={styles.uploadingText}>SUBIENDO AL DASHBOARD...</Text>
                        </View>
                    ) : (
                        <View style={styles.previewActions}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.retakeButton]}
                                onPress={() => setPhoto(null)}
                            >
                                <FontAwesome5 name="redo" size={20} color="white" />
                                <Text style={styles.actionButtonText}>REPETIR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.confirmButton]}
                                onPress={confirmPicture}
                            >
                                <FontAwesome5 name="check" size={20} color="black" />
                                <Text style={[styles.actionButtonText, { color: 'black' }]}>CONFIRMAR</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.footer}>
                <Text style={styles.footerText}>#ELBARMITZVADEMEDINA</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    messageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    messageText: {
        color: 'white',
        fontFamily: Fonts.sans,
        fontSize: 18,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 12,
    },
    messageSubtext: {
        color: Colors.elegant.textSecondary,
        fontFamily: Fonts.sans,
        fontSize: 13,
        textAlign: 'center',
        marginHorizontal: 24,
        marginBottom: 30,
    },
    permissionButton: {
        backgroundColor: Colors.elegant.gold,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 30,
    },
    permissionButtonText: {
        color: 'black',
        fontFamily: Fonts.bold,
        fontSize: 16,
    },
    cameraContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    camera: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    brandOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandLine1: {
        fontFamily: Fonts.light,
        color: 'white',
        fontSize: 16,
        letterSpacing: 3,
    },
    brandLine2: {
        fontFamily: Fonts.bold,
        color: Colors.elegant.gold,
        fontSize: 26,
        letterSpacing: 2,
        marginTop: 4,
    },
    countdownOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    countdownSmile: {
        fontFamily: Fonts.bold,
        color: Colors.elegant.gold,
        fontSize: 28,
        letterSpacing: 2,
        marginBottom: 16,
    },
    countdownNumber: {
        fontFamily: Fonts.bold,
        color: 'white',
        fontSize: 72,
    },
    galleryButton: {
        width: 50,
        minWidth: 70,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryButtonText: {
        color: 'white',
        fontFamily: Fonts.sans,
        fontSize: 10,
        marginTop: 4,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: 40,
        paddingHorizontal: 30,
    },
    flipButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 5,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.river.primary,
    },
    previewContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    previewShotWrapper: {
        flex: 1,
        position: 'relative',
    },
    previewImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    brandOverlayOnPreview: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 48,
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandLine1OnPreview: {
        fontFamily: Fonts.light,
        color: 'white',
        fontSize: 18,
        letterSpacing: 3,
    },
    brandLine2OnPreview: {
        fontFamily: Fonts.bold,
        color: Colors.elegant.gold,
        fontSize: 28,
        letterSpacing: 2,
        marginTop: 4,
    },
    previewActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 30,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 30,
        gap: 10,
        minWidth: 150,
        justifyContent: 'center',
    },
    retakeButton: {
        backgroundColor: '#444',
    },
    confirmButton: {
        backgroundColor: Colors.elegant.gold,
    },
    actionButtonText: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingText: {
        color: Colors.elegant.gold,
        fontFamily: Fonts.bold,
        fontSize: 16,
        marginTop: 20,
        letterSpacing: 1,
    },
    footer: {
        paddingVertical: 15,
        alignItems: 'center',
        backgroundColor: 'black',
    },
    footerText: {
        color: Colors.elegant.gold,
        fontFamily: Fonts.bold,
        fontSize: 14,
        letterSpacing: 3,
    }
});

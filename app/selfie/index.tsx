import { Colors, Fonts } from '@/constants/theme';
import { auth, saveMediaMetadata, uploadMediaFile } from '@/services/database';
import { FontAwesome5 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SelfieScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [photo, setPhoto] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [facing, setFacing] = useState<'front' | 'back'>('front');
    const cameraRef = useRef<CameraView>(null);
    const router = useRouter();

    if (!permission) {
        // Camera permissions are still loading.
        return <View style={styles.container}><ActivityIndicator color={Colors.elegant.gold} /></View>;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Selfie', headerTransparent: true, headerTintColor: 'white' }} />
                <View style={styles.messageContainer}>
                    <FontAwesome5 name="camera" size={50} color={Colors.elegant.gold} />
                    <Text style={styles.messageText}>Necesitamos acceso a tu cámara para la selfie.</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>DAR PERMISO</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const result = await cameraRef.current.takePictureAsync({
                    quality: 0.7,
                    base64: false,
                    exif: false,
                });
                if (result) {
                    setPhoto(result.uri);
                }
            } catch (error) {
                console.error("Error taking picture:", error);
                Alert.alert("Error", "No se pudo tomar la foto");
            }
        }
    };

    const confirmPicture = async () => {
        if (!photo) return;

        setIsUploading(true);
        try {
            const user = auth.currentUser;
            const userId = user?.uid || 'guest';

            // 1. Upload to Storage
            const path = `selfies/${userId}_${Date.now()}.jpg`;
            const downloadUrl = await uploadMediaFile(photo, path);

            // 2. Save to Firestore
            await saveMediaMetadata({
                url: downloadUrl,
                section: 'camera',
                userId: userId,
            });

            Alert.alert(
                "¡Éxito!",
                "Tu selfie se subió correctamente. ¡Buscate en el Dashboard!",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error) {
            console.error("Error in confirmPicture:", error);
            Alert.alert("Error", "No se pudo subir la foto. Reintentá en un momento.");
        } finally {
            setIsUploading(false);
        }
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
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
                <View style={styles.cameraContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                    >
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                                <FontAwesome5 name="sync" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                                <View style={styles.captureButtonInner} />
                            </TouchableOpacity>

                            <View style={styles.flipButton} />
                        </View>
                    </CameraView>
                </View>
            ) : (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: photo }} style={styles.previewImage} />

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
    previewImage: {
        flex: 1,
        resizeMode: 'contain',
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

import { Colors, Fonts } from '@/constants/theme';
import { db, saveMediaMetadata, saveUserProfile, subscribeToAllProfiles, subscribeToUserProfile, updatePlayerScore, uploadMediaFile, UserProfile } from '@/services/database';
import { auth } from '@/services/firebaseConfig';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
    const router = useRouter();

    // State
    const [image, setImage] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [metWhere, setMetWhere] = useState('');
    const [friendDuration, setFriendDuration] = useState('');
    const [score, setScore] = useState(0);
    const [pointsAwarded, setPointsAwarded] = useState(false);
    const [profilesList, setProfilesList] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Listen to real score and profile
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const unsubAllProfiles = subscribeToAllProfiles(setProfilesList);

        // Subscribe to Score (Points, Name, Avatar)
        const unsubScore = onSnapshot(doc(db, 'scores', user.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setScore(data.points || 0);
                if (data.name && !name) setName(data.name);
                if (data.avatar && !image) setImage(data.avatar);
            }
        });

        // Subscribe to Profile (Social Data)
        const unsubProfile = subscribeToUserProfile(user.uid, (profile) => {
            if (profile) {
                if (profile.metWhere !== undefined) setMetWhere(profile.metWhere);
                if (profile.friendDuration !== undefined) setFriendDuration(profile.friendDuration);
                // Sync name/avatar if not present in score but present in profile
                if (profile.name && !name) setName(profile.name);
                if (profile.avatar && !image) setImage(profile.avatar);
            }
            setLoading(false);
        });

        return () => {
            unsubScore();
            unsubProfile();
            unsubAllProfiles();
        };
    }, []);

    // Pick Image Logic
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permiso requerido", "Necesitamos acceso a la cámara para tu selfie.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Nombre requerido", "Por favor ingresá tu nombre para el ranking.");
            return;
        }

        setSaving(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No user");

            let remoteUrl = image || '';

            // 1. Upload image if it's local
            if (image && (image.startsWith('file://') || image.startsWith('blob:') || image.startsWith('data:'))) {
                const path = `media/profile/${user.uid}/${Date.now()}.jpg`;
                remoteUrl = await uploadMediaFile(image, path);
            }

            // 2. Logic: If user didn't have a name before, give them 200 points for first time setup
            // NEW: Use pointsAwarded flag to avoid double rewards
            const alreadyAwarded = !!(profilesList.find(p => p.id === user.uid)?.pointsAwarded);
            const reward = alreadyAwarded ? 0 : 200;

            // 3. Update Score (Ranking)
            if (reward > 0) {
                await updatePlayerScore(reward, name, remoteUrl);
            } else {
                // Just update name/avatar without adding points
                await updatePlayerScore(0, name, remoteUrl);
            }

            // 4. Update Extended Profile (Social Data)
            await saveUserProfile({
                name,
                avatar: remoteUrl,
                metWhere: metWhere || '',
                friendDuration: friendDuration || '',
                pointsAwarded: true // Mark as awarded
            });

            // 5. Register image in media collection for Drive Sync
            if (remoteUrl) {
                await saveMediaMetadata({
                    url: remoteUrl,
                    section: 'profile',
                    userId: user.uid
                });
            }

            Alert.alert("¡Perfil Guardado!", `¡Ganaste ${reward} puntos por actualizar tus datos!`);
            router.replace('/(tabs)');
        } catch (e) {
            console.error("Error in handleSave:", e);
            Alert.alert("Error", "No se pudo guardar el perfil.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={24} color={Colors.elegant.gold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MI PERFIL</Text>
            </View>

            {loading ? (
                <View style={{ marginTop: 50 }}>
                    <ActivityIndicator color={Colors.elegant.gold} size="large" />
                </View>
            ) : (
                <>
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={pickImage} style={styles.avatarPlaceholder}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.avatar} />
                            ) : (
                                <View style={styles.emptyAvatar}>
                                    <FontAwesome name="camera" size={40} color={Colors.elegant.gold} />
                                    <Text style={styles.uploadText}>Subí tu Selfie</Text>
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <FontAwesome name="pencil" size={14} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Score Card */}
                    <View style={styles.scoreCard}>
                        <Text style={styles.scoreLabel}>TU PUNTAJE ACTUAL</Text>
                        <Text style={styles.scoreValue}>{score}</Text>
                        <Text style={styles.scoreSub}>¡Seguí jugando para subir en el ranking!</Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>MIS DATOS</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nombre para el Ránking</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Tu Nombre o Apodo"
                                placeholderTextColor="#666"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <Text style={styles.sectionTitle}>SOBRE MI AMISTAD CON SANTI</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>¿Dónde conociste a Santi?</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: En el colegio, En el club..."
                                placeholderTextColor="#666"
                                value={metWhere}
                                onChangeText={setMetWhere}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>¿Hace cuánto sos su amigo?</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: 5 años, Desde jardín..."
                                placeholderTextColor="#666"
                                value={friendDuration}
                                onChangeText={setFriendDuration}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, saving && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text style={styles.saveText}>GUARDAR Y GANAR PUNTOS</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.elegant.background,
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#333'
    },
    backButton: { marginRight: 15 },
    headerTitle: {
        color: Colors.elegant.gold,
        fontSize: 20,
        fontFamily: Fonts.bold,
        letterSpacing: 2
    },
    avatarSection: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 30
    },
    avatarPlaceholder: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#222',
        borderWidth: 3,
        borderColor: Colors.elegant.gold,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 75
    },
    emptyAvatar: {
        alignItems: 'center'
    },
    uploadText: {
        color: Colors.elegant.gold,
        marginTop: 10,
        fontFamily: Fonts.bold,
        fontSize: 12
    },
    editBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: Colors.river.primary,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#222'
    },
    scoreCard: {
        marginHorizontal: 20,
        backgroundColor: '#1E1E1E',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 30
    },
    scoreLabel: {
        color: '#888',
        fontFamily: Fonts.sans,
        fontSize: 14,
        letterSpacing: 2
    },
    scoreValue: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 48,
        marginVertical: 5
    },
    scoreSub: {
        color: Colors.elegant.gold,
        fontFamily: Fonts.light,
        fontSize: 12
    },
    formSection: {
        paddingHorizontal: 20,
        paddingBottom: 50
    },
    sectionTitle: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 16,
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: Colors.river.primary,
        paddingLeft: 10,
        marginTop: 10
    },
    inputGroup: {
        marginBottom: 20
    },
    label: {
        color: '#CCC',
        marginBottom: 8,
        fontFamily: Fonts.sans
    },
    input: {
        backgroundColor: '#111',
        color: 'white',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#444',
        fontSize: 16,
        fontFamily: Fonts.sans
    },
    saveButton: {
        backgroundColor: Colors.elegant.gold,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10
    },
    saveText: {
        color: 'black',
        fontFamily: Fonts.bold,
        fontSize: 16,
        letterSpacing: 1
    }
});

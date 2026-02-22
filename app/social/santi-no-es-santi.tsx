import { Colors, Fonts } from '@/constants/theme';
import { sendMessage, subscribeToConfigs, updatePlayerScore } from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SantiNoEsSantiScreen() {
    const [message, setMessage] = useState('');
    const [socialPrompt, setSocialPrompt] = useState('SANTI NO ES SANTI SIN...');
    const [isSending, setIsSending] = useState(false);
    const router = useRouter();

    React.useEffect(() => {
        const unsub = subscribeToConfigs((data) => {
            if (data.social_title) setSocialPrompt(data.social_title);
        });
        return () => unsub();
    }, []);

    const handleSend = async () => {
        if (message.trim().length === 0) return;
        setIsSending(true);
        try {
            await sendMessage(message);
            await updatePlayerScore(50);

            Alert.alert(
                "¡Enviado!",
                "Tu mensaje ya está viajando a la pantalla gigante. ¡Ganaste 50 puntos!",
                [{ text: "BUENÍSIMO", onPress: () => router.replace('/(tabs)') }]
            );
        } catch (e) {
            Alert.alert("Error", "No se pudo enviar el mensaje.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Muro Social</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <FontAwesome name="commenting-o" size={60} color={Colors.river.primary} style={{ marginBottom: 20 }} />

                <Text style={styles.title}>COMPLETÁ LA FRASE</Text>

                <View style={styles.phraseContainer}>
                    <Text style={styles.phraseStatic}>"{socialPrompt.toUpperCase()}"</Text>
                </View>

                <TextInput
                    style={styles.input}
                    placeholder="Ej: su camiseta de River"
                    placeholderTextColor="#999"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={2}
                    maxLength={50}
                />

                <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: (message.trim() && !isSending) ? Colors.river.primary : '#ccc' }]}
                    onPress={handleSend}
                    disabled={!message.trim() || isSending}
                >
                    {isSending ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text style={styles.sendText}>ENVIAR A LA PANTALLA</Text>
                            <FontAwesome name="paper-plane" size={20} color="white" style={{ marginLeft: 10 }} />
                        </>
                    )}
                </TouchableOpacity>

            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: Colors.river.primary,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    backButton: {
        marginRight: 15
    },
    headerTitle: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 20
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: 22,
        color: '#333',
        marginBottom: 30,
        letterSpacing: 1
    },
    phraseContainer: {
        backgroundColor: '#f8f8f8',
        padding: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 20,
        width: '100%',
        alignItems: 'center'
    },
    phraseStatic: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: 'black',
        fontStyle: 'italic'
    },
    input: {
        width: '100%',
        height: 80,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 15,
        fontFamily: Fonts.sans,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 30,
        backgroundColor: '#fff'
    },
    sendButton: {
        flexDirection: 'row',
        width: '100%',
        height: 55,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    sendText: {
        color: 'white',
        fontFamily: Fonts.bold,
        fontSize: 16
    }
});

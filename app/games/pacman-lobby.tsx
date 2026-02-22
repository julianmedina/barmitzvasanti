import { Colors, Fonts } from '@/constants/theme';
import { auth } from '@/services/firebaseConfig';
import { pacmanSocket } from '@/services/pacmanSocket';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PacmanLobbyScreen() {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<'pacman' | 'ghost' | null>(null);
    const [playerCount, setPlayerCount] = useState({ pacmanCount: 0, ghostCount: 0, total: 0 });
    const [isJoining, setIsJoining] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);

    useEffect(() => {
        // Lock to landscape orientation
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

        // Connect to backend
        pacmanSocket.connect();

        // Wait for connection
        const checkConnection = setInterval(() => {
            if (pacmanSocket.isConnected()) {
                setIsConnecting(false);
                clearInterval(checkConnection);
            }
        }, 500);

        // Listen for player count updates
        pacmanSocket.on('game_state', (state: any) => {
            updatePlayerCount(state.players);
        });

        pacmanSocket.on('player_joined', () => {
            // Refresh player count
            fetchPlayerCount();
        });

        pacmanSocket.on('player_disconnected', () => {
            fetchPlayerCount();
        });

        return () => {
            ScreenOrientation.unlockAsync();
            pacmanSocket.off('game_state');
            pacmanSocket.off('player_joined');
            pacmanSocket.off('player_disconnected');
        };
    }, []);

    const updatePlayerCount = (players: any[]) => {
        const pacmanCount = players.filter(p => p.role === 'pacman').length;
        const ghostCount = players.filter(p => p.role === 'ghost').length;
        setPlayerCount({ pacmanCount, ghostCount, total: players.length });
    };

    const fetchPlayerCount = async () => {
        try {
            const baseUrl = __DEV__ ? 'http://localhost:3000' : 'https://santiagomedina.com.ar';
            const response = await fetch(`${baseUrl}/api/game/status`);
            const data = await response.json();
            setPlayerCount(data.playerCount);
        } catch (error) {
            console.error('Error fetching player count:', error);
        }
    };

    const handleJoinGame = async () => {
        if (!selectedRole) {
            Alert.alert('Selecciona un rol', 'Debes elegir ser Pacman o Fantasma');
            return;
        }

        if (!auth.currentUser) {
            Alert.alert('Error', 'Debes estar logueado para jugar');
            return;
        }

        setIsJoining(true);

        try {
            const gameState = await pacmanSocket.joinGame(selectedRole);
            console.log('Joined game:', gameState);

            // Navigate to game screen
            router.push('/games/pacman');
        } catch (error: any) {
            console.error('Error joining game:', error);
            Alert.alert('Error', error.message || 'No se pudo unir al juego');
        } finally {
            setIsJoining(false);
        }
    };

    if (isConnecting) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={Colors.elegant.gold} />
                <Text style={styles.loadingText}>Conectando al servidor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={24} color={Colors.elegant.gold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PACMAN GIGANTE</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title}>ELEGÍ TU ROL</Text>

                {/* Role Selection */}
                <View style={styles.rolesContainer}>
                    {/* Pacman */}
                    <TouchableOpacity
                        style={[
                            styles.roleCard,
                            selectedRole === 'pacman' && styles.roleCardSelected
                        ]}
                        onPress={() => setSelectedRole('pacman')}
                    >
                        <View style={styles.roleIcon}>
                            <Text style={styles.roleEmoji}>🟡</Text>
                        </View>
                        <Text style={styles.roleName}>PACMAN</Text>
                        <Text style={styles.roleDescription}>Come puntos y esquiva fantasmas</Text>
                        <View style={styles.roleStats}>
                            <Text style={styles.roleStatsText}>+1 punto por dot</Text>
                            <Text style={styles.roleStatsText}>-20 si te atrapan</Text>
                        </View>
                        <View style={styles.playerCountBadge}>
                            <FontAwesome name="users" size={12} color="white" />
                            <Text style={styles.playerCountText}>{playerCount.pacmanCount}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Ghost */}
                    <TouchableOpacity
                        style={[
                            styles.roleCard,
                            selectedRole === 'ghost' && styles.roleCardSelected
                        ]}
                        onPress={() => setSelectedRole('ghost')}
                    >
                        <View style={styles.roleIcon}>
                            <Text style={styles.roleEmoji}>👻</Text>
                        </View>
                        <Text style={styles.roleName}>FANTASMA</Text>
                        <Text style={styles.roleDescription}>Atrapa a los Pacmans</Text>
                        <View style={styles.roleStats}>
                            <Text style={styles.roleStatsText}>+50 puntos por captura</Text>
                        </View>
                        <View style={styles.playerCountBadge}>
                            <FontAwesome name="users" size={12} color="white" />
                            <Text style={styles.playerCountText}>{playerCount.ghostCount}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Join Button */}
                <TouchableOpacity
                    style={[
                        styles.joinButton,
                        (!selectedRole || isJoining) && styles.joinButtonDisabled
                    ]}
                    onPress={handleJoinGame}
                    disabled={!selectedRole || isJoining}
                >
                    {isJoining ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <>
                            <Text style={styles.joinButtonText}>ENTRAR AL JUEGO</Text>
                            <FontAwesome name="gamepad" size={20} color="black" style={{ marginLeft: 10 }} />
                        </>
                    )}
                </TouchableOpacity>

                {/* Player Count */}
                <Text style={styles.totalPlayers}>
                    {playerCount.total} jugador{playerCount.total !== 1 ? 'es' : ''} conectado{playerCount.total !== 1 ? 's' : ''}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: Colors.elegant.gold,
    },
    backButton: {
        padding: 10,
    },
    headerTitle: {
        fontFamily: Fonts.bold,
        fontSize: 24,
        color: Colors.elegant.gold,
        letterSpacing: 2,
    },
    content: {
        flex: 1,
        padding: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: 28,
        color: 'white',
        marginBottom: 40,
        letterSpacing: 2,
    },
    rolesContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 40,
    },
    roleCard: {
        width: 200,
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#333',
    },
    roleCardSelected: {
        borderColor: Colors.elegant.gold,
        backgroundColor: '#2a2a2a',
    },
    roleIcon: {
        marginBottom: 15,
    },
    roleEmoji: {
        fontSize: 60,
    },
    roleName: {
        fontFamily: Fonts.bold,
        fontSize: 20,
        color: Colors.elegant.gold,
        marginBottom: 10,
    },
    roleDescription: {
        fontFamily: Fonts.sans,
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginBottom: 15,
    },
    roleStats: {
        alignItems: 'center',
        gap: 5,
    },
    roleStatsText: {
        fontFamily: Fonts.sans,
        fontSize: 11,
        color: '#ccc',
    },
    playerCountBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 5,
    },
    playerCountText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        color: 'white',
    },
    joinButton: {
        flexDirection: 'row',
        backgroundColor: Colors.elegant.gold,
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: Colors.elegant.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    joinButtonDisabled: {
        backgroundColor: '#555',
        shadowOpacity: 0,
    },
    joinButtonText: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: 'black',
        letterSpacing: 1,
    },
    totalPlayers: {
        fontFamily: Fonts.sans,
        fontSize: 14,
        color: '#666',
        marginTop: 20,
    },
    loadingText: {
        fontFamily: Fonts.sans,
        fontSize: 16,
        color: 'white',
        marginTop: 20,
    },
});

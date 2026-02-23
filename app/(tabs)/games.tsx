import { Colors, Fonts } from '@/constants/theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function GamesScreen() {
    const router = useRouter();

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Juegos</Text>

            {/* <TouchableOpacity
                style={[styles.card, { backgroundColor: Colors.macabi.primary }]}
                onPress={() => router.push('/games/soccer')}
            >
                <View style={styles.iconContainer}>
                    <FontAwesome name="soccer-ball-o" size={40} color="white" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.gameTitle}>Hacele un Caño</Text>
                    <Text style={styles.gameSubtitle}>¡Jugá con los sensores!</Text>
                </View>
            </TouchableOpacity> */}

            <TouchableOpacity
                style={[styles.card, { backgroundColor: Colors.river.primary, marginTop: 20 }]}
                onPress={() => router.push('/games/missions')}
            >
                <View style={styles.iconContainer}>
                    <FontAwesome name="star" size={40} color="white" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.gameTitle}>Misiones</Text>
                    <Text style={styles.gameSubtitle}>Completá desafíos y sumá puntos</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.card, { backgroundColor: '#7B2CBF', marginTop: 20 }]}
                onPress={() => router.push('/games/trivia')}
            >
                <View style={styles.iconContainer}>
                    <FontAwesome name="question" size={40} color="white" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.gameTitle}>Trivia Medina</Text>
                    <Text style={styles.gameSubtitle}>¿Cuánto sabés de Santi?</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.card, { backgroundColor: '#FFD700', marginTop: 20 }]}
                onPress={() => router.push('/games/pacman-lobby')}
            >
                <View style={styles.iconContainer}>
                    <Text style={{ fontSize: 40 }}>🟡</Text>
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.gameTitle, { color: 'black' }]}>Pacman Gigante</Text>
                    <Text style={[styles.gameSubtitle, { color: '#333' }]}>¡Multijugador en tiempo real!</Text>
                </View>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        paddingTop: 50,
        backgroundColor: Colors.elegant.background,
    },
    title: {
        fontSize: 32,
        fontFamily: Fonts.bold,
        color: Colors.elegant.text,
        marginBottom: 40,
    },
    card: {
        width: '90%',
        height: 100,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    iconContainer: {
        width: 60,
        alignItems: 'center'
    },
    textContainer: {
        flex: 1,
        paddingLeft: 10
    },
    gameTitle: {
        fontFamily: Fonts.bold,
        fontSize: 20,
        color: 'white',
    },
    gameSubtitle: {
        fontFamily: Fonts.light,
        fontSize: 14,
        color: 'white',
    }
});

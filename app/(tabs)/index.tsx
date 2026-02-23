import { Colors, Fonts } from '@/constants/theme';
import { subscribeToConfigs, subscribeToUserProfile, UserProfile } from '@/services/database';
import { auth } from '@/services/firebaseConfig';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubConfigs = subscribeToConfigs(setConfigs);
    const user = auth.currentUser;
    let unsubProfile = () => { };
    if (user) {
      unsubProfile = subscribeToUserProfile(user.uid, (data) => setProfile(data));
    }
    return () => {
      unsubConfigs();
      unsubProfile();
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>{configs.welcome_text || 'BIENVENIDO A LA FIESTA'}</Text>
          <Text style={styles.nameText}>{configs.branding || 'SANTI MEDINA'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileButton}>
          {profile?.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatarMini} />
          ) : (
            <View style={styles.profilePrompt}>
              <Text style={styles.promptText}>ARMÁ TU PERFIL{'\n'}Y GANÁ PUNTOS!</Text>
              <FontAwesome name="arrow-right" size={14} color={Colors.elegant.gold} style={{ marginLeft: 5 }} />
              <FontAwesome name="user-circle" size={35} color={Colors.elegant.gold} style={{ marginLeft: 10 }} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/social/santi-no-es-santi')}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.river.primary }]}>
            <FontAwesome name="commenting" size={30} color="white" />
          </View>
          <Text style={styles.menuText}>Santi no es Santi sin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/selfie/index')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FF4081' }]}>
            <FontAwesome name="camera" size={30} color="white" />
          </View>
          <Text style={styles.menuText}>Selfie</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/social/homenajes')}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.elegant.gold }]}>
            <FontAwesome name="film" size={30} color="black" />
          </View>
          <Text style={styles.menuText}>Homenajes</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/games/soccer')}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.macabi.primary }]}>
            <FontAwesome name="soccer-ball-o" size={30} color="white" />
          </View>
          <Text style={styles.menuText}>Soccer</Text>
        </TouchableOpacity> */}

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/games/missions')}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.river.primary }]}>
            <FontAwesome name="star" size={30} color="white" />
          </View>
          <Text style={styles.menuText}>Misiones</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/games/trivia')}>
          <View style={[styles.iconCircle, { backgroundColor: '#7B2CBF' }]}>
            <FontAwesome name="question" size={30} color="white" />
          </View>
          <Text style={styles.menuText}>Trivia</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/games/pacman-lobby')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFD700' }]}>
            <Text style={{ fontSize: 30 }}>🟡</Text>
          </View>
          <Text style={styles.menuText}>Pacman</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: Colors.elegant.background,
    paddingTop: 60
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 50
  },
  welcomeText: {
    fontFamily: Fonts.light,
    color: 'white',
    fontSize: 14,
    letterSpacing: 2
  },
  nameText: {
    fontFamily: Fonts.bold,
    color: Colors.elegant.gold,
    fontSize: 24,
    letterSpacing: 1
  },
  headerLeft: {
    flex: 1,
    marginRight: 10
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarMini: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.elegant.gold
  },
  profilePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)'
  },
  promptText: {
    color: Colors.elegant.gold,
    fontSize: 8,
    fontFamily: Fonts.bold,
    textAlign: 'right'
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 30
  },
  menuItem: {
    alignItems: 'center',
    width: 100,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5
  },
  menuText: {
    color: Colors.elegant.text,
    fontFamily: Fonts.sans,
    textAlign: 'center'
  }
});

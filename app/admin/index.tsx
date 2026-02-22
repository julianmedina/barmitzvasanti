import { Colors, Fonts } from '@/constants/theme';
import {
    HomenajeItem,
    MediaMetadata,
    NewsAlert,
    SocialMessage,
    UserProfile,
    addHomenaje,
    addNews,
    auth,
    deleteHomenaje,
    deleteMedia,
    deleteMessage,
    deleteNews,
    resetRanking,
    saveConfig,
    subscribeToAllProfiles,
    subscribeToConfigs,
    subscribeToHomenajes,
    subscribeToMedia,
    subscribeToMessages,
    subscribeToNews,
    updateHomenaje,
    updateMessage,
    updateNews
} from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import { signInAnonymously } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

type AdminView = 'MENU' | 'CONFIG' | 'NEWS' | 'HOMENAJES' | 'MESSAGES' | 'PROFILES' | 'MEDIA' | 'DANGER';

export default function AdminPanel() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pin, setPin] = useState('');
    const [currentView, setCurrentView] = useState<AdminView>('MENU');

    // Data States
    const [newsList, setNewsList] = useState<NewsAlert[]>([]);
    const [homenajesList, setHomenajesList] = useState<HomenajeItem[]>([]);
    const [profilesList, setProfilesList] = useState<UserProfile[]>([]);
    const [mediaList, setMediaList] = useState<MediaMetadata[]>([]);
    const [messagesList, setMessagesList] = useState<SocialMessage[]>([]);
    const [configs, setConfigs] = useState<Record<string, any>>({});

    // Forms State
    const [newsText, setNewsText] = useState('');
    const [newsType, setNewsType] = useState<NewsAlert['type']>('INFO');
    const [homTitle, setHomTitle] = useState('');
    const [homYoutube, setHomYoutube] = useState('');
    const [homOrder, setHomOrder] = useState('');

    // Config Form
    const [configBrandTop, setConfigBrandTop] = useState('');
    const [configBrandBottom, setConfigBrandBottom] = useState('');
    const [configWelcome, setConfigWelcome] = useState('');
    const [configSocialTitle, setConfigSocialTitle] = useState('');
    const [configLandingSub, setConfigLandingSub] = useState('');

    const router = useRouter();
    const ADMIN_PIN = "2026";

    useEffect(() => {
        // Recover admin session on web refresh
        if (Platform.OS === 'web' && sessionStorage.getItem('isAdmin') === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            const unsubNews = subscribeToNews(setNewsList);
            const unsubHom = subscribeToHomenajes(setHomenajesList);
            const unsubProfiles = subscribeToAllProfiles(setProfilesList);
            const unsubMedia = subscribeToMedia(setMediaList);
            const unsubMessages = subscribeToMessages(setMessagesList);
            const unsubConfigs = subscribeToConfigs((data) => {
                setConfigs(data);
                if (data.branding_top) setConfigBrandTop(data.branding_top);
                if (data.branding_bottom) setConfigBrandBottom(data.branding_bottom);
                if (data.welcome_text) setConfigWelcome(data.welcome_text);
                if (data.social_title) setConfigSocialTitle(data.social_title);
                if (data.landing_subtitle) setConfigLandingSub(data.landing_subtitle);
            });
            return () => {
                unsubNews(); unsubHom(); unsubProfiles(); unsubMedia(); unsubMessages(); unsubConfigs();
            };
        }
    }, [isAuthenticated]);

    const checkPin = async () => {
        if (pin === ADMIN_PIN) {
            setIsLoading(true);
            try {
                await signInAnonymously(auth);
                if (Platform.OS === 'web') sessionStorage.setItem('isAdmin', 'true');
                setIsAuthenticated(true);
            } catch (e) {
                console.error("Auth Fail", e);
                Alert.alert("Error de Conexión", "No se pudo conectar con el servidor.");
            } finally {
                setIsLoading(false);
            }
        }
        else { Alert.alert("Error", "PIN Incorrecto"); setPin(''); }
    };

    // HANDLERS
    const handleSaveConfig = async () => {
        setIsLoading(true);
        try {
            await saveConfig('branding_top', configBrandTop);
            await saveConfig('branding_bottom', configBrandBottom);
            await saveConfig('welcome_text', configWelcome);
            await saveConfig('social_title', configSocialTitle);
            await saveConfig('landing_subtitle', configLandingSub);
            Alert.alert("Éxito", "Configuración guardada");
        } catch (e) {
            Alert.alert("Error", "No se pudo guardar la configuración");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNews = async () => {
        if (!newsText.trim()) return;
        setIsLoading(true);
        console.log("Admin: Attempting to add news...", { newsType, newsText });
        try {
            await addNews(newsType, newsText);
            setNewsText('');
            Alert.alert("Éxito", "Noticia agregada");
        } catch (e: any) {
            console.error("Admin: Error adding news:", e);
            Alert.alert("Error", `No se pudo agregar la noticia: ${e.message || 'Error desconocido'} `);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteNews = (id: string) => {
        Alert.alert("Confirmar", "¿Borrar noticia?", [{ text: "No" }, { text: "Sí", onPress: () => deleteNews(id) }]);
    };

    const handleAddHomenaje = async () => {
        if (!homTitle.trim() || !homYoutube.trim()) return;
        setIsLoading(true);
        await addHomenaje({ title: homTitle, youtubeId: homYoutube, order: parseInt(homOrder) || 1, locked: true });
        setHomTitle(''); setHomYoutube(''); setHomOrder('');
        setIsLoading(false);
    };

    const handleDeleteHomenaje = (id: string) => {
        Alert.alert("Confirmar", "¿Borrar homenaje?", [{ text: "No" }, { text: "Sí", onPress: () => deleteHomenaje(id) }]);
    };

    const handleDeleteMessage = (id: string) => {
        Alert.alert("Confirmar", "¿Borrar mensaje social?", [{ text: "No" }, { text: "Sí", onPress: () => deleteMessage(id) }]);
    };

    const handleDeleteMedia = (id: string) => {
        Alert.alert("Confirmar", "¿Borrar esta foto?", [{ text: "No" }, { text: "Sí", onPress: () => deleteMedia(id) }]);
    };

    if (!isAuthenticated) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loginBox}>
                    <Text style={styles.title}>PANEL DE CONTROL</Text>
                    <TextInput style={styles.pinInput} value={pin} onChangeText={setPin} keyboardType="numeric" secureTextEntry maxLength={4} placeholder="****" />
                    <TouchableOpacity style={styles.loginBtn} onPress={checkPin}><Text style={styles.loginBtnText}>ENTRAR</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()}><Text style={{ color: '#666', marginTop: 20 }}>Volver</Text></TouchableOpacity>
                </View>
            </View>
        );
    }

    const renderMenu = () => (
        <View style={styles.menuGrid}>
            {[
                { id: 'CONFIG', label: 'Branding/Config', icon: 'gears' },
                { id: 'NEWS', label: 'Noticias Zócalo', icon: 'newspaper-o' },
                { id: 'HOMENAJES', label: 'Homenajes (Videos)', icon: 'video-camera' },
                { id: 'MESSAGES', label: 'Mensajes Sociales', icon: 'comments' },
                { id: 'PROFILES', label: 'Invitados/Perfiles', icon: 'users' },
                { id: 'MEDIA', label: 'Fotos Subidas', icon: 'image' },
                { id: 'DANGER', label: 'Zona Peligrosa', icon: 'warning' },
            ].map((item) => (
                <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => setCurrentView(item.id as AdminView)}>
                    <FontAwesome name={item.icon as any} size={30} color={Colors.elegant.gold} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderHeader = (title: string) => (
        <View style={styles.viewHeader}>
            <TouchableOpacity onPress={() => setCurrentView('MENU')}>
                <FontAwesome name="arrow-left" size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.viewHeaderTitle}>{title}</Text>
            <View style={{ width: 20 }} />
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.topBarTitle}>ADMINISTRACIÓN</Text>
                    <Text style={styles.topBarSubtitle}>Bar Mitzva Medina</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)')}>
                    <FontAwesome name="close" size={24} color={Colors.elegant.gold} />
                </TouchableOpacity>
            </View>

            {isLoading && <ActivityIndicator color={Colors.elegant.gold} style={{ padding: 10 }} />}

            <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
                {currentView === 'MENU' && renderMenu()}

                {currentView === 'CONFIG' && (
                    <View style={styles.section}>
                        {renderHeader('CONFIGURACIÓN GLOBAL')}
                        <Text style={styles.inputLabel}>Título Superior (ej: El Bar Mitzva de)</Text>
                        <TextInput style={styles.inputField} value={configBrandTop} onChangeText={setConfigBrandTop} placeholder="El Bar Mitzva de..." />

                        <Text style={styles.inputLabel}>Título Principal (ej: MEDINA)</Text>
                        <TextInput style={styles.inputField} value={configBrandBottom} onChangeText={setConfigBrandBottom} placeholder="SANTI MEDINA" />

                        <Text style={styles.inputLabel}>Texto de Bienvenida (Home)</Text>
                        <TextInput style={styles.inputField} value={configWelcome} onChangeText={setConfigWelcome} placeholder="BIENVENIDO A LA FIESTA" />

                        <Text style={styles.inputLabel}>Título Sección Social</Text>
                        <TextInput style={styles.inputField} value={configSocialTitle} onChangeText={setConfigSocialTitle} placeholder="Santi no es Santi sin..." />

                        <Text style={styles.inputLabel}>Subtítulo Pantalla Bienvenida</Text>
                        <TextInput style={styles.inputField} value={configLandingSub} onChangeText={setConfigLandingSub} placeholder="EXPERIENCIA INTERACTIVA" />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConfig} disabled={isLoading}>
                            <Text style={styles.saveBtnText}>GUARDAR TODA LA CONFIG</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {currentView === 'NEWS' && (
                    <View style={styles.section}>
                        {renderHeader('GESTIÓN DE NOTICIAS')}
                        <TextInput style={styles.inputField} placeholder="Texto de la noticia..." value={newsText} onChangeText={setNewsText} />
                        <View style={styles.typeRow}>
                            {['INFO', 'ALERTA', 'ULTIMO MOMENTO', 'URGENTE'].map((t) => (
                                <TouchableOpacity key={t} style={[styles.typeMiniBtn, newsType === t && styles.typeMiniBtnActive]} onPress={() => setNewsType(t as any)}>
                                    <Text style={styles.typeMiniText}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddNews}><Text style={styles.addBtnText}>AGREGAR NOTICIA</Text></TouchableOpacity>
                        {newsList.map(n => (
                            <View key={n.id} style={styles.listItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, color: '#444' }}>{n.type}</Text>
                                    <Text style={{ color: '#111', fontWeight: 'bold' }}>{n.text}</Text>
                                </View>
                                <Switch
                                    value={n.visible !== false}
                                    onValueChange={(v) => updateNews(n.id!, { visible: v })}
                                    trackColor={{ false: '#767577', true: Colors.elegant.gold }}
                                />
                                <TouchableOpacity onPress={() => handleDeleteNews(n.id!)} style={{ marginLeft: 15 }}>
                                    <FontAwesome name="trash" size={18} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {currentView === 'HOMENAJES' && (
                    <View style={styles.section}>
                        {renderHeader('VIDEOS HOMENAJES')}
                        <TextInput style={styles.inputField} placeholder="Título" value={homTitle} onChangeText={setHomTitle} />
                        <TextInput style={styles.inputField} placeholder="YouTube ID" value={homYoutube} onChangeText={setHomYoutube} />
                        <TextInput style={styles.inputField} placeholder="Orden" value={homOrder} onChangeText={setHomOrder} keyboardType="numeric" />
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddHomenaje}><Text style={styles.addBtnText}>CREAR HOMENAJE</Text></TouchableOpacity>
                        {homenajesList.map(h => (
                            <View key={h.id} style={styles.listItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{h.title}</Text>
                                    <Text style={{ fontSize: 10, color: '#999' }}>Orden: {h.order}</Text>
                                </View>
                                <Switch value={!h.locked} onValueChange={(v) => updateHomenaje(h.id!, { locked: !v })} />
                                <TouchableOpacity onPress={() => handleDeleteHomenaje(h.id!)} style={{ marginLeft: 15 }}><FontAwesome name="trash" size={18} color="red" /></TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {currentView === 'MESSAGES' && (
                    <View style={styles.section}>
                        {renderHeader('SANTI NO ES SANTI SIN...')}
                        {messagesList.map(m => {
                            const sender = profilesList.find(p => p.id === m.userId);
                            return (
                                <View key={m.id} style={styles.listItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, color: '#666' }}>{sender?.name || 'Invitado'}:</Text>
                                        <Text style={{ color: '#444', fontStyle: 'italic' }}>"{m.text}"</Text>
                                    </View>
                                    <Switch
                                        value={m.visible !== false}
                                        onValueChange={(v) => updateMessage(m.id!, { visible: v })}
                                        trackColor={{ false: '#767577', true: Colors.elegant.gold }}
                                    />
                                    <TouchableOpacity onPress={() => handleDeleteMessage(m.id!)} style={{ marginLeft: 15 }}>
                                        <FontAwesome name="trash" size={18} color="red" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}

                {currentView === 'PROFILES' && (
                    <View style={styles.section}>
                        {renderHeader('INVITADOS')}
                        {profilesList.map(p => (
                            <View key={p.id} style={styles.listItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{p.name || 'Sin nombre'}</Text>
                                    <Text style={{ fontSize: 12, color: '#666' }}>📍 {p.metWhere}</Text>
                                    <Text style={{ fontSize: 10, color: '#999' }}>UID: {p.id}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {currentView === 'MEDIA' && (
                    <View style={styles.section}>
                        {renderHeader('GALERÍA DE FOTOS')}
                        <View style={styles.mediaGrid}>
                            {mediaList.map(m => (
                                <View key={m.id} style={styles.mediaCard}>
                                    <Image source={{ uri: m.url }} style={styles.mediaImg} />
                                    <TouchableOpacity style={styles.delMedia} onPress={() => handleDeleteMedia(m.id!)}>
                                        <FontAwesome name="trash" size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {currentView === 'DANGER' && (
                    <View style={styles.section}>
                        {renderHeader('PELIGRO')}
                        <TouchableOpacity style={styles.dangerBtn} onPress={resetRanking}>
                            <Text style={styles.dangerBtnText}>REINICIAR RANKING (PUNTAJES)</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111' },
    loginBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    title: { color: 'white', fontSize: 22, fontFamily: Fonts.bold, marginBottom: 30 },
    pinInput: { backgroundColor: 'white', width: 200, height: 60, borderRadius: 10, textAlign: 'center', fontSize: 24, marginBottom: 20 },
    loginBtn: { backgroundColor: Colors.elegant.gold, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 10 },
    loginBtnText: { fontFamily: Fonts.bold, color: 'black' },
    topBar: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#000', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topBarTitle: { color: 'white', fontFamily: Fonts.bold, fontSize: 18 },
    topBarSubtitle: { color: Colors.elegant.gold, fontSize: 10 },
    menuGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 10, justifyContent: 'center', marginTop: 20 },
    menuItem: { width: '45%', backgroundColor: '#222', padding: 20, borderRadius: 15, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#333' },
    menuLabel: { color: 'white', fontSize: 12, textAlign: 'center', fontFamily: Fonts.sans },
    section: { padding: 20 },
    viewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15 },
    viewHeaderTitle: { color: Colors.elegant.gold, fontFamily: Fonts.bold, fontSize: 16 },
    inputLabel: { color: '#AAA', fontSize: 12, marginBottom: 5, marginTop: 15 },
    inputField: { backgroundColor: '#222', color: 'white', borderRadius: 8, padding: 12, marginBottom: 10 },
    saveBtn: { backgroundColor: Colors.elegant.gold, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    saveBtnText: { fontWeight: 'bold' },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
    typeMiniBtn: { backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    typeMiniBtnActive: { backgroundColor: Colors.elegant.gold },
    typeMiniText: { color: 'white', fontSize: 9 },
    addBtn: { backgroundColor: '#444', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    addBtnText: { color: 'white', fontWeight: 'bold' },
    listItem: { backgroundColor: '#F0F0F0', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    mediaCard: { width: '31%', aspectRatio: 1, position: 'relative', borderRadius: 8, overflow: 'hidden' },
    mediaImg: { width: '100%', height: '100%', backgroundColor: '#222' },
    delMedia: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(255,0,0,0.7)', padding: 5, borderRadius: 10 },
    dangerBtn: { backgroundColor: '#CC0000', padding: 20, borderRadius: 10, alignItems: 'center' },
    dangerBtnText: { color: 'white', fontWeight: 'bold' }
});

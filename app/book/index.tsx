import { Colors, Fonts } from '@/constants/theme';
import { subscribeToConfigs } from '@/services/database';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    Image as RNImage,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

/** Tamaño fijo del totem (no responsive). */
const TOTEM_WIDTH = 1080;
const TOTEM_HEIGHT = 1920;
const SCREEN_WIDTH = TOTEM_WIDTH;
const SCREEN_HEIGHT = TOTEM_HEIGHT;

const SITE_URL = 'https://santiagomedina.com.ar';
const SALUDO_URL = 'https://santiagomedina.com.ar/enviarsaludo';

const PLACEHOLDER_PHOTOS = [
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80',
    'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80',
];

type SlideItem =
    | { id: string; type: 'portada' }
    | { id: string; type: 'single'; url: string }
    | { id: string; type: 'double'; urls: [string, string]; layout: 'sideBySide' };

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        RNImage.getSize(
            uri,
            (width, height) => resolve({ width, height }),
            () => resolve({ width: 1, height: 1 }) // fallback: tratar como no portrait
        );
    });
}

export default function BookScreen() {
    const router = useRouter();
    const [photos, setPhotos] = useState<string[]>(PLACEHOLDER_PHOTOS);
    const [brandTop, setBrandTop] = useState('El Bar Mitzvá de');
    const [brandBottom, setBrandBottom] = useState('SANTI MEDINA');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dims, setDims] = useState<{ w: number; h: number }[]>([]);
    const listRef = useRef<FlatList>(null);

    useEffect(() => {
        const unsub = subscribeToConfigs((data) => {
            if (Array.isArray(data.book_photos) && data.book_photos.length > 0) {
                setPhotos(data.book_photos);
            }
            if (data.branding_top) setBrandTop(data.branding_top);
            if (data.branding_bottom) setBrandBottom(data.branding_bottom || data.branding || 'SANTI MEDINA');
        });
        return () => unsub();
    }, []);

    // Precaragar dimensiones de cada foto
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const results: { w: number; h: number }[] = [];
            for (const uri of photos) {
                if (cancelled) return;
                try {
                    const d = await getImageDimensions(uri);
                    results.push({ w: d.width, h: d.height });
                } catch {
                    results.push({ w: 1, h: 1 });
                }
            }
            if (!cancelled) setDims(results);
        };
        load();
        return () => { cancelled = true; };
    }, [photos]);

    // Armar slides: portada + fotos (1 o 2 por slide según orientación)
    const items = useMemo((): SlideItem[] => {
        const list: SlideItem[] = [{ id: 'portada', type: 'portada' }];
        if (photos.length === 0) return list;
        if (dims.length !== photos.length) {
            // Mientras no tenemos dimensiones, una foto por slide
            photos.forEach((url, i) => list.push({ id: `single-${i}`, type: 'single', url }));
            return list;
        }
        let i = 0;
        while (i < photos.length) {
            const curPortrait = dims[i] && dims[i].h > dims[i].w;
            const nextPortrait = i + 1 < photos.length && dims[i + 1] && dims[i + 1].h > dims[i + 1].w;
            if (curPortrait && nextPortrait) {
                list.push({
                    id: `double-${i}`,
                    type: 'double',
                    urls: [photos[i], photos[i + 1]],
                    layout: 'sideBySide',
                });
                i += 2;
            } else {
                list.push({ id: `single-${i}`, type: 'single', url: photos[i] });
                i += 1;
            }
        }
        return list;
    }, [photos, dims]);

    const onViewableItemsChanged = useRef((info: { viewableItems: { index: number }[] }) => {
        if (info.viewableItems.length > 0) {
            setCurrentIndex(info.viewableItems[0].index ?? 0);
        }
    }).current;
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 }).current;

    const goNext = () => {
        if (currentIndex < items.length - 1) {
            listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        }
    };
    const goPrev = () => {
        if (currentIndex > 0) {
            listRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
        }
    };

    const renderItem = ({ item, index }: { item: SlideItem; index: number }) => {
        const transition = index === 0
            ? undefined
            : FadeIn.duration(320).springify();

        if (item.type === 'portada') {
            return (
                <Animated.View entering={transition} style={styles.slide}>
                    <View style={styles.portadaGradient} />
                    <View style={styles.portadaContent}>
                        <Text style={styles.portadaLine1}>{brandTop}</Text>
                        <Text style={styles.portadaLine2}>{brandBottom.toUpperCase()}</Text>
                        <Text style={styles.portadaSub}>BOOK DE SANTI</Text>
                        <View style={styles.portadaDivider} />
                        <Text style={styles.portadaHint}>Deslizá para recorrer las fotos</Text>
                    </View>
                </Animated.View>
            );
        }

        if (item.type === 'single') {
            return (
                <Animated.View entering={transition} style={styles.slide}>
                    <Image
                        source={{ uri: item.url }}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                    />
                </Animated.View>
            );
        }

        // double, sideBySide
        return (
            <Animated.View entering={transition} style={styles.slide}>
                <View style={styles.doubleRow}>
                    <View style={styles.half}>
                        <Image
                            source={{ uri: item.urls[0] }}
                            style={StyleSheet.absoluteFillObject}
                            contentFit="cover"
                        />
                    </View>
                    <View style={styles.halfDivider} />
                    <View style={styles.half}>
                        <Image
                            source={{ uri: item.urls[1] }}
                            style={StyleSheet.absoluteFillObject}
                            contentFit="cover"
                        />
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.totemFrame}>
            <FlatList
                ref={listRef}
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
                bounces={false}
                decelerationRate="fast"
            />

            <View style={styles.headerOverlay} pointerEvents="box-none">
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={22} color="white" />
                </TouchableOpacity>
                <View style={styles.headerBrand}>
                    <Text style={styles.headerLine1}>{brandTop}</Text>
                    <Text style={styles.headerLine2}>{brandBottom}</Text>
                </View>
                <View style={styles.headerRight} />
            </View>

            <View style={styles.dotsContainer} pointerEvents="none">
                {items.map((_, i) => (
                    <View
                        key={i}
                        style={[styles.dot, i === currentIndex && styles.dotActive]}
                    />
                ))}
            </View>

            <View style={styles.tapZones} pointerEvents="box-none">
                <TouchableOpacity style={styles.tapLeft} onPress={goPrev} activeOpacity={1} />
                <TouchableOpacity style={styles.tapRight} onPress={goNext} activeOpacity={1} />
            </View>

            <View style={styles.footerOverlay} pointerEvents="box-none">
                <View style={styles.footerRow}>
                    <View style={styles.qrBlock}>
                        <View style={styles.qrWrap}>
                            <RNImage
                                source={{
                                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(SITE_URL)}`,
                                }}
                                style={styles.qrImage}
                            />
                        </View>
                    </View>
                    <View style={styles.qrBlock}>
                        <Text style={styles.qrSaludoLabel}>Escaneá para mandar tu saludo</Text>
                        <View style={styles.qrWrap}>
                            <RNImage
                                source={{
                                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(SALUDO_URL)}`,
                                }}
                                style={styles.qrImage}
                            />
                        </View>
                    </View>
                </View>
            </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    totemFrame: {
        width: TOTEM_WIDTH,
        height: TOTEM_HEIGHT,
        overflow: 'hidden',
        position: 'relative',
    },
    slide: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doubleRow: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
    },
    half: {
        flex: 1,
        overflow: 'hidden',
    },
    halfDivider: {
        width: 2,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    portadaGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0a0a0a',
    },
    portadaContent: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    portadaLine1: {
        fontFamily: Fonts.light,
        fontSize: 22,
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 4,
        marginBottom: 6,
    },
    portadaLine2: {
        fontFamily: Fonts.bold,
        fontSize: 36,
        color: Colors.elegant.gold,
        letterSpacing: 2,
        marginBottom: 24,
    },
    portadaSub: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 6,
        marginBottom: 32,
    },
    portadaDivider: {
        width: 80,
        height: 2,
        backgroundColor: Colors.elegant.gold,
        marginBottom: 24,
    },
    portadaHint: {
        fontFamily: Fonts.light,
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'web' ? 24 : 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBrand: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    headerLine1: {
        fontFamily: Fonts.light,
        fontSize: 12,
        color: 'white',
        letterSpacing: 2,
    },
    headerLine2: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: Colors.elegant.gold,
        letterSpacing: 1,
    },
    headerRight: {
        width: 44,
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    dotActive: {
        backgroundColor: Colors.elegant.gold,
        width: 24,
    },
    tapZones: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
    },
    tapLeft: {
        flex: 1,
    },
    tapRight: {
        flex: 1,
    },
    footerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        maxWidth: 360,
    },
    qrBlock: {
        alignItems: 'center',
    },
    qrSaludoLabel: {
        fontFamily: Fonts.light,
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 8,
        textAlign: 'center',
    },
    qrWrap: {
        padding: 6,
        backgroundColor: 'white',
        borderRadius: 8,
    },
    qrImage: {
        width: 64,
        height: 64,
    },
});

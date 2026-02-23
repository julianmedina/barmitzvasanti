/**
 * Fallback (sin extensión de plataforma). Mismo contenido que .web para iframe.
 * En native se usa TriviaYouTubePlayer.native.tsx (WebView).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = { youtubeId: string; style?: object; shortFormat?: boolean };

export default function TriviaYouTubePlayer({ youtubeId, style, shortFormat }: Props) {
    return (
        <View style={[shortFormat ? styles.videoShort : styles.video, style]}>
            <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: 'none', borderRadius: 12 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    video: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden'
    },
    videoShort: {
        width: '100%',
        maxWidth: 400,
        aspectRatio: 9 / 16,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden'
    }
});

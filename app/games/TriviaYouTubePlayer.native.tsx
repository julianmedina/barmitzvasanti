import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = { youtubeId: string; style?: object; shortFormat?: boolean };

export default function TriviaYouTubePlayer({ youtubeId, style, shortFormat }: Props) {
    return (
        <View style={[shortFormat ? styles.videoShort : styles.video, style]}>
            <WebView
                source={{ uri: `https://www.youtube.com/embed/${youtubeId}?autoplay=1` }}
                style={StyleSheet.absoluteFill}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
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

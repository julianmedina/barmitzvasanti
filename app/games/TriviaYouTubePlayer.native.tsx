import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function TriviaYouTubePlayer({ youtubeId, style }: { youtubeId: string; style?: object }) {
    return (
        <View style={[styles.video, style]}>
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
    }
});

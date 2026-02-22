import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function TriviaYouTubePlayer({ youtubeId, style }: { youtubeId: string; style?: object }) {
    return (
        <View style={[styles.video, style]}>
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
    }
});

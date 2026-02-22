/**
 * Stub para web: en desktop no usamos el WebView nativo.
 * Metro redirige "react-native-webview" aquí cuando platform === 'web'.
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';

export function WebView({
    source,
    style,
    ...rest
}: {
    source?: { uri?: string };
    style?: ViewStyle;
    [key: string]: unknown;
}) {
    return <View style={[{ flex: 1, backgroundColor: '#000' }, style]} {...rest} />;
}

export default WebView;

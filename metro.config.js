const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-webview') {
        return {
            filePath: path.resolve(__dirname, 'lib/react-native-webview-web-stub.tsx'),
            type: 'sourceFile',
        };
    }
    // Force html2canvas to use ESM build on web so Metro can resolve it (main is UMD and fails)
    if (platform === 'web' && moduleName === 'html2canvas') {
        const html2canvasEsm = path.resolve(__dirname, 'node_modules/html2canvas/dist/html2canvas.esm.js');
        return { filePath: html2canvasEsm, type: 'sourceFile' };
    }
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

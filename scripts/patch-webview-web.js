#!/usr/bin/env node
/**
 * Parche para web: copia WebView.styles.web.js a react-native-webview
 * para que Metro lo resuelva al hacer build web (evita "Unable to resolve module ./WebView.styles").
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'scripts', 'patches', 'react-native-webview-WebView.styles.web.js');
const dest = path.join(root, 'node_modules', 'react-native-webview', 'lib', 'WebView.styles.web.js');

if (!fs.existsSync(path.join(root, 'node_modules', 'react-native-webview'))) {
  process.exit(0);
}
fs.copyFileSync(src, dest);

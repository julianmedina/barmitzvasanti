#!/usr/bin/env node
/**
 * Copia el icono de la app a public/ para la PWA (logo192.png y logo512.png).
 * Ejecutar una vez: node scripts/copy-pwa-icons.js
 * Opcional: para iconos en tamaño exacto, reemplazá manualmente con imágenes 192x192 y 512x512.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iconSrc = path.join(root, 'assets', 'images', 'icon.png');
const publicDir = path.join(root, 'public');

if (!fs.existsSync(iconSrc)) {
  console.warn('No se encontró assets/images/icon.png. Agregá logo192.png y logo512.png manualmente en public/.');
  process.exit(0);
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const dest192 = path.join(publicDir, 'logo192.png');
const dest512 = path.join(publicDir, 'logo512.png');
fs.copyFileSync(iconSrc, dest192);
fs.copyFileSync(iconSrc, dest512);
console.log('Iconos PWA copiados a public/logo192.png y public/logo512.png.');
console.log('Para mejor calidad, podés reemplazarlos por versiones 192x192 y 512x512 px.');

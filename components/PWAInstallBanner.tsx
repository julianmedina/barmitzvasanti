import { Colors, Fonts } from '@/constants/theme';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DAYS = 7;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  // @ts-expect-error - standalone exists on iOS Safari
  if (navigator.standalone === true) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((window as unknown as { matchMedia: (q: string) => { matches: boolean } }).matchMedia('(display-mode: fullscreen)').matches) return true;
  return false;
}

function isMobileWeb(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 768;
  return isMobile || isNarrow;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<{ outcome: string }>;
  userChoice: Promise<{ outcome: string }>;
};

export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  const hide = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (isStandalone()) return;
    if (!isMobileWeb()) return;

    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const age = (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60 * 24);
        if (age < DISMISS_DAYS) return;
      }
    } catch {
      // ignore
    }

    const isApple = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(isApple);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // En Android/Chrome, beforeinstallprompt puede no dispararse si ya cumplió criterios;
    // mostramos el banner igual en móvil para invitar a "Añadir a pantalla de inicio"
    if (isApple) {
      setVisible(true);
    } else {
      // Dar un pequeño delay por si llega beforeinstallprompt
      const t = setTimeout(() => {
        setVisible(true);
      }, 1500);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') hide();
      setDeferredPrompt(null);
    } else {
      hide();
    }
  }, [deferredPrompt, hide]);

  if (!visible) return null;

  return (
    <View style={styles.banner} pointerEvents="box-none">
      <View style={styles.card}>
        <Text style={styles.title}>Instalá la app</Text>
        <Text style={styles.text}>
          {isIOS
            ? 'Tocá compartir y luego "Añadir a la pantalla de inicio" para abrir en pantalla completa.'
            : deferredPrompt
              ? 'Agregá la app al inicio para usarla como una app con ícono y pantalla completa.'
              : 'Agregá esta página a la pantalla de inicio para abrirla como una app.'}
        </Text>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={deferredPrompt ? handleInstall : hide}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {deferredPrompt ? 'Instalar' : 'Entendido'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissButton} onPress={hide} activeOpacity={0.8}>
            <Text style={styles.dismissText}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.elegant.gold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.elegant.gold,
    marginBottom: 8,
  },
  text: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#EEE',
    lineHeight: 20,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.elegant.gold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: Fonts.bold,
    color: '#000',
    fontSize: 15,
  },
  dismissButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dismissText: {
    fontFamily: Fonts.sans,
    color: Colors.elegant.textSecondary,
    fontSize: 14,
  },
});

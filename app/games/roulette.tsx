import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * La Ruleta fue reemplazada por MISIÓNES.
 * Redirigir a la nueva pantalla.
 */
export default function RouletteRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/games/missions');
    }, [router]);
    return null;
}

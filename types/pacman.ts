export interface PacmanPlayer {
    uid: string;
    name: string;
    avatarUrl: string;
    role: 'pacman' | 'ghost';
    x: number;
    y: number;
    direction: string;
    scoreMatch: number;
    alive: boolean;
}

export interface GameState {
    session: {
        status: 'waiting' | 'running' | 'paused';
        worldSeed: number;
        startedAt: number | null;
        gameVisible: boolean;
    };
    players: PacmanPlayer[];
    eatenDots: string[];
    remainingDots: number;
    events: GameEvent[];
}

export interface GameEvent {
    type: 'capture' | 'eat' | 'join' | 'respawn' | 'disconnect';
    text: string;
    timestamp: number;
}

export interface ReentryVideo {
    id: string;
    title: string;
    youtubeId: string;
    enabled: boolean;
    order: number;
}

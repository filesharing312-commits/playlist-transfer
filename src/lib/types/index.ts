export interface Track {
    id: string;
    name: string;
    artist: string;
    album: string;
    durationMs: number;
    isrc?: string;
}

export interface Playlist {
    id: string;
    name: string;
    description?: string;
    trackCount: number;
    tracks: Track[];
    imageUrl?: string;
}

export interface MusicProvider {
    name: string;
    getAuthUrl(): string;
    handleCallback(code: string): Promise<TokenData>;
    getPlaylists(token: string): Promise<Playlist[]>;
    getPlaylistTracks(token: string, playlistId: string): Promise<Track[]>;
    createPlaylist(token: string, name: string, description?: string): Promise<string>;
    addTracks(token: string, playlistId: string, tracks: Track[]): Promise<{ added: number; failed: number }>;
    searchTrack(token: string, track: Track): Promise<Track | null>;
}

export interface TokenData {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
}

export interface TransferResult {
    sourcePlaylist: Playlist;
    targetPlaylistId: string;
    matched: Track[];
    unmatched: Track[];
    totalTracks: number;
}

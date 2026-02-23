import { MusicProvider, TokenData, Track, Playlist } from '../types';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;

class SpotifyProvider implements MusicProvider {
    name = 'Spotify';

    getAuthUrl(): string {
        const scopes = 'playlist-read-private playlist-modify-public playlist-modify-private';
        return `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;
    }

    async handleCallback(code: string): Promise<TokenData> {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
            }).toString(),
        });
        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(Date.now() + data.expires_in * 1000),
        };
    }

    async getPlaylists(token: string): Promise<Playlist[]> {
        const playlists: Playlist[] = [];
        let nextUrl: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50';

        while (nextUrl) {
            const response = await fetch(nextUrl, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            playlists.push(
                ...data.items.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
                    trackCount: item.tracks.total,
                    tracks: [],
                    imageUrl: item.images?.[0]?.url,
                }))
            );
            nextUrl = data.next;
        }

        return playlists;
    }

    async getPlaylistTracks(token: string, playlistId: string): Promise<Track[]> {
        const tracks: Track[] = [];
        let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

        while (nextUrl) {
            const response = await fetch(nextUrl, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            tracks.push(
                ...data.items
                    .filter((item: any) => item.track)
                    .map((item: any) => ({
                        id: item.track.id,
                        name: item.track.name,
                        artist: item.track.artists.map((a: any) => a.name).join(', '),
                        album: item.track.album?.name || '',
                        durationMs: item.track.duration_ms,
                        isrc: item.track.external_ids?.isrc,
                    }))
            );
            nextUrl = data.next;
        }

        return tracks;
    }

    async createPlaylist(token: string, name: string, description?: string): Promise<string> {
        // First get current user ID
        const userRes = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const user = await userRes.json();

        const response = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description: description || '', public: false }),
        });
        return (await response.json()).id;
    }

    async addTracks(token: string, playlistId: string, tracks: Track[]): Promise<{ added: number; failed: number }> {
        let added = 0;
        let failed = 0;

        // First, resolve all tracks to Spotify URIs
        const uris: (string | null)[] = await Promise.all(
            tracks.map(async (track) => {
                const found = await this.searchTrack(token, track);
                return found ? `spotify:track:${found.id}` : null;
            })
        );

        const validUris = uris.filter((u): u is string => u !== null);
        failed = uris.length - validUris.length;

        // Batch add in groups of 100
        for (let i = 0; i < validUris.length; i += 100) {
            const batch = validUris.slice(i, i + 100);
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uris: batch }),
            });
            if (response.ok) {
                added += batch.length;
            } else {
                failed += batch.length;
            }
        }

        return { added, failed };
    }

    async searchTrack(token: string, track: Track): Promise<Track | null> {
        // Try ISRC first (most accurate)
        if (track.isrc) {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=isrc:${track.isrc}&type=track&limit=1`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.tracks?.items?.length > 0) {
                const t = data.tracks.items[0];
                return {
                    id: t.id,
                    name: t.name,
                    artist: t.artists.map((a: any) => a.name).join(', '),
                    album: t.album?.name || '',
                    durationMs: t.duration_ms,
                    isrc: t.external_ids?.isrc,
                };
            }
        }

        // Fall back to name + artist search
        const q = `track:${track.name} artist:${track.artist}`;
        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (data.tracks?.items?.length > 0) {
            const t = data.tracks.items[0];
            return {
                id: t.id,
                name: t.name,
                artist: t.artists.map((a: any) => a.name).join(', '),
                album: t.album?.name || '',
                durationMs: t.duration_ms,
                isrc: t.external_ids?.isrc,
            };
        }

        return null;
    }
}

export default SpotifyProvider;

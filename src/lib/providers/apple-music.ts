import { MusicProvider, TokenData, Track, Playlist } from '../types';
import * as crypto from 'crypto';

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID!;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID!;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY!;
const APPLE_API_BASE = 'https://api.music.apple.com/v1';

// Apple Music uses MusicKit JS on the frontend for user tokens.
// The developer token (JWT) is generated server-side.
// The "token" param in methods below is the Music User Token from MusicKit JS.

function base64url(data: Buffer | string): string {
    const b = typeof data === 'string' ? Buffer.from(data) : data;
    return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateDeveloperToken(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'ES256', kid: APPLE_KEY_ID }));
    const payload = base64url(JSON.stringify({ iss: APPLE_TEAM_ID, iat: now, exp: now + 3600 }));
    const key = APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const signature = crypto.sign('sha256', Buffer.from(`${header}.${payload}`), {
        key,
        dsaEncoding: 'ieee-p1363',
    });
    return `${header}.${payload}.${base64url(signature)}`;
}

class AppleMusicProvider implements MusicProvider {
    name = 'Apple Music';

    private getHeaders(userToken: string) {
        return {
            Authorization: `Bearer ${generateDeveloperToken()}`,
            'Music-User-Token': userToken,
            'Content-Type': 'application/json',
        };
    }

    getAuthUrl(): string {
        // Apple Music auth is handled client-side via MusicKit JS
        // This returns a placeholder — the frontend handles the actual auth flow
        return '/auth/apple-music';
    }

    async handleCallback(code: string): Promise<TokenData> {
        // MusicKit JS returns the user token directly on the frontend
        // The "code" here is actually the Music User Token
        return {
            accessToken: code,
            expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // ~6 months
        };
    }

    async getPlaylists(token: string): Promise<Playlist[]> {
        const playlists: Playlist[] = [];
        let url: string | null = `${APPLE_API_BASE}/me/library/playlists?limit=25`;

        while (url) {
            const response = await fetch(url, { headers: this.getHeaders(token) });
            if (!response.ok) throw new Error(`Apple Music API error: ${response.status}`);
            const data = await response.json();

            playlists.push(
                ...(data.data || []).map((item: any) => ({
                    id: item.id,
                    name: item.attributes.name,
                    description: item.attributes.description?.standard || '',
                    trackCount: item.attributes.trackCount || 0,
                    tracks: [],
                    imageUrl: item.attributes.artwork?.url?.replace('{w}x{h}', '300x300'),
                }))
            );

            url = data.next ? `${APPLE_API_BASE}${data.next}` : null;
        }

        return playlists;
    }

    async getPlaylistTracks(token: string, playlistId: string): Promise<Track[]> {
        const tracks: Track[] = [];
        let url: string | null = `${APPLE_API_BASE}/me/library/playlists/${playlistId}/tracks?limit=100`;

        while (url) {
            const response = await fetch(url, { headers: this.getHeaders(token) });
            if (!response.ok) throw new Error(`Apple Music API error: ${response.status}`);
            const data = await response.json();

            tracks.push(
                ...(data.data || []).map((item: any) => ({
                    id: item.id,
                    name: item.attributes.name,
                    artist: item.attributes.artistName || '',
                    album: item.attributes.albumName || '',
                    durationMs: item.attributes.durationInMillis || 0,
                    isrc: item.attributes.isrc,
                }))
            );

            url = data.next ? `${APPLE_API_BASE}${data.next}` : null;
        }

        return tracks;
    }

    async createPlaylist(token: string, name: string, description?: string): Promise<string> {
        const response = await fetch(`${APPLE_API_BASE}/me/library/playlists`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify({
                attributes: { name, description: description || '' },
            }),
        });
        if (!response.ok) throw new Error(`Failed to create playlist: ${response.status}`);
        const data = await response.json();
        return data.data[0].id;
    }

    async addTracks(token: string, playlistId: string, tracks: Track[]): Promise<{ added: number; failed: number }> {
        let added = 0;
        let failed = 0;

        // Resolve tracks to Apple Music catalog IDs
        const resolvedTracks: Track[] = [];
        for (const track of tracks) {
            const found = await this.searchTrack(token, track);
            if (found) {
                resolvedTracks.push(found);
            } else {
                failed++;
            }
        }

        // Batch add (Apple Music supports bulk add)
        if (resolvedTracks.length > 0) {
            const response = await fetch(`${APPLE_API_BASE}/me/library/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: this.getHeaders(token),
                body: JSON.stringify({
                    data: resolvedTracks.map((t) => ({ id: t.id, type: 'songs' })),
                }),
            });
            if (response.ok) {
                added = resolvedTracks.length;
            } else {
                failed += resolvedTracks.length;
            }
        }

        return { added, failed };
    }

    async searchTrack(token: string, track: Track): Promise<Track | null> {
        const headers = this.getHeaders(token);

        // Try ISRC first
        if (track.isrc) {
            const url = `${APPLE_API_BASE}/catalog/us/songs?filter[isrc]=${track.isrc}`;
            const response = await fetch(url, { headers });
            if (response.ok) {
                const data = await response.json();
                if (data.data?.length > 0) {
                    const song = data.data[0];
                    return {
                        id: song.id,
                        name: song.attributes.name,
                        artist: song.attributes.artistName,
                        album: song.attributes.albumName || '',
                        durationMs: song.attributes.durationInMillis,
                        isrc: song.attributes.isrc,
                    };
                }
            }
        }

        // Fall back to text search
        const q = `${track.artist} ${track.name}`;
        const url = `${APPLE_API_BASE}/catalog/us/search?term=${encodeURIComponent(q)}&types=songs&limit=1`;
        const response = await fetch(url, { headers });
        if (!response.ok) return null;

        const data = await response.json();
        const songs = data.results?.songs?.data;
        if (songs?.length > 0) {
            const song = songs[0];
            return {
                id: song.id,
                name: song.attributes.name,
                artist: song.attributes.artistName,
                album: song.attributes.albumName || '',
                durationMs: song.attributes.durationInMillis,
                isrc: song.attributes.isrc,
            };
        }

        return null;
    }
}

export default AppleMusicProvider;

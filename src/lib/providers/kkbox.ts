import { MusicProvider, TokenData, Track, Playlist } from '../types';

const KKBOX_CLIENT_ID = process.env.KKBOX_CLIENT_ID!;
const KKBOX_CLIENT_SECRET = process.env.KKBOX_CLIENT_SECRET!;
const KKBOX_REDIRECT_URI = process.env.KKBOX_REDIRECT_URI!;
const KKBOX_TERRITORY = process.env.KKBOX_TERRITORY || 'TW'; // Default to Taiwan

class KKBoxProvider implements MusicProvider {
    name = 'KKBox';

    getAuthUrl(): string {
        const scopes = 'user_profile user_territory user_playlist user_playlist_write';
        return `https://account.kkbox.com/oauth2/authorize?response_type=code&client_id=${KKBOX_CLIENT_ID}&redirect_uri=${encodeURIComponent(KKBOX_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;
    }

    async handleCallback(code: string): Promise<TokenData> {
        const response = await fetch('https://account.kkbox.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${KKBOX_CLIENT_ID}:${KKBOX_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: KKBOX_REDIRECT_URI,
            }).toString(),
        });

        if (!response.ok) {
            throw new Error(`KKBox auth failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(Date.now() + data.expires_in * 1000),
        };
    }

    async getPlaylists(token: string): Promise<Playlist[]> {
        const playlists: Playlist[] = [];
        let nextUrl: string | null = `https://api.kkbox.com/v1.1/me/playlists?territory=${KKBOX_TERRITORY}&limit=50`;

        while (nextUrl) {
            const response = await fetch(nextUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`KKBox API error: ${response.status}`);
            }

            const data = await response.json();
            playlists.push(
                ...(data.data || []).map((item: any) => ({
                    id: item.id,
                    name: item.title || item.name,
                    description: item.description || '',
                    trackCount: item.track_count || 0,
                    tracks: [],
                    imageUrl: item.images?.[0]?.url,
                }))
            );

            nextUrl = data.paging?.next || null;
        }

        return playlists;
    }

    async getPlaylistTracks(token: string, playlistId: string): Promise<Track[]> {
        const tracks: Track[] = [];
        let nextUrl: string | null = `https://api.kkbox.com/v1.1/playlists/${playlistId}/tracks?territory=${KKBOX_TERRITORY}&limit=50`;

        while (nextUrl) {
            const response = await fetch(nextUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`KKBox API error: ${response.status}`);
            }

            const data = await response.json();
            tracks.push(
                ...(data.data || []).map((item: any) => ({
                    id: item.id,
                    name: item.title || item.name,
                    artist: item.artist?.name || '',
                    album: item.album?.name || '',
                    durationMs: item.duration * 1000, // KKBox returns seconds
                    isrc: item.isrc,
                }))
            );

            nextUrl = data.paging?.next || null;
        }

        return tracks;
    }

    async createPlaylist(token: string, name: string, description?: string): Promise<string> {
        const response = await fetch('https://api.kkbox.com/v1.1/me/playlists', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                title: name,
                description: description || '',
            }).toString(),
        });

        if (!response.ok) {
            throw new Error(`Failed to create playlist: ${response.status}`);
        }

        const data = await response.json();
        return data.id;
    }

    async addTracks(token: string, playlistId: string, tracks: Track[]): Promise<{ added: number; failed: number }> {
        let added = 0;
        let failed = 0;

        // First, resolve tracks to KKBox IDs
        const resolvedTracks: Track[] = [];
        for (const track of tracks) {
            const found = await this.searchTrack(token, track);
            if (found) {
                resolvedTracks.push(found);
            } else {
                failed++;
            }
        }

        // Add tracks in batches (KKBox supports multiple track IDs)
        if (resolvedTracks.length > 0) {
            const trackIds = resolvedTracks.map(t => t.id).join(',');
            const response = await fetch(`https://api.kkbox.com/v1.1/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    ids: trackIds,
                }).toString(),
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
        const query = `${track.name} ${track.artist}`.trim();
        const response = await fetch(
            `https://api.kkbox.com/v1.1/search?q=${encodeURIComponent(query)}&type=track&territory=${KKBOX_TERRITORY}&limit=1`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        const tracks = data.tracks?.data;
        
        if (tracks?.length > 0) {
            const result = tracks[0];
            return {
                id: result.id,
                name: result.title || result.name,
                artist: result.artist?.name || '',
                album: result.album?.name || '',
                durationMs: (result.duration || 0) * 1000,
                isrc: result.isrc,
            };
        }

        return null;
    }
}

export default KKBoxProvider;
import { MusicProvider, TokenData, Track, Playlist } from '../types';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

function parseDuration(duration: string): number {
    const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
    if (!match) return 0;
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const s = parseInt(match[3] || '0', 10);
    return ((h * 60 + m) * 60 + s) * 1000;
}

class YouTubeMusicProvider implements MusicProvider {
    name = 'YouTube Music';

    getAuthUrl(): string {
        const scopes = 'https://www.googleapis.com/auth/youtube';
        return `https://accounts.google.com/o/oauth2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline`;
    }

    async handleCallback(code: string): Promise<TokenData> {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
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
        let pageToken = '';

        do {
            const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            playlists.push(
                ...data.items.map((item: any) => ({
                    id: item.id,
                    name: item.snippet.title,
                    description: item.snippet.description,
                    trackCount: item.contentDetails.itemCount,
                    tracks: [],
                    imageUrl: item.snippet.thumbnails?.default?.url,
                }))
            );
            pageToken = data.nextPageToken || '';
        } while (pageToken);

        return playlists;
    }

    async getPlaylistTracks(token: string, playlistId: string): Promise<Track[]> {
        const tracks: Track[] = [];
        let pageToken = '';

        do {
            const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            // Get video IDs for duration lookup
            const videoIds = data.items
                .map((item: any) => item.snippet.resourceId.videoId)
                .join(',');

            // Fetch video details for duration
            const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}`;
            const videoRes = await fetch(videoUrl, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const videoData = await videoRes.json();

            const videoMap = new Map<string, any>();
            for (const v of videoData.items || []) {
                videoMap.set(v.id, v);
            }

            for (const item of data.items) {
                const videoId = item.snippet.resourceId.videoId;
                const video = videoMap.get(videoId);
                const title = item.snippet.title || '';

                // Try to parse "Artist - Track" format common on YouTube
                const parts = title.split(' - ');
                const artist = parts.length > 1 ? parts[0].trim() : '';
                const name = parts.length > 1 ? parts.slice(1).join(' - ').trim() : title;

                tracks.push({
                    id: videoId,
                    name,
                    artist,
                    album: '',
                    durationMs: video ? parseDuration(video.contentDetails.duration) : 0,
                });
            }

            pageToken = data.nextPageToken || '';
        } while (pageToken);

        return tracks;
    }

    async createPlaylist(token: string, name: string, description?: string): Promise<string> {
        const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                snippet: { title: name, description: description || '' },
                status: { privacyStatus: 'private' },
            }),
        });
        const data = await response.json();
        return data.id;
    }

    async addTracks(token: string, playlistId: string, tracks: Track[]): Promise<{ added: number; failed: number }> {
        let added = 0;
        let failed = 0;

        for (const track of tracks) {
            // Search for the track on YouTube first
            const found = await this.searchTrack(token, track);
            if (!found) {
                failed++;
                continue;
            }

            const response = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    snippet: {
                        playlistId,
                        resourceId: { videoId: found.id, kind: 'youtube#video' },
                    },
                }),
            });

            if (response.ok) {
                added++;
            } else {
                failed++;
            }
        }

        return { added, failed };
    }

    async searchTrack(token: string, track: Track): Promise<Track | null> {
        const q = track.artist ? `${track.artist} ${track.name}` : track.name;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoCategoryId=10&maxResults=1`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (data.items?.length > 0) {
            const item = data.items[0];
            return {
                id: item.id.videoId,
                name: track.name,
                artist: track.artist,
                album: '',
                durationMs: 0,
            };
        }

        return null;
    }
}

export default YouTubeMusicProvider;

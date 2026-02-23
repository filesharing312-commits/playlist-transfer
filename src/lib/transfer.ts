import { MusicProvider, Track, TransferResult } from './types';

export interface TransferProgress {
    phase: 'fetching' | 'reading' | 'creating' | 'matching' | 'transferring' | 'complete';
    current: number;
    total: number;
    message: string;
}

export async function transferPlaylist(
    sourceProvider: MusicProvider,
    targetProvider: MusicProvider,
    sourceToken: string,
    targetToken: string,
    playlistId: string,
    onProgress?: (progress: TransferProgress) => void
): Promise<TransferResult> {
    // Step 1: Fetch source playlist info
    onProgress?.({ phase: 'fetching', current: 0, total: 0, message: 'Fetching playlist details...' });
    const playlists = await sourceProvider.getPlaylists(sourceToken);
    const sourcePlaylist = playlists.find((p) => p.id === playlistId);
    if (!sourcePlaylist) throw new Error(`Playlist ${playlistId} not found`);

    // Step 2: Get all tracks
    onProgress?.({ phase: 'reading', current: 0, total: 0, message: `Reading tracks from "${sourcePlaylist.name}"...` });
    const sourceTracks = await sourceProvider.getPlaylistTracks(sourceToken, playlistId);
    sourcePlaylist.tracks = sourceTracks;
    sourcePlaylist.trackCount = sourceTracks.length;

    // Step 3: Create target playlist
    onProgress?.({ phase: 'creating', current: 0, total: sourceTracks.length, message: `Creating "${sourcePlaylist.name}" on ${targetProvider.name}...` });
    const targetPlaylistId = await targetProvider.createPlaylist(
        targetToken,
        sourcePlaylist.name,
        sourcePlaylist.description || `Transferred from ${sourceProvider.name}`
    );

    // Step 4: Match tracks on target platform
    const matched: Track[] = [];
    const unmatched: Track[] = [];

    for (let i = 0; i < sourceTracks.length; i++) {
        const track = sourceTracks[i];
        onProgress?.({
            phase: 'matching',
            current: i + 1,
            total: sourceTracks.length,
            message: `Matching: ${track.artist} - ${track.name}`,
        });

        const found = await targetProvider.searchTrack(targetToken, track);
        if (found) {
            matched.push(found);
        } else {
            unmatched.push(track);
        }
    }

    // Step 5: Add matched tracks to target playlist
    onProgress?.({ phase: 'transferring', current: 0, total: matched.length, message: `Adding ${matched.length} tracks...` });
    const result = await targetProvider.addTracks(targetToken, targetPlaylistId, matched);

    onProgress?.({
        phase: 'complete',
        current: matched.length,
        total: sourceTracks.length,
        message: `Done! ${result.added} added, ${unmatched.length} unmatched.`,
    });

    return {
        sourcePlaylist,
        targetPlaylistId,
        matched,
        unmatched,
        totalTracks: sourceTracks.length,
    };
}

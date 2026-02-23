'use client';

import { useState, useEffect } from 'react';

interface Provider {
    id: string;
    name: string;
}

interface Playlist {
    id: string;
    name: string;
    description?: string;
    trackCount: number;
    imageUrl?: string;
}

interface TransferProgress {
    phase: 'fetching' | 'reading' | 'creating' | 'matching' | 'transferring' | 'complete';
    current: number;
    total: number;
    message: string;
}

export default function TransferUI() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [sourceProvider, setSourceProvider] = useState<string>('');
    const [targetProvider, setTargetProvider] = useState<string>('');
    const [sourceToken, setSourceToken] = useState<string>('');
    const [targetToken, setTargetToken] = useState<string>('');
    const [sourcePlaylists, setSourcePlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
    const [progress, setProgress] = useState<TransferProgress | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Load providers on mount
    useEffect(() => {
        fetch('/api/providers')
            .then(res => res.json())
            .then(data => setProviders(data.providers))
            .catch(console.error);
    }, []);

    const handleAuth = async (provider: string) => {
        try {
            const response = await fetch(`/api/auth/${provider}`);
            const data = await response.json();
            
            if (data.authUrl) {
                // Open auth URL in new window
                const authWindow = window.open(data.authUrl, '_blank', 'width=500,height=600');
                
                // Listen for auth completion (you'd implement postMessage handling)
                const checkClosed = setInterval(() => {
                    if (authWindow?.closed) {
                        clearInterval(checkClosed);
                        // In a real app, you'd get the token from the auth callback
                        const token = prompt(`Enter the authorization code for ${provider}:`);
                        if (token) {
                            if (provider === sourceProvider) {
                                setSourceToken(token);
                                loadPlaylists(provider, token);
                            } else {
                                setTargetToken(token);
                            }
                        }
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Auth error:', error);
        }
    };

    const loadPlaylists = async (provider: string, token: string) => {
        try {
            const response = await fetch(`/api/playlists/${provider}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setSourcePlaylists(data.playlists || []);
        } catch (error) {
            console.error('Failed to load playlists:', error);
        }
    };

    const startTransfer = async () => {
        if (!selectedPlaylist || !sourceToken || !targetToken) return;

        setIsTransferring(true);
        setResult(null);
        
        try {
            const response = await fetch('/api/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceProvider,
                    targetProvider,
                    sourceToken,
                    targetToken,
                    playlistId: selectedPlaylist,
                }),
            });

            if (!response.ok) throw new Error('Transfer failed');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response stream');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.type === 'complete') {
                                setResult(data.result);
                                setProgress(null);
                            } else if (data.type === 'error') {
                                throw new Error(data.error);
                            } else {
                                setProgress(data);
                            }
                        } catch (parseError) {
                            console.error('Parse error:', parseError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Transfer error:', error);
            alert(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900">🎵 Playlist Transfer</h1>
                <p className="text-gray-600 mt-2">Transfer playlists between music platforms</p>
            </div>

            {/* Provider Selection */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Source Platform</h2>
                    <select 
                        value={sourceProvider} 
                        onChange={(e) => setSourceProvider(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                    >
                        <option value="">Select source platform</option>
                        {providers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    {sourceProvider && (
                        <button
                            onClick={() => handleAuth(sourceProvider)}
                            disabled={!!sourceToken}
                            className={`w-full p-3 rounded-lg ${
                                sourceToken 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {sourceToken ? '✅ Connected' : 'Connect to ' + providers.find(p => p.id === sourceProvider)?.name}
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Target Platform</h2>
                    <select 
                        value={targetProvider} 
                        onChange={(e) => setTargetProvider(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                    >
                        <option value="">Select target platform</option>
                        {providers.filter(p => p.id !== sourceProvider).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    {targetProvider && (
                        <button
                            onClick={() => handleAuth(targetProvider)}
                            disabled={!!targetToken}
                            className={`w-full p-3 rounded-lg ${
                                targetToken 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {targetToken ? '✅ Connected' : 'Connect to ' + providers.find(p => p.id === targetProvider)?.name}
                        </button>
                    )}
                </div>
            </div>

            {/* Playlist Selection */}
            {sourcePlaylists.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Select Playlist to Transfer</h2>
                    <div className="grid gap-3">
                        {sourcePlaylists.map(playlist => (
                            <div 
                                key={playlist.id}
                                onClick={() => setSelectedPlaylist(playlist.id)}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                    selectedPlaylist === playlist.id 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    {playlist.imageUrl && (
                                        <img 
                                            src={playlist.imageUrl} 
                                            alt={playlist.name}
                                            className="w-12 h-12 rounded object-cover"
                                        />
                                    )}
                                    <div>
                                        <h3 className="font-medium">{playlist.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {playlist.trackCount} tracks
                                            {playlist.description && ` • ${playlist.description}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Transfer Button */}
            {selectedPlaylist && sourceToken && targetToken && (
                <div className="text-center">
                    <button
                        onClick={startTransfer}
                        disabled={isTransferring}
                        className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                        {isTransferring ? 'Transferring...' : 'Start Transfer'}
                    </button>
                </div>
            )}

            {/* Progress */}
            {progress && (
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="capitalize">{progress.phase}</span>
                        <span>{progress.current}/{progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-600">{progress.message}</p>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-green-800 mb-3">Transfer Complete!</h2>
                    <div className="space-y-2 text-green-700">
                        <p>✅ Successfully transferred: {result.matched.length} tracks</p>
                        <p>❌ Failed to match: {result.unmatched.length} tracks</p>
                        <p>📊 Total tracks: {result.totalTracks}</p>
                        {result.unmatched.length > 0 && (
                            <details className="mt-4">
                                <summary className="cursor-pointer font-medium">View unmatched tracks</summary>
                                <ul className="mt-2 space-y-1 text-sm">
                                    {result.unmatched.slice(0, 10).map((track: any, i: number) => (
                                        <li key={i}>{track.artist} - {track.name}</li>
                                    ))}
                                    {result.unmatched.length > 10 && (
                                        <li>... and {result.unmatched.length - 10} more</li>
                                    )}
                                </ul>
                            </details>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
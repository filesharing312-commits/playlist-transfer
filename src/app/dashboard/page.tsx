'use client';

interface TaskStatus {
    id: number;
    task: string;
    status: 'done' | 'in-progress' | 'queued';
    owner: string;
    notes: string;
}

const tasks: TaskStatus[] = [
    { id: 1, task: 'Type Definitions', status: 'done', owner: 'Ollama', notes: 'Clean output, no fixes needed' },
    { id: 2, task: 'Spotify Provider', status: 'done', owner: 'Ollama + Pip', notes: 'Fixed env imports, TokenData alignment, user ID fetch, track mapping' },
    { id: 3, task: 'YouTube Music Provider', status: 'done', owner: 'Ollama + Pip', notes: 'Fixed fetch params, duration parsing, pagination, artist extraction' },
    { id: 4, task: 'Apple Music Provider', status: 'done', owner: 'Ollama + Pip', notes: 'Fixed JWT generation, search API, MusicKit auth flow' },
    { id: 5, task: 'Provider Registry', status: 'done', owner: 'Ollama + Pip', notes: 'Added class instantiation' },
    { id: 6, task: 'Transfer Engine', status: 'done', owner: 'Ollama + Pip', notes: 'Fixed method names, progress reporting, error handling' },
    { id: 7, task: 'API Routes', status: 'done', owner: 'Pip', notes: 'Auth, playlists, transfer endpoints with SSE' },
    { id: 8, task: 'Frontend UI', status: 'done', owner: 'Pip', notes: 'Complete transfer interface with progress tracking' },
    { id: 9, task: 'Environment Config', status: 'done', owner: 'Pip', notes: '.env template created' },
    { id: 10, task: 'Deployment', status: 'done', owner: 'Pip', notes: 'GitHub repo + Vercel config ready' },
];

const statusEmoji = {
    'done': '✅',
    'in-progress': '🔄',
    'queued': '⏳',
};

const statusColor = {
    'done': 'bg-green-900/30 border-green-500/30',
    'in-progress': 'bg-blue-900/30 border-blue-500/30 animate-pulse',
    'queued': 'bg-gray-900/30 border-gray-500/30',
};

export default function Dashboard() {
    const completed = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const progress = Math.round((completed / total) * 100);

    return (
        <main className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">🎵 Playlist Transfer - Complete!</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-gray-400">Build Dashboard</p>
                        <a 
                            href="/"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                            Use the App →
                        </a>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Overall Progress</span>
                        <span className="text-green-400 font-mono">{completed}/{total} tasks ({progress}%)</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                        <div className="text-2xl font-bold text-green-400">{completed}</div>
                        <div className="text-sm text-gray-500">Completed</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                        <div className="text-2xl font-bold text-blue-400">0</div>
                        <div className="text-sm text-gray-500">In Progress</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                        <div className="text-2xl font-bold text-gray-400">0</div>
                        <div className="text-sm text-gray-500">Queued</div>
                    </div>
                </div>

                {/* Links */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-8">
                    <h2 className="text-lg font-semibold mb-4">🔗 Project Links</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-300">GitHub Repository</span>
                            <a 
                                href="https://github.com/filesharing312-commits/playlist-transfer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                                View Source →
                            </a>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-300">Deploy to Vercel</span>
                            <a 
                                href="https://vercel.com/new/git/external?repository-url=https://github.com/filesharing312-commits/playlist-transfer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                                Deploy Now →
                            </a>
                        </div>
                    </div>
                </div>

                {/* Architecture */}
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-8">
                    <h2 className="text-lg font-semibold mb-3">🏗️ Architecture</h2>
                    <div className="font-mono text-sm text-gray-400 space-y-1">
                        <p>src/lib/types/index.ts        → Track, Playlist, MusicProvider, TokenData, TransferResult</p>
                        <p>src/lib/providers/spotify.ts  → Spotify Web API (OAuth + REST)</p>
                        <p>src/lib/providers/youtube.ts  → YouTube Data API v3 (Google OAuth)</p>
                        <p>src/lib/providers/apple-music.ts → Apple Music API (MusicKit + JWT)</p>
                        <p>src/lib/providers/index.ts    → Provider registry</p>
                        <p>src/lib/transfer.ts           → Transfer engine with progress callbacks</p>
                        <p>src/app/api/auth/             → OAuth endpoints for all providers</p>
                        <p>src/app/api/playlists/        → Playlist fetching endpoints</p>
                        <p>src/app/api/transfer/         → Transfer endpoint with SSE progress</p>
                        <p>src/components/transfer-ui.tsx → Complete transfer interface</p>
                    </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold mb-3">📋 Task Breakdown</h2>
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`rounded-lg p-4 border ${statusColor[task.status]}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{statusEmoji[task.status]}</span>
                                    <span className="font-medium">{task.task}</span>
                                </div>
                                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                    {task.owner}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 ml-9">{task.notes}</p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-600">
                    <p>Built by Pip 🐧 (Claude Opus 4) × Ollama (qwen2.5:14b) × Danny</p>
                    <p className="mt-1">1,450+ lines of TypeScript • 10/10 tasks complete</p>
                </div>
            </div>
        </main>
    );
}
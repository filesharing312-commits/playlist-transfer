'use client';

import { useState, useEffect } from 'react';

interface Project {
    id: string;
    name: string;
    status: 'active' | 'paused' | 'completed' | 'error';
    progress: number;
    lastUpdated: string;
    description?: string;
    repository?: string;
}

interface Commit {
    id: string;
    message: string;
    author: string;
    timestamp: string;
    project: string;
    hash: string;
}

interface Task {
    id: string;
    title: string;
    status: 'backlog' | 'in-progress' | 'review' | 'done';
    project: string;
    assignee?: string;
    priority: 'low' | 'medium' | 'high';
}

interface SystemStatus {
    apiHealth: boolean;
    serviceHealth: boolean;
    buildStatus: boolean;
    lastCheck: string;
}

const ProjectDashboard = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [commits, setCommits] = useState<Commit[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [systemStatus, setSystemStatus] = useState<SystemStatus>({
        apiHealth: true,
        serviceHealth: true,
        buildStatus: true,
        lastCheck: new Date().toISOString(),
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mock data for now - replace with real API calls
    useEffect(() => {
        const mockProjects: Project[] = [
            {
                id: '1',
                name: 'Playlist Transfer',
                status: 'completed',
                progress: 100,
                lastUpdated: new Date().toISOString(),
                description: 'Transfer playlists between music platforms',
                repository: 'https://github.com/filesharing312-commits/playlist-transfer',
            },
            {
                id: '2',
                name: 'Job Application AI',
                status: 'active',
                progress: 15,
                lastUpdated: new Date().toISOString(),
                description: 'AI-powered job application automation',
            },
            {
                id: '3',
                name: 'Quantrading Platform',
                status: 'paused',
                progress: 5,
                lastUpdated: new Date(Date.now() - 86400000).toISOString(),
                description: 'Algorithmic trading platform',
            },
        ];

        const mockCommits: Commit[] = [
            {
                id: '1',
                message: '🎉 Complete MVP - Frontend UI and Dashboard',
                author: 'Pip',
                timestamp: new Date().toISOString(),
                project: 'Playlist Transfer',
                hash: '7393fd5',
            },
            {
                id: '2',
                message: '🔧 Add API routes and Vercel config',
                author: 'Pip',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                project: 'Playlist Transfer',
                hash: 'a53c129',
            },
            {
                id: '3',
                message: '🎵 Initial commit - Playlist Transfer MVP',
                author: 'Pip',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                project: 'Playlist Transfer',
                hash: 'ff81cd7',
            },
        ];

        const mockTasks: Task[] = [
            {
                id: '1',
                title: 'Set up browser automation for job applications',
                status: 'backlog',
                project: 'Job Application AI',
                priority: 'high',
            },
            {
                id: '2',
                title: 'Research KKBox API integration',
                status: 'done',
                project: 'Playlist Transfer',
                priority: 'medium',
            },
            {
                id: '3',
                title: 'Deploy to Vercel',
                status: 'in-progress',
                project: 'Playlist Transfer',
                priority: 'high',
            },
            {
                id: '4',
                title: 'Market research for trading algorithms',
                status: 'review',
                project: 'Quantrading Platform',
                priority: 'low',
            },
        ];

        setProjects(mockProjects);
        setCommits(mockCommits);
        setTasks(mockTasks);
        setLoading(false);
    }, []);

    // Real-time updates via SSE (mock)
    useEffect(() => {
        const eventSource = new EventSource('/api/dashboard/updates');
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'project_update') {
                    setProjects(prev => prev.map(p => 
                        p.id === data.project.id ? { ...p, ...data.project } : p
                    ));
                } else if (data.type === 'new_commit') {
                    setCommits(prev => [data.commit, ...prev.slice(0, 9)]);
                } else if (data.type === 'system_status') {
                    setSystemStatus(data.status);
                }
            } catch (error) {
                console.error('Error parsing SSE data:', error);
            }
        };

        eventSource.onerror = () => {
            console.warn('SSE connection error, will retry...');
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            case 'paused': return 'bg-yellow-100 text-yellow-800';
            case 'error': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatTimeAgo = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const quickActions = [
        { name: 'Deploy', color: 'bg-blue-500 hover:bg-blue-600', action: () => alert('Deploy triggered') },
        { name: 'Test', color: 'bg-green-500 hover:bg-green-600', action: () => alert('Tests running') },
        { name: 'Commit', color: 'bg-purple-500 hover:bg-purple-600', action: () => alert('Commit dialog') },
        { name: 'Pull', color: 'bg-orange-500 hover:bg-orange-600', action: () => alert('Git pull started') },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Error: {error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">🚀 Project Dashboard</h1>
                    <p className="text-gray-600 mt-2">Monitor and manage all your coding projects</p>
                </div>

                {/* Project Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {projects.map((project) => (
                        <div key={project.id} className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                    {project.status}
                                </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Progress</span>
                                    <span>{project.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${project.progress}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    Updated {formatTimeAgo(project.lastUpdated)}
                                </span>
                                {project.repository && (
                                    <a 
                                        href={project.repository}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600 text-xs"
                                    >
                                        View Repo →
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Recent Commits Timeline */}
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">📝 Recent Commits</h2>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="space-y-4">
                                {commits.map((commit) => (
                                    <div key={commit.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-b-0">
                                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{commit.message}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-xs text-gray-500">by {commit.author}</span>
                                                <span className="text-xs text-gray-500">•</span>
                                                <span className="text-xs text-gray-500">{formatTimeAgo(commit.timestamp)}</span>
                                                <span className="text-xs text-gray-500">•</span>
                                                <code className="text-xs bg-gray-100 px-1 rounded">{commit.hash}</code>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* System Status & Quick Actions */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">⚡ Quick Actions</h2>
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {quickActions.map((action) => (
                                        <button
                                            key={action.name}
                                            onClick={action.action}
                                            className={`px-4 py-2 text-white rounded text-sm font-medium transition-colors ${action.color}`}
                                        >
                                            {action.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* System Status */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 System Status</h2>
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">API Health</span>
                                        <div className={`w-3 h-3 rounded-full ${systemStatus.apiHealth ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Services</span>
                                        <div className={`w-3 h-3 rounded-full ${systemStatus.serviceHealth ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Build Status</span>
                                        <div className={`w-3 h-3 rounded-full ${systemStatus.buildStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                        <span className="text-xs text-gray-500">
                                            Last check: {formatTimeAgo(systemStatus.lastCheck)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Tasks Board */}
                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Active Tasks</h2>
                    <div className="grid md:grid-cols-4 gap-4">
                        {['backlog', 'in-progress', 'review', 'done'].map((status) => (
                            <div key={status} className="bg-white rounded-lg shadow-md p-4">
                                <h3 className="font-medium text-gray-900 mb-3 capitalize">
                                    {status.replace('-', ' ')} ({tasks.filter(t => t.status === status).length})
                                </h3>
                                <div className="space-y-3">
                                    {tasks
                                        .filter(task => task.status === status)
                                        .map((task) => (
                                            <div key={task.id} className="p-3 border border-gray-200 rounded-lg">
                                                <p className="text-sm font-medium text-gray-900 mb-2">{task.title}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">{task.project}</span>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDashboard;
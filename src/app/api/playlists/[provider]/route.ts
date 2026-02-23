import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';

export async function GET(
    request: NextRequest,
    { params }: { params: { provider: string } }
) {
    try {
        const provider = getProvider(params.provider);
        if (!provider) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Bearer token required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const playlists = await provider.getPlaylists(token);
        return NextResponse.json({ playlists });
    } catch (error) {
        console.error(`Playlists error for ${params.provider}:`, error);
        return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
    }
}
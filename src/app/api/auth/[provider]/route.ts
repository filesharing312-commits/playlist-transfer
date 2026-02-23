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

        const authUrl = provider.getAuthUrl();
        return NextResponse.json({ authUrl });
    } catch (error) {
        console.error(`Auth error for ${params.provider}:`, error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { provider: string } }
) {
    try {
        const { code } = await request.json();
        if (!code) {
            return NextResponse.json({ error: 'Authorization code required' }, { status: 400 });
        }

        const provider = getProvider(params.provider);
        if (!provider) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        const tokenData = await provider.handleCallback(code);
        return NextResponse.json(tokenData);
    } catch (error) {
        console.error(`Callback error for ${params.provider}:`, error);
        return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 });
    }
}
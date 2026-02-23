import { NextResponse } from 'next/server';
import { getProviderList } from '@/lib/providers';

export async function GET() {
    try {
        const providers = getProviderList();
        return NextResponse.json({ providers });
    } catch (error) {
        console.error('Providers error:', error);
        return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
    }
}
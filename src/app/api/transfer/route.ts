import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';
import { transferPlaylist } from '@/lib/transfer';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            sourceProvider: sourceProviderName,
            targetProvider: targetProviderName,
            sourceToken,
            targetToken,
            playlistId,
        } = body;

        // Validate required fields
        if (!sourceProviderName || !targetProviderName || !sourceToken || !targetToken || !playlistId) {
            return NextResponse.json(
                { error: 'Missing required fields: sourceProvider, targetProvider, sourceToken, targetToken, playlistId' },
                { status: 400 }
            );
        }

        // Get providers
        const sourceProvider = getProvider(sourceProviderName);
        const targetProvider = getProvider(targetProviderName);

        if (!sourceProvider || !targetProvider) {
            return NextResponse.json({ error: 'Invalid provider specified' }, { status: 400 });
        }

        // Set up Server-Sent Events for progress updates
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const result = await transferPlaylist(
                        sourceProvider,
                        targetProvider,
                        sourceToken,
                        targetToken,
                        playlistId,
                        (progress) => {
                            const data = `data: ${JSON.stringify(progress)}\n\n`;
                            controller.enqueue(encoder.encode(data));
                        }
                    );

                    // Send final result
                    const finalData = `data: ${JSON.stringify({ 
                        type: 'complete', 
                        result 
                    })}\n\n`;
                    controller.enqueue(encoder.encode(finalData));
                    controller.close();
                } catch (error) {
                    const errorData = `data: ${JSON.stringify({ 
                        type: 'error', 
                        error: error instanceof Error ? error.message : 'Transfer failed' 
                    })}\n\n`;
                    controller.enqueue(encoder.encode(errorData));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Transfer error:', error);
        return NextResponse.json(
            { error: 'Transfer failed' },
            { status: 500 }
        );
    }
}
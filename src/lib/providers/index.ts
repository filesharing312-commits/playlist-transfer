import SpotifyProvider from './spotify';
import YouTubeMusicProvider from './youtube';
import AppleMusicProvider from './apple-music';
import KKBoxProvider from './kkbox';
import { MusicProvider } from '../types';

const providers: Map<string, MusicProvider> = new Map([
    ['spotify', new SpotifyProvider()],
    ['youtube-music', new YouTubeMusicProvider()],
    ['apple-music', new AppleMusicProvider()],
    ['kkbox', new KKBoxProvider()],
]);

export function getProvider(name: string): MusicProvider | undefined {
    return providers.get(name);
}

export function getProviderList(): Array<{ id: string; name: string }> {
    return Array.from(providers.entries()).map(([id, provider]) => ({
        id,
        name: provider.name,
    }));
}

export { providers };

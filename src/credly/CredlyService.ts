import * as https from 'https';

export interface CredlyBadge {
    id: string;
    name: string;
    imageUrl: string;
    issuerName: string;
    earnedAt: string;
    badgeUrl: string;
}

export const CredlyService = {
    async fetchBadges(username: string): Promise<CredlyBadge[]> {
        const url = `https://api.credly.com/v1/obi/v2/profile/${encodeURIComponent(username)}/assertions`;
        try {
            const raw = await httpsGet(url);
            const parsed = JSON.parse(raw) as { data?: unknown[] };
            return (parsed.data ?? []).map(parseBadge).filter((b): b is CredlyBadge => b !== null);
        } catch {
            return [];
        }
    },

    getProfileUrl: (username: string): string =>
        `https://www.credly.com/users/${encodeURIComponent(username)}/badges`
};

function parseBadge(item: unknown): CredlyBadge | null {
    if (typeof item !== 'object' || item === null) { return null; }
    const obj = item as Record<string, unknown>;
    const badgeClass = (obj['badge_class'] ?? {}) as Record<string, unknown>;
    const issuer = (obj['issuer'] ?? {}) as Record<string, unknown>;
    const imageObj = (badgeClass['image'] ?? {}) as Record<string, unknown>;

    return {
        id: String(obj['id'] ?? ''),
        name: String(badgeClass['name'] ?? 'Unknown Badge'),
        imageUrl: String(imageObj['id'] ?? ''),
        issuerName: String(issuer['name'] ?? ''),
        earnedAt: String(obj['issued_at'] ?? ''),
        badgeUrl: String(obj['badge_url'] ?? '')
    };
}

function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', (chunk: string) => { data += chunk; });
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

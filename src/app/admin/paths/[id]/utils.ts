export const parseYouTubeId = (url: string): string | null => {
    try {
        const short = /youtu\.be\/([^?]+)/;
        const long = /v=([^&]+)/;
        const embed = /youtube\.com\/embed\/([^?]+)/;

        if (short.test(url)) return url.match(short)?.[1] || null;
        if (long.test(url)) return url.match(long)?.[1] || null;
        if (embed.test(url)) return url.match(embed)?.[1] || null;

        return null;
    } catch {
        return null;
    }
};

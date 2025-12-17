/**
 * YouTube Integration Service
 * Handles YouTube Data API v3 integration and video processing
 */

export interface VideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelName: string;
  channelId: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  isEmbeddable: boolean;
  hasCaptions: boolean;
  availableLanguages: string[];
}

export interface VideoSearchResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelName: string;
  publishedAt: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;

  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If it's already just an ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT1H2M10S -> 3730 seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get video details from YouTube Data API v3
 */
export async function getVideoDetails(videoId: string): Promise<VideoData | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    const statistics = video.statistics;
    const status = video.status;

    return {
      videoId,
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      channelName: snippet.channelTitle,
      channelId: snippet.channelId,
      durationSeconds: parseDuration(contentDetails.duration),
      viewCount: parseInt(statistics.viewCount || '0', 10),
      likeCount: parseInt(statistics.likeCount || '0', 10),
      publishedAt: snippet.publishedAt,
      isEmbeddable: status.embeddable === true,
      hasCaptions: contentDetails.caption !== 'false',
      availableLanguages: [], // Will be populated by getCaptionsLanguages if needed
    };
  } catch (error) {
    console.error('Error fetching video details:', error);
    throw error;
  }
}

/**
 * Check if video is embeddable
 */
export async function isEmbeddable(videoId: string): Promise<boolean> {
  try {
    const videoData = await getVideoDetails(videoId);
    return videoData?.isEmbeddable || false;
  } catch (error) {
    console.error('Error checking embeddable status:', error);
    return false;
  }
}

/**
 * Search for videos by query
 */
export async function searchVideos(
  query: string,
  maxResults: number = 10
): Promise<VideoSearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodedQuery}&maxResults=${maxResults}&key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    if (!data.items) {
      return [];
    }

    return data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      channelName: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
}

/**
 * Get video transcript/captions
 * Note: This requires the youtube-transcript package
 * Install with: npm install youtube-transcript
 * 
 * IMPORTANT: This function should ONLY be called from client-side code
 * as it may spawn child processes that don't work in server environments.
 */
export async function getTranscript(
  videoId: string,
  language: string = 'en'
): Promise<string | null> {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('getTranscript can only be called from client-side code');
    return null;
  }

  try {
    // Dynamic import to avoid SSR issues
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: language,
    });

    if (!transcript || transcript.length === 0) {
      return null;
    }

    // Combine all transcript segments into a single text
    return transcript
      .map((item: any) => item.text)
      .join(' ');
  } catch (error: any) {
    // Handle spawn errors gracefully
    if (error?.message?.includes('spawn') || error?.code === 'UNKNOWN') {
      console.warn('Transcript fetching requires a browser environment:', error.message);
      return null;
    }
    console.error('Error fetching transcript:', error);
    // Return null if transcript is not available
    return null;
  }
}

/**
 * Get available caption languages for a video
 */
export async function getCaptionsLanguages(videoId: string): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      // Captions might not be available, return empty array
      return [];
    }

    const data = await response.json();

    if (!data.items) {
      return [];
    }

    return data.items.map((item: any) => item.snippet.language);
  } catch (error) {
    console.error('Error fetching caption languages:', error);
    return [];
  }
}

/**
 * Rate limiting helper - cache API responses
 */
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedVideoDetails(videoId: string): Promise<VideoData | null> {
  const cacheKey = `video_${videoId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const data = await getVideoDetails(videoId);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

/**
 * Clear cache (useful for testing or forced refresh)
 */
export function clearCache(): void {
  cache.clear();
}

export interface PlaylistData {
  playlistId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelName: string;
  channelId: string;
  publishedAt: string;
  itemCount: number;
}

export interface PlaylistItem {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  position: number;
  publishedAt: string;
}

/**
 * Extract YouTube playlist ID from various URL formats
 */
export function extractPlaylistId(url: string): string | null {
  if (!url) return null;

  // Handle different YouTube playlist URL formats
  const patterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/, // Standard: ?list=PLxxx or &list=PLxxx
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/, // Direct playlist URL
    /youtube\.com\/watch\?.*list=([a-zA-Z0-9_-]+)/, // Video in playlist
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If it's already just a playlist ID (starts with PL, FL, RD, etc.)
  if (/^[A-Za-z0-9_-]{13,}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Get playlist details from YouTube Data API v3
 */
export async function getPlaylistDetails(playlistId: string): Promise<PlaylistData | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const playlist = data.items[0];
    const snippet = playlist.snippet;
    const contentDetails = playlist.contentDetails;

    return {
      playlistId,
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      channelName: snippet.channelTitle,
      channelId: snippet.channelId,
      publishedAt: snippet.publishedAt,
      itemCount: parseInt(contentDetails.itemCount || '0', 10),
    };
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    throw error;
  }
}

/**
 * Get all videos in a YouTube playlist
 */
export async function getPlaylistItems(playlistId: string, maxResults: number = 50): Promise<PlaylistItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  try {
    const items: PlaylistItem[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${Math.min(maxResults, 50)}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();

      if (data.items) {
        for (const item of data.items) {
          if (item.snippet.resourceId.kind === 'youtube#video') {
            items.push({
              videoId: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
              position: item.snippet.position,
              publishedAt: item.snippet.publishedAt,
            });
          }
        }
      }

      nextPageToken = data.nextPageToken;
      
      // Limit total results
      if (items.length >= maxResults) {
        break;
      }
    } while (nextPageToken && items.length < maxResults);

    return items;
  } catch (error) {
    console.error('Error fetching playlist items:', error);
    throw error;
  }
}


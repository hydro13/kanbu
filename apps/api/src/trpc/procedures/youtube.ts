/**
 * YouTube Metadata Procedures
 *
 * Fetches video metadata from YouTube Data API v3.
 * Used by the editor to display video info alongside embeds.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../router';

// =============================================================================
// Types
// =============================================================================

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnails: {
    default?: string;
    medium?: string;
    high?: string;
    maxres?: string;
  };
  duration: string;
  viewCount: string;
  likeCount: string;
  tags: string[];
}

interface YouTubeApiResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      channelTitle: string;
      channelId: string;
      publishedAt: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
        maxres?: { url: string };
      };
      tags?: string[];
    };
    contentDetails: {
      duration: string;
    };
    statistics: {
      viewCount: string;
      likeCount: string;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    // Standard watch URL
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([^&\s]+)/,
    // Short URL
    /youtu\.be\/([^?\s]+)/,
    // Embed URL
    /youtube\.com\/embed\/([^?\s]+)/,
    // Mobile URL
    /youtube\.com\/v\/([^?\s]+)/,
    // Shorts URL
    /youtube\.com\/shorts\/([^?\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Maybe it's already just a video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Parse ISO 8601 duration to human readable format
 * PT1H23M45S -> 1:23:45
 */
function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format view/like count to human readable format
 */
function formatCount(count: string): string {
  const num = parseInt(count);
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return count;
}

// =============================================================================
// Router
// =============================================================================

export const youtubeRouter = router({
  /**
   * Get metadata for a YouTube video
   * Public endpoint - no auth required as it's used by the editor
   */
  getMetadata: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
      })
    )
    .query(async ({ input }): Promise<YouTubeMetadata | null> => {
      const apiKey = process.env.YOUTUBE_API_KEY;

      if (!apiKey) {
        console.warn('YouTube API key not configured');
        return null;
      }

      const videoId = extractVideoId(input.url);
      if (!videoId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid YouTube URL',
        });
      }

      try {
        const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        apiUrl.searchParams.set('id', videoId);
        apiUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
        apiUrl.searchParams.set('key', apiKey);

        const response = await fetch(apiUrl.toString());
        const data = (await response.json()) as YouTubeApiResponse;

        if (data.error) {
          console.error('YouTube API error:', data.error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `YouTube API error: ${data.error.message}`,
          });
        }

        if (!data.items || data.items.length === 0) {
          return null;
        }

        const video = data.items[0];
        if (!video) {
          return null;
        }

        return {
          videoId,
          title: video.snippet.title,
          description: video.snippet.description,
          channelTitle: video.snippet.channelTitle,
          channelId: video.snippet.channelId,
          publishedAt: video.snippet.publishedAt,
          thumbnails: {
            default: video.snippet.thumbnails.default?.url,
            medium: video.snippet.thumbnails.medium?.url,
            high: video.snippet.thumbnails.high?.url,
            maxres: video.snippet.thumbnails.maxres?.url,
          },
          duration: formatDuration(video.contentDetails.duration),
          viewCount: formatCount(video.statistics.viewCount),
          likeCount: formatCount(video.statistics.likeCount),
          tags: video.snippet.tags || [],
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error('Failed to fetch YouTube metadata:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch YouTube metadata',
        });
      }
    }),

  /**
   * Batch get metadata for multiple videos
   * Useful for when restoring editor content with multiple embeds
   */
  getBatchMetadata: publicProcedure
    .input(
      z.object({
        urls: z.array(z.string()).max(50),
      })
    )
    .query(async ({ input }): Promise<Record<string, YouTubeMetadata | null>> => {
      const apiKey = process.env.YOUTUBE_API_KEY;
      const result: Record<string, YouTubeMetadata | null> = {};

      if (!apiKey) {
        console.warn('YouTube API key not configured');
        input.urls.forEach((url) => {
          result[url] = null;
        });
        return result;
      }

      // Extract all video IDs
      const urlToIdMap = new Map<string, string>();
      const videoIds: string[] = [];

      for (const url of input.urls) {
        const videoId = extractVideoId(url);
        if (videoId) {
          urlToIdMap.set(url, videoId);
          if (!videoIds.includes(videoId)) {
            videoIds.push(videoId);
          }
        } else {
          result[url] = null;
        }
      }

      if (videoIds.length === 0) {
        return result;
      }

      try {
        const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        apiUrl.searchParams.set('id', videoIds.join(','));
        apiUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
        apiUrl.searchParams.set('key', apiKey);

        const response = await fetch(apiUrl.toString());
        const data = (await response.json()) as YouTubeApiResponse;

        if (data.error) {
          console.error('YouTube API error:', data.error);
          input.urls.forEach((url) => {
            result[url] = null;
          });
          return result;
        }

        // Build a map of videoId to metadata
        const metadataMap = new Map<string, YouTubeMetadata>();
        if (data.items) {
          for (const video of data.items) {
            metadataMap.set(video.id, {
              videoId: video.id,
              title: video.snippet.title,
              description: video.snippet.description,
              channelTitle: video.snippet.channelTitle,
              channelId: video.snippet.channelId,
              publishedAt: video.snippet.publishedAt,
              thumbnails: {
                default: video.snippet.thumbnails.default?.url,
                medium: video.snippet.thumbnails.medium?.url,
                high: video.snippet.thumbnails.high?.url,
                maxres: video.snippet.thumbnails.maxres?.url,
              },
              duration: formatDuration(video.contentDetails.duration),
              viewCount: formatCount(video.statistics.viewCount),
              likeCount: formatCount(video.statistics.likeCount),
              tags: video.snippet.tags || [],
            });
          }
        }

        // Map back to original URLs
        for (const url of input.urls) {
          const videoId = urlToIdMap.get(url);
          if (videoId) {
            result[url] = metadataMap.get(videoId) || null;
          }
        }

        return result;
      } catch (error) {
        console.error('Failed to fetch YouTube metadata batch:', error);
        input.urls.forEach((url) => {
          result[url] = null;
        });
        return result;
      }
    }),
});

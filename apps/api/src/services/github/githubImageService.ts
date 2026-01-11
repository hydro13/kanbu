/*
 * GitHub Image Service
 * Version: 1.0.0
 *
 * Downloads and stores images from GitHub issue bodies during sync.
 * Handles authentication for private repository images using GitHub App tokens.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-10
 * =============================================================================
 */

import { getStorageProvider } from '../../lib/storage'
import { getInstallationOctokit } from './githubService'
import * as crypto from 'crypto'

// =============================================================================
// Types
// =============================================================================

interface ImageDownloadResult {
  originalUrl: string
  localUrl: string
  success: boolean
  error?: string
}

interface ProcessedContent {
  content: string
  imagesDownloaded: number
  imagesFailed: number
  results: ImageDownloadResult[]
}

// =============================================================================
// GitHub Image URL Detection
// =============================================================================

/**
 * Domains that host GitHub images
 */
const GITHUB_IMAGE_DOMAINS = [
  'user-images.githubusercontent.com',
  'raw.githubusercontent.com',
  'avatars.githubusercontent.com',
  'camo.githubusercontent.com',
  'private-user-images.githubusercontent.com',
  'github.com', // For user-attachments/assets URLs
]

/**
 * Regex to find markdown images: ![alt](url)
 */
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g

/**
 * Regex to find HTML img tags: <img ... src="url" ... />
 */
const HTML_IMG_REGEX = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*\/?>/gi

/**
 * Check if a URL is a GitHub image URL that we should download
 */
function isGitHubImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return GITHUB_IMAGE_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    )
  } catch {
    return false
  }
}

/**
 * Extract all image URLs from content (both markdown and HTML)
 */
function extractImageUrls(content: string): Array<{ alt: string; url: string; isHtml: boolean }> {
  const images: Array<{ alt: string; url: string; isHtml: boolean }> = []
  let match: RegExpExecArray | null

  // Extract markdown images: ![alt](url)
  MARKDOWN_IMAGE_REGEX.lastIndex = 0
  while ((match = MARKDOWN_IMAGE_REGEX.exec(content)) !== null) {
    const alt = match[1] ?? ''
    const url = match[2]
    if (url) {
      images.push({ alt, url, isHtml: false })
    }
  }

  // Extract HTML img tags: <img src="url" alt="alt" />
  HTML_IMG_REGEX.lastIndex = 0
  while ((match = HTML_IMG_REGEX.exec(content)) !== null) {
    const url = match[1]
    const alt = match[2] ?? ''
    if (url) {
      images.push({ alt, url, isHtml: true })
    }
  }

  return images
}

// =============================================================================
// Image Download & Storage
// =============================================================================

/**
 * Generate a unique filename for a downloaded image
 */
function generateImageFilename(originalUrl: string): string {
  // Try to get extension from URL
  let extension = '.png' // Default
  try {
    const url = new URL(originalUrl)
    const pathname = url.pathname
    const extMatch = pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?|$)/i)
    if (extMatch?.[1]) {
      extension = '.' + extMatch[1].toLowerCase()
    }
  } catch {
    // Use default extension
  }

  // Create unique name using hash of URL + timestamp
  const hash = crypto.createHash('md5').update(originalUrl).digest('hex').substring(0, 12)
  const timestamp = Date.now()
  return `github-${hash}-${timestamp}${extension}`
}

/**
 * Download an image from GitHub
 * Handles:
 * - JWT URLs from private-user-images.githubusercontent.com (no auth needed)
 * - Raw URLs from raw.githubusercontent.com (uses installation token)
 * - Other githubusercontent.com URLs (uses installation token)
 */
async function downloadGitHubImage(
  url: string,
  installationId: bigint
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    // JWT URLs from private-user-images.githubusercontent.com have auth in query string
    const isJwtUrl = url.includes('private-user-images.githubusercontent.com') && url.includes('jwt=')

    if (isJwtUrl) {
      // JWT URLs can be downloaded directly without additional auth
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          Accept: 'image/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer())
        const mimeType = response.headers.get('content-type') || 'image/png'
        return { buffer, mimeType }
      }
      console.warn('[GitHubImageService] JWT URL download failed:', response.status)
      return null
    }

    // user-attachments URLs without JWT - these require browser cookies
    const isUserAttachment = url.includes('user-attachments/assets')
    if (isUserAttachment) {
      // Cannot download without JWT or browser session
      return null
    }

    // Get the installation token for other GitHub URLs
    const octokit = await getInstallationOctokit(installationId)
    const auth = (await octokit.auth({ type: 'installation' })) as { token: string }

    if (!auth?.token) {
      console.warn('[GitHubImageService] Could not get installation token')
      return null
    }

    // Fetch the image with authentication
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: 'image/*',
        'User-Agent': 'Kanbu-Image-Sync/1.0',
        Authorization: `Bearer ${auth.token}`,
      },
    })

    if (!response.ok) {
      console.error(
        `[GitHubImageService] Failed to download image: ${response.status} ${response.statusText}`
      )
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await response.arrayBuffer())

    return { buffer, mimeType: contentType }
  } catch (error) {
    console.error('[GitHubImageService] Error downloading image:', error)
    return null
  }
}

/**
 * Store an image locally and return the public URL
 */
async function storeImage(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const storage = getStorageProvider()
  const storedFile = await storage.save(buffer, filename, mimeType)
  return storage.getUrl(storedFile.path)
}

// =============================================================================
// Main Processing Function
// =============================================================================

/**
 * Extract the asset UUID from a user-attachments URL
 * URL format: https://github.com/user-attachments/assets/UUID
 */
function extractAssetUuid(url: string): string | null {
  const match = url.match(/user-attachments\/assets\/([a-f0-9-]+)/i)
  return match?.[1] ?? null
}

/**
 * Build a map from asset UUID to JWT-embedded download URL from body_html
 * The body_html contains URLs like:
 * https://private-user-images.githubusercontent.com/6640526/534159386-UUID.png?jwt=...
 * The UUID is embedded in the filename with a prefix
 */
function buildJwtUrlMap(bodyHtml: string): Map<string, string> {
  const map = new Map<string, string>()

  // Extract all image URLs from the HTML - look in both img src and a href
  const imgRegex = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi
  let match

  while ((match = imgRegex.exec(bodyHtml)) !== null) {
    const url = match[1]
    if (!url) continue
    // Look for private-user-images URLs with JWT tokens
    if (url.includes('private-user-images.githubusercontent.com') && url.includes('jwt=')) {
      // Extract the UUID from the URL - it's in format: prefix-UUID.ext
      // UUID format: 8-4-4-4-12 hex chars
      const uuidMatch = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
      const uuid = uuidMatch?.[1]
      if (uuid) {
        map.set(uuid.toLowerCase(), url)
      }
    }
  }

  return map
}

/**
 * Process markdown content and download all GitHub images
 * Uses body_html (if provided) to get JWT-embedded URLs for user-attachments
 * Returns updated content with local image URLs
 */
export async function processGitHubImages(
  content: string | null,
  installationId: bigint,
  bodyHtml?: string | null
): Promise<ProcessedContent> {
  if (!content) {
    return {
      content: '',
      imagesDownloaded: 0,
      imagesFailed: 0,
      results: [],
    }
  }

  // Extract all images from content (markdown and HTML)
  const images = extractImageUrls(content)

  // Filter to only GitHub images
  const githubImages = images.filter((img) => isGitHubImageUrl(img.url))

  if (githubImages.length === 0) {
    return {
      content,
      imagesDownloaded: 0,
      imagesFailed: 0,
      results: [],
    }
  }

  // Build JWT URL map from body_html if available
  console.log('[GitHubImageService] bodyHtml provided:', !!bodyHtml, 'length:', bodyHtml?.length || 0)
  if (bodyHtml) {
    console.log('[GitHubImageService] bodyHtml sample:', bodyHtml.substring(0, 500))
  }
  const jwtUrlMap = bodyHtml ? buildJwtUrlMap(bodyHtml) : new Map<string, string>()
  console.log('[GitHubImageService] JWT URL map size:', jwtUrlMap.size)
  if (jwtUrlMap.size > 0) {
    console.log('[GitHubImageService] JWT URLs found:', Array.from(jwtUrlMap.keys()))
  }

  const results: ImageDownloadResult[] = []
  let processedContent = content

  // Download and replace each image
  for (const image of githubImages) {
    try {
      // For user-attachments, try to find the JWT URL from body_html
      let downloadUrl = image.url
      const assetUuid = extractAssetUuid(image.url)

      if (assetUuid && jwtUrlMap.has(assetUuid.toLowerCase())) {
        downloadUrl = jwtUrlMap.get(assetUuid.toLowerCase())!
      }

      // Download the image
      const downloaded = await downloadGitHubImage(downloadUrl, installationId)

      if (!downloaded) {
        results.push({
          originalUrl: image.url,
          localUrl: image.url, // Keep original on failure
          success: false,
          error: 'Failed to download image',
        })
        continue
      }

      // Generate filename and store
      const filename = generateImageFilename(image.url)
      const localUrl = await storeImage(downloaded.buffer, filename, downloaded.mimeType)

      // Replace URL in content based on image type (markdown or HTML)
      const escapedUrl = image.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      if (image.isHtml) {
        // Replace HTML img src attribute
        // Match: src="originalUrl" or src='originalUrl'
        processedContent = processedContent.replace(
          new RegExp(`src=["']${escapedUrl}["']`, 'g'),
          `src="${localUrl}"`
        )
      } else {
        // Replace markdown image syntax
        processedContent = processedContent.replace(
          new RegExp(`!\\[${image.alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${escapedUrl}\\)`, 'g'),
          `![${image.alt}](${localUrl})`
        )
      }

      results.push({
        originalUrl: image.url,
        localUrl,
        success: true,
      })
    } catch (error) {
      console.error(`[GitHubImageService] Error processing image ${image.url}:`, error)
      results.push({
        originalUrl: image.url,
        localUrl: image.url,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const downloaded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return {
    content: processedContent,
    imagesDownloaded: downloaded,
    imagesFailed: failed,
    results,
  }
}

// =============================================================================
// Export
// =============================================================================

export const githubImageService = {
  processGitHubImages,
  isGitHubImageUrl,
  extractImageUrls,
}

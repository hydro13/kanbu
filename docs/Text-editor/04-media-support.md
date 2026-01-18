# Media Support in Rich Text Editor

## Overview

All rich text fields in Kanbu (workspace descriptions, project descriptions, task context, sticky notes, wiki pages) support embedded media including:

- Images (upload, URL, paste)
- Videos (upload, YouTube, Vimeo embeds)
- Files (documents, PDFs)
- Code blocks with syntax highlighting
- Embeds (external content)

## Media Types

### 1. Images

#### Upload Flow

```
User drops/pastes image
        │
        ▼
┌─────────────────┐
│ Client-side     │
│ - Resize check  │
│ - Format check  │
│ - Preview       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Upload to API   │
│ - Compress      │
│ - Generate thumb│
│ - Store         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Insert in editor│
│ - With URL      │
│ - Placeholder   │
│   while loading │
└─────────────────┘
```

#### Image Node

```typescript
interface ImageNode extends DecoratorNode {
  src: string; // Image URL
  altText: string; // Alt text for accessibility
  width?: number; // Display width
  height?: number; // Display height
  caption?: string; // Optional caption

  // Metadata
  originalWidth: number;
  originalHeight: number;
  fileSize: number;
  mimeType: string;
}
```

#### Supported Formats

| Format | Max Size | Notes                   |
| ------ | -------- | ----------------------- |
| JPEG   | 10MB     | Auto-compress above 2MB |
| PNG    | 10MB     | Preserve transparency   |
| GIF    | 5MB      | Animated supported      |
| WebP   | 10MB     | Preferred format        |
| SVG    | 1MB      | Sanitized for security  |

#### Image Processing

```typescript
interface ImageProcessingConfig {
  // Compression
  maxWidth: 2000; // Max dimension
  quality: 85; // JPEG quality
  format: 'webp'; // Output format

  // Thumbnails
  thumbnails: [
    { name: 'thumb'; width: 150; height: 150; fit: 'cover' },
    { name: 'preview'; width: 400; height: 300; fit: 'inside' },
    { name: 'full'; width: 1200; height: 900; fit: 'inside' },
  ];

  // Storage
  storage: 's3'; // Or 'local', 'cloudflare'
  bucket: 'kanbu-media';
  cdnUrl: 'https://cdn.kanbu.io';
}
```

### 2. Videos

#### Video Sources

| Source  | Method      | Features                |
| ------- | ----------- | ----------------------- |
| YouTube | Embed URL   | Autoplay, timestamps    |
| Vimeo   | Embed URL   | Privacy settings        |
| Upload  | Direct      | Processing, transcoding |
| URL     | Direct link | MP4, WebM               |

#### Video Node

```typescript
interface VideoNode extends DecoratorNode {
  videoType: 'youtube' | 'vimeo' | 'upload' | 'url';
  src: string; // URL or embed ID

  // Display
  width?: number;
  height?: number;
  aspectRatio: '16:9' | '4:3' | '1:1';

  // Playback
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  startTime?: number; // Start at timestamp

  // Metadata
  title?: string;
  duration?: number;
  thumbnail?: string;
}
```

#### YouTube/Vimeo Detection

```typescript
function parseVideoUrl(url: string): VideoInfo | null {
  // YouTube patterns
  const youtubePatterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: 'youtube',
        id: match[1],
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
      };
    }
  }

  // Vimeo patterns
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      id: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  return null;
}
```

### 3. Files

#### File Attachments

```typescript
interface FileNode extends DecoratorNode {
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;

  // Preview
  previewUrl?: string; // For PDFs, docs
  previewable: boolean;

  // Icons
  icon: string; // File type icon
}
```

#### Supported File Types

| Category      | Extensions      | Max Size | Preview          |
| ------------- | --------------- | -------- | ---------------- |
| Documents     | pdf, doc, docx  | 25MB     | Yes (PDF)        |
| Spreadsheets  | xls, xlsx, csv  | 10MB     | No               |
| Presentations | ppt, pptx       | 25MB     | No               |
| Archives      | zip, rar, 7z    | 50MB     | No               |
| Code          | js, ts, py, etc | 5MB      | Syntax highlight |
| Text          | txt, md, json   | 5MB      | Yes              |

### 4. Code Blocks

#### Code Node

```typescript
interface CodeNode extends ElementNode {
  language: string; // 'typescript', 'python', etc.
  code: string; // The actual code

  // Display options
  showLineNumbers: boolean;
  highlightLines?: number[]; // Lines to highlight
  startLineNumber?: number; // Start numbering from
  fileName?: string; // Optional file name header
}
```

#### Supported Languages

Via Prism.js:

- JavaScript/TypeScript
- Python
- Go
- Rust
- Java
- C/C++
- PHP
- Ruby
- SQL
- HTML/CSS
- JSON/YAML
- Markdown
- Shell/Bash
- And 200+ more

### 5. Embeds

#### Embed Types

| Provider    | Type            | Example             |
| ----------- | --------------- | ------------------- |
| Twitter/X   | Tweet           | Tweet embed         |
| GitHub      | Gist, PR, Issue | Code snippets       |
| Figma       | Design          | Interactive design  |
| Miro        | Board           | Whiteboard embed    |
| Loom        | Video           | Screen recording    |
| CodeSandbox | Code            | Interactive sandbox |
| Google Maps | Map             | Location embed      |

#### Embed Node

```typescript
interface EmbedNode extends DecoratorNode {
  provider: string; // 'twitter', 'figma', etc.
  embedUrl: string; // URL to embed
  embedHtml?: string; // oEmbed HTML

  // Display
  width?: number;
  height?: number;
  aspectRatio?: string;
}
```

#### oEmbed Support

```typescript
async function fetchOEmbed(url: string): Promise<OEmbedResponse> {
  // Try known providers first
  const provider = detectProvider(url);

  if (provider) {
    const oembedUrl = provider.oembedEndpoint + encodeURIComponent(url);
    const response = await fetch(oembedUrl);
    return response.json();
  }

  // Fallback to unfurl for generic previews
  return unfurlUrl(url);
}

interface OEmbedResponse {
  type: 'rich' | 'video' | 'photo' | 'link';
  title?: string;
  description?: string;
  thumbnail_url?: string;
  html?: string;
  width?: number;
  height?: number;
  provider_name: string;
  provider_url: string;
}
```

## Media Storage

### Storage Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CDN (Cloudflare)                     │
│                    cdn.kanbu.io                         │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│   S3 / R2 Storage   │   │   Image Processing  │
│   (Original files)  │   │   (Sharp / imgproxy)│
└─────────────────────┘   └─────────────────────┘
```

### Database Schema

```prisma
model Media {
  id            Int       @id @default(autoincrement())
  uuid          String    @unique @default(uuid())

  // File info
  fileName      String
  originalName  String
  mimeType      String
  fileSize      Int
  checksum      String    // SHA-256 for deduplication

  // Storage
  storageKey    String    // Path in S3/R2
  cdnUrl        String    // Public URL
  thumbnails    Json?     // { thumb: url, preview: url, ... }

  // Metadata
  width         Int?
  height        Int?
  duration      Int?      // For video/audio
  metadata      Json?     // EXIF, etc.

  // Ownership
  workspaceId   Int
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  uploadedById  Int
  uploadedBy    User      @relation(fields: [uploadedById], references: [id])

  // Usage tracking
  usageCount    Int       @default(0)
  lastUsedAt    DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([workspaceId])
  @@index([checksum])
}
```

### Upload API

```typescript
// POST /api/media/upload
interface UploadRequest {
  file: File;
  workspaceId: number;
  context?: {
    type: 'wiki' | 'task' | 'project' | 'workspace' | 'sticky';
    entityId: number;
  };
}

interface UploadResponse {
  id: number;
  uuid: string;
  url: string;
  thumbnails?: {
    thumb: string;
    preview: string;
    full: string;
  };
  width?: number;
  height?: number;
  mimeType: string;
  fileSize: number;
}
```

### Direct Upload (Presigned URLs)

For large files, upload directly to S3:

```typescript
// GET /api/media/upload-url
interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
  fileSize: number;
  workspaceId: number;
}

interface PresignedUrlResponse {
  uploadUrl: string; // PUT here
  fileKey: string; // Path in S3
  expiresAt: Date;
}

// After upload, confirm:
// POST /api/media/confirm-upload
interface ConfirmUploadRequest {
  fileKey: string;
  workspaceId: number;
}
```

## Lexical Integration

### Image Plugin

```typescript
function ImagePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Handle paste
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));

          if (imageFiles.length > 0) {
            event.preventDefault();
            handleImageUpload(imageFiles[0]);
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor]);

  // Handle drop
  useEffect(() => {
    return editor.registerCommand(
      DROP_COMMAND,
      (event: DragEvent) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'));

          if (imageFile) {
            event.preventDefault();
            handleImageUpload(imageFile);
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor]);

  async function handleImageUpload(file: File) {
    // Show placeholder while uploading
    const placeholderId = insertPlaceholder();

    try {
      const result = await uploadImage(file);
      replacePlaceholderWithImage(placeholderId, result);
    } catch (error) {
      removePlaceholder(placeholderId);
      showError('Image upload failed');
    }
  }

  return null;
}
```

### Toolbar Media Buttons

```tsx
function MediaToolbar() {
  const [editor] = useLexicalComposerContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const insertVideo = () => {
    const url = prompt('Enter video URL (YouTube, Vimeo, or direct link):');
    if (url) {
      const videoInfo = parseVideoUrl(url);
      if (videoInfo) {
        editor.dispatchCommand(INSERT_VIDEO_COMMAND, videoInfo);
      } else {
        showError('Invalid video URL');
      }
    }
  };

  const insertEmbed = () => {
    const url = prompt('Enter URL to embed:');
    if (url) {
      editor.dispatchCommand(INSERT_EMBED_COMMAND, url);
    }
  };

  return (
    <div className="media-toolbar">
      <button onClick={insertImage} title="Insert image">
        <ImageIcon />
      </button>
      <button onClick={insertVideo} title="Insert video">
        <VideoIcon />
      </button>
      <button onClick={insertEmbed} title="Insert embed">
        <EmbedIcon />
      </button>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} hidden />
    </div>
  );
}
```

## Inline vs Block Media

### Inline Media (within text flow)

- Small images/icons
- Emoji
- Inline code

### Block Media (own paragraph)

- Large images
- Videos
- Embeds
- Code blocks
- File attachments

```typescript
// Determine display mode
function getMediaDisplayMode(node: MediaNode): 'inline' | 'block' {
  if (node instanceof ImageNode) {
    // Small images can be inline
    if (node.width && node.width < 100) return 'inline';
    return 'block';
  }

  if (node instanceof VideoNode) return 'block';
  if (node instanceof EmbedNode) return 'block';
  if (node instanceof CodeNode) return 'block';
  if (node instanceof FileNode) return 'block';

  return 'inline';
}
```

## Image Resizing UI

```
┌─────────────────────────────────────────────┐
│                                             │
│    ┌───────────────────────────────┐        │
│    │                               │○       │  ← Resize handle
│    │                               │        │
│    │          IMAGE                │        │
│    │                               │        │
│    │                               │        │
│    └───────────────────────────────┘        │
│                                             │
│    [Small] [Medium] [Large] [Full]          │  ← Quick size presets
│    Caption: [_____________________]         │
│    Alt text: [___________________]          │
│                                             │
└─────────────────────────────────────────────┘
```

## Security Considerations

### Upload Validation

```typescript
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: ['application/pdf', 'application/msword' /* ... */],
};

const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 25 * 1024 * 1024, // 25MB
};

async function validateUpload(file: File, type: string): Promise<void> {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES[type]?.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES[type]) {
    throw new Error(`File too large. Max ${MAX_FILE_SIZES[type] / 1024 / 1024}MB`);
  }

  // For images: validate it's actually an image
  if (type === 'image') {
    await validateImageFile(file);
  }

  // For SVG: sanitize
  if (file.type === 'image/svg+xml') {
    await sanitizeSvg(file);
  }
}
```

### SVG Sanitization

```typescript
import DOMPurify from 'dompurify';

async function sanitizeSvg(file: File): Promise<string> {
  const content = await file.text();

  // Remove scripts, event handlers, external references
  const clean = DOMPurify.sanitize(content, {
    USE_PROFILES: { svg: true },
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'xlink:href'],
  });

  return clean;
}
```

### Content Security Policy

```typescript
// Headers for media responses
const mediaHeaders = {
  'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'public, max-age=31536000, immutable',
};
```
